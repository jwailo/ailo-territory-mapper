import { supabase, DbCompany, DbTerritory, DbPostcodeAssignment } from './supabase';
import { CompanyData, CompanyStore, Territory, LifecycleStage, CoordSource } from '../types';

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

// Load companies from Supabase
export async function loadCompaniesFromSupabase(): Promise<CompanyStore | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*');

  if (error) {
    console.error('Error loading companies from Supabase:', error);
    return null;
  }

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

  for (const row of data as DbCompany[]) {
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

// Load postcode assignments from Supabase
export async function loadPostcodeAssignmentsFromSupabase(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('postcode_assignments')
    .select('*');

  if (error) {
    console.error('Error loading postcode assignments from Supabase:', error);
    return {};
  }

  const assignments: Record<string, string> = {};
  for (const a of (data || []) as DbPostcodeAssignment[]) {
    // Key by postcode, value is territory_id
    assignments[a.postcode] = a.territory_id;
  }

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
  if (postcodes.length === 0) return true;

  const records = postcodes.map((postcode) => ({
    postcode,
    territory_id: territoryId,
    state,
    assigned_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('postcode_assignments')
    .upsert(records);

  if (error) {
    console.error('Error saving postcode assignments to Supabase:', error);
    return false;
  }
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

  const { error } = await supabase
    .from('postcode_assignments')
    .delete()
    .in('postcode', postcodes);

  if (error) {
    console.error('Error removing postcode assignments from Supabase:', error);
    return false;
  }
  return true;
}
