import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

// Load .env from scripts directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Force full sync mode (set via environment or command line)
const FORCE_FULL_SYNC = process.env.FORCE_FULL_SYNC === 'true' || process.argv.includes('--full');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !HUBSPOT_ACCESS_TOKEN) {
  console.error('Missing required environment variables. Check scripts/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load postcode data for fallback geocoding
let postcodeData = {};

function loadPostcodeData() {
  const csvPath = path.join(process.cwd(), 'public', 'australian_postcodes.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  for (const record of records) {
    if (!postcodeData[record.postcode]) {
      postcodeData[record.postcode] = {
        lat: parseFloat(record.lat),
        long: parseFloat(record.long)
      };
    }
  }
  console.log(`Loaded ${Object.keys(postcodeData).length} postcodes`);
}

// State name normalization map
const stateAbbreviations = {
  'new south wales': 'NSW',
  'victoria': 'VIC',
  'queensland': 'QLD',
  'south australia': 'SA',
  'western australia': 'WA',
  'tasmania': 'TAS',
  'northern territory': 'NT',
  'australian capital territory': 'ACT'
};

function normalizeState(state) {
  if (!state) return null;
  const lower = state.toLowerCase().trim();
  // Check if it's already an abbreviation
  if (['nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'nt', 'act'].includes(lower)) {
    return lower.toUpperCase();
  }
  // Map full name to abbreviation
  return stateAbbreviations[lower] || state;
}

function getMaxPUM(props) {
  const pumFields = [
    props.estimated_pum__company_,
    props.estimated_pum__import_,
    props.total_pum__planhat_temp_,
    props.estimated_pum,
    props.estimated_rent_roll__c
  ];

  const values = pumFields
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v) && v > 0);

  return values.length > 0 ? Math.max(...values) : null;
}

async function fetchLifecycleStageOptions() {
  console.log('Fetching lifecycle stage options...');
  const response = await fetch(
    'https://api.hubapi.com/crm/v3/properties/companies/lifecyclestage',
    { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
  );

  if (!response.ok) {
    console.error('Failed to fetch lifecycle stage options:', response.status);
    return {};
  }

  const data = await response.json();
  const options = {};

  for (const option of data.options || []) {
    options[option.value] = option.label;
  }

  console.log(`Loaded ${Object.keys(options).length} lifecycle stage options`);
  return options;
}

async function fetchOwners() {
  const owners = {};
  let after = undefined;

  console.log('Fetching owners from HubSpot...');

  while (true) {
    const url = new URL('https://api.hubapi.com/crm/v3/owners');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch owners: ${response.status}`);
    }

    const data = await response.json();

    for (const owner of data.results) {
      owners[owner.id] = `${owner.firstName} ${owner.lastName}`;
    }

    console.log(`Fetched ${Object.keys(owners).length} owners...`);

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  console.log(`Loaded ${Object.keys(owners).length} owners total`);
  return owners;
}

// Fetch the last sync timestamp from Supabase
async function getLastSyncTimestamp() {
  const { data, error } = await supabase
    .from('sync_metadata')
    .select('last_sync')
    .eq('sync_type', 'hubspot')
    .single();

  if (error) {
    // Table might not exist yet, or no record found
    if (error.code === '42P01' || error.code === 'PGRST116') {
      console.log('No previous sync found or sync_metadata table not created yet');
      console.log('For incremental sync, create the sync_metadata table in Supabase Dashboard:');
      console.log('  CREATE TABLE sync_metadata (sync_type TEXT PRIMARY KEY, last_sync TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());');
    }
    return null;
  }

  if (!data) {
    console.log('No previous sync timestamp found, will do full sync');
    return null;
  }

  return data.last_sync;
}

// Update the last sync timestamp
async function updateLastSyncTimestamp(timestamp) {
  const { error } = await supabase
    .from('sync_metadata')
    .upsert({
      sync_type: 'hubspot',
      last_sync: timestamp,
      updated_at: new Date().toISOString()
    }, { onConflict: 'sync_type' });

  if (error) {
    // If table doesn't exist, just log and continue (full sync will happen next time)
    if (error.code === '42P01') {
      console.log('Note: sync_metadata table not found. Create it for incremental sync support.');
    } else {
      console.error('Failed to update sync timestamp:', error.message);
    }
  } else {
    console.log('Sync timestamp updated successfully');
  }
}

// Fetch existing companies from Supabase to check for existing coordinates
async function fetchExistingCompanies() {
  console.log('Fetching existing companies from Supabase...');
  const existing = {};

  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, latitude, longitude, coord_source')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching existing companies:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const company of data) {
      existing[company.id] = {
        lat: company.latitude,
        long: company.longitude,
        source: company.coord_source
      };
    }

    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`Found ${Object.keys(existing).length} existing companies in Supabase`);
  return existing;
}

// Fetch companies from HubSpot with optional filter for recently updated
async function fetchCompaniesFromHubSpot(lastSyncTimestamp = null) {
  const companies = [];
  let after = undefined;

  const properties = [
    'name',
    'address',
    'city',
    'state',
    'zip',
    'hubspot_owner_id',
    'lifecyclestage',
    'domain',
    'latitude',
    'longitude',
    'estimated_pum__company_',
    'estimated_pum__import_',
    'total_pum__planhat_temp_',
    'estimated_pum',
    'estimated_rent_roll__c',
    'phase',
    'hs_lastmodifieddate'
  ];

  // Use search API for filtered queries, basic API for full sync
  if (lastSyncTimestamp) {
    console.log(`Fetching companies modified since ${lastSyncTimestamp}...`);

    // Use HubSpot Search API to get only recently modified companies
    while (true) {
      const searchBody = {
        filterGroups: [{
          filters: [{
            propertyName: 'hs_lastmodifieddate',
            operator: 'GTE',
            value: new Date(lastSyncTimestamp).getTime()
          }]
        }],
        properties,
        limit: 100,
        ...(after && { after })
      };

      const response = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot Search API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      companies.push(...data.results);

      console.log(`Fetched ${companies.length} modified companies...`);

      if (data.paging?.next?.after) {
        after = data.paging.next.after;
      } else {
        break;
      }
    }
  } else {
    // Full sync - use basic API (faster for bulk)
    console.log('Fetching all companies from HubSpot (full sync)...');

    while (true) {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/companies');
      url.searchParams.set('limit', '100');
      url.searchParams.set('properties', properties.join(','));
      if (after) url.searchParams.set('after', after);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();
      companies.push(...data.results);

      console.log(`Fetched ${companies.length} companies...`);

      if (data.paging?.next?.after) {
        after = data.paging.next.after;
      } else {
        break;
      }
    }
  }

  return companies;
}

async function geocodeAddress(address, city, state, postcode) {
  if (!address && !city) return null;

  const query = encodeURIComponent(
    [address, city, state, postcode, 'Australia'].filter(Boolean).join(', ')
  );

  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AiloTerritoryMapper/1.0' }
    });

    const data = await response.json();

    if (data && data[0]) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      // Validate coordinates are in Australia
      if (lat < -10 && lat > -45 && lon > 110 && lon < 155) {
        return { lat, long: lon, source: 'geocoded' };
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }

  return null;
}

function getPostcodeCentroid(postcode) {
  const match = postcodeData[postcode];
  if (match && match.lat && match.long) {
    return { lat: match.lat, long: match.long, source: 'postcode' };
  }
  return null;
}

// Optimized: Check existing coordinates first, skip geocoding if already have good data
async function getCoordinates(props, existingCoords) {
  // 1. Use HubSpot coordinates if available (always prefer fresh data)
  if (props.latitude && props.longitude) {
    const lat = parseFloat(props.latitude);
    const long = parseFloat(props.longitude);
    if (!isNaN(lat) && !isNaN(long)) {
      return { lat, long, source: 'hubspot' };
    }
  }

  // 2. If we already have geocoded coordinates in Supabase, reuse them (skip expensive API call)
  if (existingCoords && existingCoords.lat && existingCoords.long &&
      (existingCoords.source === 'geocoded' || existingCoords.source === 'hubspot')) {
    return { lat: existingCoords.lat, long: existingCoords.long, source: existingCoords.source };
  }

  // 3. Try geocoding from address (only for new companies or those without coords)
  const geocoded = await geocodeAddress(
    props.address,
    props.city,
    props.state,
    props.zip
  );

  if (geocoded) {
    // Rate limit: 1 request per second for Nominatim
    await new Promise(resolve => setTimeout(resolve, 1100));
    return geocoded;
  }

  // 4. Fall back to postcode centroid
  if (props.zip) {
    const centroid = getPostcodeCentroid(props.zip);
    if (centroid) return centroid;
  }

  return { lat: null, long: null, source: 'missing' };
}

// Fetch all HubSpot company IDs (lightweight - no properties)
async function fetchAllHubSpotCompanyIds() {
  console.log('Fetching all HubSpot company IDs for deletion check...');
  const ids = new Set();
  let after = undefined;

  while (true) {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/companies');
    url.searchParams.set('limit', '100');
    url.searchParams.set('properties', ''); // No properties needed, just IDs
    if (after) url.searchParams.set('after', after);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error fetching IDs: ${response.status}`);
    }

    const data = await response.json();

    for (const company of data.results) {
      ids.add(company.id);
    }

    if (ids.size % 1000 === 0) {
      console.log(`  Fetched ${ids.size} HubSpot company IDs...`);
    }

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  console.log(`  Total HubSpot company IDs: ${ids.size}`);
  return ids;
}

// Fetch all Supabase company IDs and names for deletion comparison
async function fetchSupabaseCompanyIdsAndNames() {
  console.log('Fetching Supabase company IDs for deletion check...');
  const companies = {};
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching Supabase companies:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const company of data) {
      companies[company.id] = company.name;
    }

    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`  Total Supabase companies: ${Object.keys(companies).length}`);
  return companies;
}

// Delete companies from Supabase that no longer exist in HubSpot
async function deleteRemovedCompanies(hubspotIds, supabaseCompanies) {
  console.log('========================');
  console.log('DELETION CHECK:');

  const supabaseIds = Object.keys(supabaseCompanies);
  const toDelete = supabaseIds.filter(id => !hubspotIds.has(id));

  console.log(`  Supabase companies: ${supabaseIds.length}`);
  console.log(`  HubSpot companies: ${hubspotIds.size}`);
  console.log(`  Companies to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('  No companies to delete.');
    console.log('========================');
    return { deleted: 0, errors: 0 };
  }

  // Log deleted company names (first 20)
  const namesToShow = toDelete.slice(0, 20).map(id => supabaseCompanies[id] || `(ID: ${id})`);
  console.log(`  First ${Math.min(20, toDelete.length)} companies to delete:`);
  namesToShow.forEach((name, i) => console.log(`    ${i + 1}. ${name}`));
  if (toDelete.length > 20) {
    console.log(`    ... and ${toDelete.length - 20} more`);
  }

  // Delete in batches
  let deleted = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('companies')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`  Delete batch error:`, error.message);
      errors += batch.length;
    } else {
      deleted += batch.length;
      console.log(`  ✓ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toDelete.length / BATCH_SIZE)} (${batch.length} companies)`);
    }
  }

  console.log(`  Deletion complete: ${deleted} deleted, ${errors} errors`);
  console.log('========================');

  return { deleted, errors };
}

// Upload a single batch to Supabase
async function uploadBatch(batch, batchNumber, totalBatches) {
  const { error } = await supabase
    .from('companies')
    .upsert(batch, { onConflict: 'id' });

  if (error) {
    console.error(`\nBatch ${batchNumber}/${totalBatches} error:`, error.message);

    // Try inserting one by one to find the problematic record
    let successCount = 0;
    let errorCount = 0;
    for (const record of batch) {
      const { error: singleError } = await supabase
        .from('companies')
        .upsert(record, { onConflict: 'id' });

      if (singleError) {
        errorCount++;
        console.error(`  Failed: ${record.id} (${record.name}): ${singleError.message}`);
      } else {
        successCount++;
      }
    }
    return { success: successCount, errors: errorCount };
  }

  console.log(`✓ Uploaded batch ${batchNumber}/${totalBatches} (${batch.length} companies)`);
  return { success: batch.length, errors: 0 };
}

async function main() {
  const syncStartTime = new Date().toISOString();

  console.log('Starting HubSpot sync...');
  console.log('========================');

  // Load postcode data for fallback geocoding
  loadPostcodeData();

  // Fetch lifecycle stage options for label mapping
  const lifecycleStages = await fetchLifecycleStageOptions();

  // Fetch owners for name mapping
  const owners = await fetchOwners();

  // Fetch existing companies from Supabase (for coordinate reuse)
  const existingCompanies = await fetchExistingCompanies();

  // Check for last sync timestamp (for incremental sync)
  let lastSyncTimestamp = null;
  if (!FORCE_FULL_SYNC) {
    lastSyncTimestamp = await getLastSyncTimestamp();
  } else {
    console.log('FORCE_FULL_SYNC enabled - doing full sync');
  }

  // Log the last_sync timestamp being used
  console.log('========================');
  console.log('SYNC CONFIGURATION:');
  if (lastSyncTimestamp) {
    console.log(`  Last sync timestamp: ${lastSyncTimestamp}`);
    console.log(`  Fetching companies modified since: ${new Date(lastSyncTimestamp).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} AEDT`);
  } else {
    console.log('  Last sync timestamp: NONE (full sync)');
  }
  console.log('========================');

  // Fetch companies from HubSpot (incremental or full)
  let hubspotCompanies = await fetchCompaniesFromHubSpot(lastSyncTimestamp);

  // Log how many companies were fetched and list first 20 names
  console.log('========================');
  console.log('COMPANIES TO SYNC:');
  console.log(`  Total companies fetched from HubSpot: ${hubspotCompanies.length}`);
  if (hubspotCompanies.length > 0) {
    const namesToShow = hubspotCompanies.slice(0, 20).map(c => c.properties.name || '(unnamed)');
    console.log(`  First ${Math.min(20, hubspotCompanies.length)} company names:`);
    namesToShow.forEach((name, i) => console.log(`    ${i + 1}. ${name}`));
    if (hubspotCompanies.length > 20) {
      console.log(`    ... and ${hubspotCompanies.length - 20} more`);
    }
  }
  console.log('========================');

  if (hubspotCompanies.length === 0) {
    console.log('No companies to sync. Updating timestamp and exiting.');
    await updateLastSyncTimestamp(syncStartTime);
    return;
  }

  // TEST MODE: Set to a number to limit companies for testing, or null/0 for full sync
  const TEST_LIMIT = null;
  if (TEST_LIMIT) {
    hubspotCompanies = hubspotCompanies.slice(0, TEST_LIMIT);
    console.log(`TEST MODE: Processing only ${TEST_LIMIT} companies`);
  }

  // Process and upload in batches of 100
  const BATCH_SIZE = 100;
  let batch = [];
  let totalProcessed = 0;
  let totalUploaded = 0;
  let totalErrors = 0;
  let geocodeCount = 0;
  let hubspotCoordCount = 0;
  let postcodeCount = 0;
  let missingCount = 0;
  let reusedCoordsCount = 0;

  const totalBatches = Math.ceil(hubspotCompanies.length / BATCH_SIZE);

  for (let i = 0; i < hubspotCompanies.length; i++) {
    const company = hubspotCompanies[i];
    const props = company.properties;

    // Get existing coordinates for this company
    const existingCoords = existingCompanies[company.id];
    const coords = await getCoordinates(props, existingCoords);

    switch (coords.source) {
      case 'hubspot':
        hubspotCoordCount++;
        break;
      case 'geocoded':
        // Check if we reused existing geocoded coords
        if (existingCoords && existingCoords.source === 'geocoded' &&
            existingCoords.lat === coords.lat && existingCoords.long === coords.long) {
          reusedCoordsCount++;
        } else {
          geocodeCount++;
          console.log(`Geocoded (${geocodeCount}): ${props.name}`);
        }
        break;
      case 'postcode':
        postcodeCount++;
        break;
      case 'missing':
        missingCount++;
        break;
    }

    batch.push({
      id: company.id,
      name: props.name || null,
      address: props.address || null,
      city: props.city || null,
      state: normalizeState(props.state),
      postcode: props.zip || null,
      latitude: coords.lat,
      longitude: coords.long,
      owner: owners[props.hubspot_owner_id] || null,
      lifecycle_stage: lifecycleStages[props.lifecyclestage] || props.lifecyclestage || null,
      domain: props.domain || null,
      phase: props.phase || null,
      pum: getMaxPUM(props),
      coord_source: coords.source,
      hubspot_url: `https://app.hubspot.com/contacts/49213690/company/${company.id}`,
      updated_at: new Date().toISOString()
    });

    totalProcessed++;

    // Upload batch when full
    if (batch.length >= BATCH_SIZE) {
      const batchNumber = Math.floor(totalProcessed / BATCH_SIZE);
      const result = await uploadBatch(batch, batchNumber, totalBatches);
      totalUploaded += result.success;
      totalErrors += result.errors;
      batch = []; // Clear batch
    }
  }

  // Upload remaining records
  if (batch.length > 0) {
    const result = await uploadBatch(batch, totalBatches, totalBatches);
    totalUploaded += result.success;
    totalErrors += result.errors;
  }

  // Update last sync timestamp
  await updateLastSyncTimestamp(syncStartTime);

  console.log('========================');
  console.log('SYNC COMPLETE!');
  console.log('========================');
  console.log('SUMMARY:');
  console.log(`  Total processed: ${totalProcessed}`);
  console.log(`  Uploaded: ${totalUploaded}, Errors: ${totalErrors}`);
  console.log(`  HubSpot coords: ${hubspotCoordCount}`);
  console.log(`  Newly geocoded: ${geocodeCount}`);
  console.log(`  Reused existing coords: ${reusedCoordsCount}`);
  console.log(`  Postcode fallback: ${postcodeCount}`);
  console.log(`  Missing: ${missingCount}`);
  console.log(`  Sync type: ${lastSyncTimestamp ? 'incremental' : 'full'}`);
  console.log('========================');

  // Check for deleted companies (companies in Supabase that no longer exist in HubSpot)
  const allHubSpotIds = await fetchAllHubSpotCompanyIds();
  const supabaseCompaniesForDeletion = await fetchSupabaseCompanyIdsAndNames();
  const deletionResult = await deleteRemovedCompanies(allHubSpotIds, supabaseCompaniesForDeletion);

  console.log('TIMESTAMPS:');
  console.log(`  Previous last_sync: ${lastSyncTimestamp || 'NONE'}`);
  console.log(`  New last_sync: ${syncStartTime}`);
  console.log(`  New last_sync (AEDT): ${new Date(syncStartTime).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log('========================');
  console.log('FINAL TOTALS:');
  console.log(`  Companies synced: ${totalUploaded}`);
  console.log(`  Companies deleted: ${deletionResult.deleted}`);
  console.log('========================');
}

main().catch(console.error);
