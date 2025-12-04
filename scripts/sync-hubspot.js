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

async function fetchAllCompanies() {
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
    'phase'
  ];

  console.log('Fetching companies from HubSpot...');

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

async function getCoordinates(props) {
  // Use existing coordinates if available
  if (props.latitude && props.longitude) {
    const lat = parseFloat(props.latitude);
    const long = parseFloat(props.longitude);
    if (!isNaN(lat) && !isNaN(long)) {
      return { lat, long, source: 'hubspot' };
    }
  }

  // Try geocoding from address
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

  // Fall back to postcode centroid
  if (props.zip) {
    const centroid = getPostcodeCentroid(props.zip);
    if (centroid) return centroid;
  }

  return { lat: null, long: null, source: 'missing' };
}

async function syncToSupabase(companies) {
  console.log(`Syncing ${companies.length} companies to Supabase...`);

  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const failedRecords = [];

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);

    const { error } = await supabase
      .from('companies')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`\nBatch ${i}-${i + batchSize} error:`, error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);

      // Try inserting one by one to find the problematic record
      console.log('Trying individual inserts to identify problem records...');
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('companies')
          .upsert(record, { onConflict: 'id' });

        if (singleError) {
          errorCount++;
          failedRecords.push({ id: record.id, name: record.name, error: singleError.message });
          console.error(`  Failed: ${record.id} (${record.name}): ${singleError.message}`);
        } else {
          successCount++;
        }
      }
    } else {
      successCount += batch.length;
      console.log(`Synced ${Math.min(i + batchSize, companies.length)} / ${companies.length}`);
    }
  }

  console.log(`\nSync summary: ${successCount} succeeded, ${errorCount} failed`);
  if (failedRecords.length > 0) {
    console.log('Failed records:');
    failedRecords.forEach(r => console.log(`  ${r.id}: ${r.name} - ${r.error}`));
  }
}

async function main() {
  console.log('Starting HubSpot sync...');
  console.log('========================');

  // Debug: Fetch one company with all PUM-related properties
  console.log('\n--- DEBUG: Fetching properties including all PUM fields ---');
  const debugProps = 'name,state,estimated_pum__company_,estimated_pum__import_,total_pum__planhat_temp_,estimated_pum,pum';
  const debugResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/companies?limit=5&properties=${debugProps}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
  });
  const debugData = await debugResponse.json();
  console.log('PUM fields for first 5 companies:');
  for (const company of debugData.results) {
    console.log(`  ${company.properties.name}: estimated_pum__company_=${company.properties.estimated_pum__company_}, estimated_pum__import_=${company.properties.estimated_pum__import_}, total_pum__planhat_temp_=${company.properties.total_pum__planhat_temp_}, estimated_pum=${company.properties.estimated_pum}, pum=${company.properties.pum}`);
  }
  console.log('--- END DEBUG ---\n');

  // Load postcode data for fallback geocoding
  loadPostcodeData();

  // Fetch lifecycle stage options for label mapping
  const lifecycleStages = await fetchLifecycleStageOptions();

  // Fetch owners for name mapping
  const owners = await fetchOwners();

  // Fetch all companies from HubSpot
  let hubspotCompanies = await fetchAllCompanies();
  console.log(`Found ${hubspotCompanies.length} companies in HubSpot`);

  // TEST MODE: Set to a number to limit companies for testing, or null/0 for full sync
  const TEST_LIMIT = null;
  if (TEST_LIMIT) {
    hubspotCompanies = hubspotCompanies.slice(0, TEST_LIMIT);
    console.log(`TEST MODE: Processing only ${TEST_LIMIT} companies`);
  }

  // Transform and geocode
  const companies = [];
  let geocodeCount = 0;
  let hubspotCoordCount = 0;
  let postcodeCount = 0;
  let missingCount = 0;

  for (let i = 0; i < hubspotCompanies.length; i++) {
    const company = hubspotCompanies[i];
    const props = company.properties;

    const coords = await getCoordinates(props);

    switch (coords.source) {
      case 'hubspot': hubspotCoordCount++; break;
      case 'geocoded':
        geocodeCount++;
        console.log(`Geocoded (${geocodeCount}): ${props.name}`);
        break;
      case 'postcode': postcodeCount++; break;
      case 'missing': missingCount++; break;
    }

    // Debug: Log unmatched owner IDs
    if (props.hubspot_owner_id && !owners[props.hubspot_owner_id]) {
      console.log(`Unmatched owner ID: ${props.hubspot_owner_id} for company: ${props.name}`);
    }

    companies.push({
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

    // Progress update every 100 companies
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1} / ${hubspotCompanies.length}`);
    }
  }

  // Sync to Supabase
  await syncToSupabase(companies);

  console.log('========================');
  console.log('Sync complete!');
  console.log(`Total: ${companies.length}`);
  console.log(`HubSpot coords: ${hubspotCoordCount}`);
  console.log(`Geocoded: ${geocodeCount}`);
  console.log(`Postcode fallback: ${postcodeCount}`);
  console.log(`Missing: ${missingCount}`);
}

main().catch(console.error);
