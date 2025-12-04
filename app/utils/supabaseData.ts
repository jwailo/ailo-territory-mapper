import { supabase, DbCompany, DbTerritory, DbPostcodeAssignment, DbComplianceZone } from './supabase';
import { CompanyData, CompanyStore, Territory, LifecycleStage, CoordSource, ComplianceZone } from '../types';

const HUBSPOT_ACCOUNT_ID = '49213690';

function buildHubSpotUrl(recordId: string): string {
  return `https://app.hubspot.com/contacts/${HUBSPOT_ACCOUNT_ID}/company/${recordId}`;
}

function normalizeLifecycleStage(stage: string | null): LifecycleStage {
  const normalized = stage?.trim().toLowerCase();
  switch (normalized) {
    case 'target':
      return 'Target';
    case 'lead':
      return 'Lead';
    case 'mql':
    case 'marketingqualifiedlead':
      return 'MQL';
    case 'sql':
    case 'salesqualifiedlead':
      return 'SQL';
    case 'opportunity':
      return 'Opportunity';
    case 'customer':
      return 'Customer';
    case 'evangelist':
      return 'Evangelist';
    default:
      return 'Other';
  }
}

// Load companies from Supabase using pagination to bypass row limits
async function fetchAllCompanies(): Promise<DbCompany[]> {
  const allData: DbCompany[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .range(from, to);

    if (error) {
      console.error(`Error fetching companies page ${page}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...(data as DbCompany[]));
      console.log(`Fetched companies ${from}-${from + data.length - 1} (${allData.length} total)`);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

// Load companies from Supabase
export async function loadCompaniesFromSupabase(): Promise<CompanyStore | null> {
  // Use pagination to fetch all companies (bypasses Supabase row limits)
  const data = await fetchAllCompanies();

  console.log('Supabase companies loaded:', data.length);

  if (!data || data.length === 0) {
    console.log('No companies in Supabase, will fall back to CSV');
    return null;
  }

  const companies: Record<string, CompanyData> = {};
  const stats = {
    total: 0,
    withCoords: 0,
    missingCoords: 0,
    byLifecycle: {
      Target: 0,
      Lead: 0,
      MQL: 0,
      SQL: 0,
      Opportunity: 0,
      Customer: 0,
      Evangelist: 0,
      Other: 0,
    } as Record<LifecycleStage, number>,
  };

  for (const row of data) {
    const lifecycleStage = normalizeLifecycleStage(row.lifecycle_stage);
    const lat = row.latitude;
    const long = row.longitude;
    const coordSource = (row.coord_source as CoordSource) || 'missing';

    companies[row.id] = {
      id: row.id,
      name: row.name || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      postcode: row.postcode || '',
      lat,
      long,
      owner: row.owner || '',
      lifecycleStage,
      domain: row.domain || '',
      phase: row.phase || '',
      pum: row.pum || 0,
      hubspotUrl: row.hubspot_url || buildHubSpotUrl(row.id),
      coordSource,
      territory: null, // Will be set from postcode assignments
    };

    stats.total++;
    if (lat !== null && long !== null) {
      stats.withCoords++;
    } else {
      stats.missingCoords++;
    }
    stats.byLifecycle[lifecycleStage]++;
  }

  return { companies, stats };
}

// Load territories from Supabase
export async function loadTerritoriesFromSupabase(): Promise<Record<string, Territory>> {
  const { data, error } = await supabase
    .from('territories')
    .select('*');

  if (error) {
    console.error('Error loading territories from Supabase:', error);
    return {};
  }

  const territories: Record<string, Territory> = {};
  for (const t of (data || []) as DbTerritory[]) {
    territories[t.id] = {
      id: t.id,
      name: t.name,
      color: t.colour, // Map 'colour' from DB to 'color' in app
    };
  }

  return territories;
}

// Load postcode assignments from Supabase with pagination
export async function loadPostcodeAssignmentsFromSupabase(): Promise<Record<string, string>> {
  console.log('loadPostcodeAssignmentsFromSupabase: Starting...');

  const allData: DbPostcodeAssignment[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('postcode_assignments')
      .select('*')
      .range(from, to);

    if (error) {
      console.error(`Error fetching postcode assignments page ${page}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...(data as DbPostcodeAssignment[]));
      console.log(`Fetched postcode assignments ${from}-${from + data.length - 1} (${allData.length} total)`);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log('loadPostcodeAssignmentsFromSupabase: Raw data from Supabase:', allData.length, 'records');

  const assignments: Record<string, string> = {};
  for (const a of allData) {
    // Key by postcode-state to match the postcodes store format
    const key = `${a.postcode}-${a.state}`;
    assignments[key] = a.territory_id;
  }

  console.log('loadPostcodeAssignmentsFromSupabase: Returning', Object.keys(assignments).length, 'assignments');
  return assignments;
}

// Save a territory to Supabase
export async function saveTerritoryToSupabase(territory: Territory): Promise<boolean> {
  const { error } = await supabase
    .from('territories')
    .upsert({
      id: territory.id,
      name: territory.name,
      colour: territory.color, // Map 'color' from app to 'colour' in DB
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving territory to Supabase:', error);
    return false;
  }
  return true;
}

// Update a territory in Supabase
export async function updateTerritoryInSupabase(territory: Territory): Promise<boolean> {
  const { error } = await supabase
    .from('territories')
    .update({
      name: territory.name,
      colour: territory.color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', territory.id);

  if (error) {
    console.error('Error updating territory in Supabase:', error);
    return false;
  }
  return true;
}

// Delete a territory from Supabase
export async function deleteTerritoryFromSupabase(territoryId: string): Promise<boolean> {
  // First clear postcode assignments for this territory
  const { error: assignmentError } = await supabase
    .from('postcode_assignments')
    .delete()
    .eq('territory_id', territoryId);

  if (assignmentError) {
    console.error('Error clearing postcode assignments:', assignmentError);
    return false;
  }

  // Then delete the territory
  const { error } = await supabase
    .from('territories')
    .delete()
    .eq('id', territoryId);

  if (error) {
    console.error('Error deleting territory from Supabase:', error);
    return false;
  }
  return true;
}

// Save postcode assignments to Supabase
export async function savePostcodeAssignmentsToSupabase(
  postcodes: string[],
  territoryId: string,
  state: string
): Promise<boolean> {
  console.log('savePostcodeAssignmentsToSupabase: Saving', postcodes.length, 'postcodes to territory', territoryId, 'state', state);
  if (postcodes.length === 0) return true;

  const records = postcodes.map((postcodeKey) => {
    // postcodeKey might be in format "2611-ACT" or just "2611"
    // Extract just the postcode number (everything before the first dash, or the whole string)
    const postcode = postcodeKey.includes('-') ? postcodeKey.split('-')[0] : postcodeKey;
    return {
      postcode,
      territory_id: territoryId,
      state,
      assigned_at: new Date().toISOString(),
    };
  });

  console.log('savePostcodeAssignmentsToSupabase: Records to upsert:', records);

  const { error, data } = await supabase
    .from('postcode_assignments')
    .upsert(records)
    .select();

  if (error) {
    console.error('Error saving postcode assignments to Supabase:', error);
    return false;
  }
  console.log('savePostcodeAssignmentsToSupabase: Success! Upserted', data?.length || 0, 'records');
  return true;
}

// Clear postcode assignments for a territory (optionally filtered by state)
export async function clearPostcodeAssignmentsFromSupabase(
  territoryId: string,
  state?: string
): Promise<boolean> {
  let query = supabase
    .from('postcode_assignments')
    .delete()
    .eq('territory_id', territoryId);

  if (state && state !== 'ALL') {
    query = query.eq('state', state);
  }

  const { error } = await query;

  if (error) {
    console.error('Error clearing postcode assignments from Supabase:', error);
    return false;
  }
  return true;
}

// Remove specific postcode assignments
export async function removePostcodeAssignmentsFromSupabase(
  postcodes: string[]
): Promise<boolean> {
  if (postcodes.length === 0) return true;

  // Extract just postcode numbers from composite keys like "2611-ACT"
  const postcodeNumbers = postcodes.map((key) =>
    key.includes('-') ? key.split('-')[0] : key
  );

  const { error } = await supabase
    .from('postcode_assignments')
    .delete()
    .in('postcode', postcodeNumbers);

  if (error) {
    console.error('Error removing postcode assignments from Supabase:', error);
    return false;
  }
  return true;
}

// Cleanup function to fix corrupted postcode assignments with composite keys
export async function cleanupCorruptedPostcodeAssignments(): Promise<{ fixed: number; deleted: number }> {
  console.log('Starting cleanup of corrupted postcode assignments...');

  // Fetch all assignments
  const allData: DbPostcodeAssignment[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('postcode_assignments')
      .select('*')
      .range(from, to);

    if (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...(data as DbPostcodeAssignment[]));
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Found ${allData.length} total postcode assignments`);

  // Find corrupted records (postcode contains a dash, indicating it's a composite key)
  const corrupted = allData.filter(a => a.postcode.includes('-'));
  console.log(`Found ${corrupted.length} corrupted records with composite keys`);

  if (corrupted.length === 0) {
    return { fixed: 0, deleted: 0 };
  }

  // Batch delete all corrupted records
  const corruptedPostcodes = corrupted.map(r => r.postcode);
  console.log(`Batch deleting ${corruptedPostcodes.length} corrupted records...`);

  const { error: deleteError } = await supabase
    .from('postcode_assignments')
    .delete()
    .in('postcode', corruptedPostcodes);

  if (deleteError) {
    console.error('Error batch deleting corrupted records:', deleteError);
    return { fixed: 0, deleted: 0 };
  }

  // Create fixed records
  const fixedRecords = corrupted.map(record => ({
    postcode: record.postcode.split('-')[0],
    territory_id: record.territory_id,
    state: record.state,
    assigned_at: record.assigned_at,
  }));

  // Batch insert in chunks of 100
  let fixed = 0;
  const batchSize = 100;
  for (let i = 0; i < fixedRecords.length; i += batchSize) {
    const batch = fixedRecords.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('postcode_assignments')
      .upsert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      fixed += batch.length;
    }
  }

  console.log(`Cleanup complete: ${fixed} fixed, ${corrupted.length} deleted`);
  return { fixed, deleted: corrupted.length };
}

// ============ Compliance Zone Functions ============

// Load compliance zones from Supabase
export async function loadComplianceZonesFromSupabase(): Promise<ComplianceZone[]> {
  const { data, error } = await supabase
    .from('compliance_zones')
    .select('*');

  if (error) {
    console.error('Error loading compliance zones from Supabase:', error);
    return [];
  }

  return (data || []).map((zone: DbComplianceZone) => ({
    id: zone.id,
    polygon: zone.polygon,
    createdAt: zone.created_at,
    updatedAt: zone.updated_at,
  }));
}

// Save a compliance zone to Supabase
export async function saveComplianceZoneToSupabase(
  id: string,
  polygon: number[][]
): Promise<boolean> {
  const { error } = await supabase
    .from('compliance_zones')
    .insert({
      id,
      polygon,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving compliance zone to Supabase:', error);
    console.error('Error details:', JSON.stringify(error));
    return false;
  }
  return true;
}

// Delete a compliance zone from Supabase
export async function deleteComplianceZoneFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('compliance_zones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting compliance zone from Supabase:', error);
    return false;
  }
  return true;
}
