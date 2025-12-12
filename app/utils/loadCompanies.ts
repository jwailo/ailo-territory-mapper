import Papa from 'papaparse';
import {
  CompanyStore,
  CompanyData,
  RawCompanyCSVRow,
  LifecycleStage,
  CoordSource,
  PostcodeData,
} from '../types';
import { loadCompaniesFromSupabase } from './supabaseData';

const HUBSPOT_ACCOUNT_ID = '49213690';

function normalizeLifecycleStage(stage: string): LifecycleStage {
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

function buildHubSpotUrl(recordId: string): string {
  return `https://app.hubspot.com/contacts/${HUBSPOT_ACCOUNT_ID}/company/${recordId}`;
}

// Load companies from CSV (fallback)
async function loadCompaniesFromCSV(
  postcodes: Record<string, PostcodeData>
): Promise<CompanyStore> {
  const response = await fetch('/hubspot_companies.csv');
  if (!response.ok) {
    throw new Error('Failed to load hubspot_companies.csv');
  }
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<RawCompanyCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
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

        results.data.forEach((row) => {
          const id = row['Record ID']?.trim();
          if (!id) return;

          // Filter out New Zealand companies
          const domain = row['Company Domain Name']?.trim().toLowerCase() || '';
          const postalCode = row['Postal Code']?.trim().toLowerCase() || '';
          const address = row['Street Address']?.trim().toLowerCase() || '';
          const city = row['City']?.trim().toLowerCase() || '';
          const companyName = row['Company name']?.trim().toLowerCase() || '';

          // Skip if domain contains .nz
          if (domain.includes('.nz')) return;
          // Skip if postcode is 'International'
          if (postalCode === 'international') return;
          // Skip if address or city contains NZ locations
          if (
            address.includes('auckland') ||
            address.includes('rototuna') ||
            address.includes('christchurch') ||
            address.includes('hamilton') ||
            city.includes('auckland') ||
            city.includes('rototuna') ||
            city.includes('christchurch') ||
            city.includes('hamilton')
          ) return;
          // Skip if company name contains NZ indicators
          if (
            companyName.includes('auckland') ||
            companyName.includes(' nz') ||
            companyName.includes('(nz)') ||
            companyName.includes('new zealand') ||
            companyName.includes('harcourts corporate nz') ||
            companyName.includes('eves real estate') ||
            companyName.includes('staywell property management') ||
            companyName.includes('pure rental nz') ||
            companyName.includes('my agent')
          ) return;

          const rawLat = parseFloat(row['Latitude']);
          const rawLong = parseFloat(row['Longitude']);
          const postcode = row['Postal Code']?.trim();
          const state = row['State/Region (AU)']?.trim().toUpperCase();

          let lat: number | null = null;
          let long: number | null = null;
          let coordSource: CoordSource = 'missing';

          // Check if HubSpot provided valid coordinates
          if (!isNaN(rawLat) && !isNaN(rawLong) && rawLat !== 0 && rawLong !== 0) {
            lat = rawLat;
            long = rawLong;
            coordSource = 'hubspot';
          } else if (postcode && state) {
            // Try postcode centroid fallback
            const postcodeKey = `${postcode}-${state}`;
            const postcodeData = postcodes[postcodeKey];
            if (postcodeData) {
              lat = postcodeData.lat;
              long = postcodeData.long;
              coordSource = 'postcode';
            }
          }

          const lifecycleStage = normalizeLifecycleStage(row['Lifecycle Stage']);

          // Check if company's postcode has a territory assigned
          const postcodeKey = `${postcode}-${state}`;
          const postcodeData = postcodes[postcodeKey];
          const territory = postcodeData?.territory || null;

          companies[id] = {
            id,
            name: row['Company name']?.trim() || '',
            address: row['Street Address']?.trim() || '',
            city: row['City']?.trim() || '',
            state: state || '',
            postcode: postcode || '',
            lat,
            long,
            owner: row['Company owner']?.trim() || '',
            lifecycleStage,
            domain: row['Company Domain Name']?.trim() || '',
            phase: row['Phase']?.trim() || '',
            pum: parseInt(row['Estimated PUM']) || 0,
            hubspotUrl: buildHubSpotUrl(id),
            coordSource,
            territory,
          };

          stats.total++;
          if (lat !== null && long !== null) {
            stats.withCoords++;
          } else {
            stats.missingCoords++;
          }
          stats.byLifecycle[lifecycleStage]++;
        });

        resolve({ companies, stats });
      },
      error: (error: Error) => reject(error),
    });
  });
}

// Main load function - tries Supabase first, falls back to CSV
export async function loadCompanies(
  postcodes: Record<string, PostcodeData>
): Promise<CompanyStore> {
  // Try Supabase first (pass postcodes for coordinate fallback)
  try {
    const supabaseResult = await loadCompaniesFromSupabase(postcodes);
    if (supabaseResult && supabaseResult.stats.total > 0) {
      console.log(`Loaded ${supabaseResult.stats.total} companies from Supabase`);
      return supabaseResult;
    }
  } catch (error) {
    console.error('Error loading from Supabase, falling back to CSV:', error);
  }

  // Fall back to CSV
  console.log('Loading companies from CSV (Supabase empty or unavailable)');
  return loadCompaniesFromCSV(postcodes);
}

// Get companies with missing coordinates for reporting
export function getCompaniesWithMissingCoords(
  companies: Record<string, CompanyData>
): CompanyData[] {
  return Object.values(companies).filter(
    (c) => c.lat === null || c.long === null
  );
}

// Export missing coordinates report as CSV
export function exportMissingCoordsCSV(
  companies: Record<string, CompanyData>
): void {
  const missing = getCompaniesWithMissingCoords(companies);

  if (missing.length === 0) {
    alert('All companies have coordinates!');
    return;
  }

  const header = 'id,name,address,city,state,postcode,hubspot_url';
  const rows = missing.map(
    (c) =>
      `${c.id},"${c.name}","${c.address}","${c.city}",${c.state},${c.postcode},${c.hubspotUrl}`
  );

  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'companies_missing_coordinates.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Calculate company stats for a specific state
export function calculateCompanyStats(
  companies: Record<string, CompanyData>,
  selectedState: string
): {
  total: number;
  withCoords: number;
  missingCoords: number;
  byLifecycle: Record<LifecycleStage, number>;
  byCoordSource: Record<CoordSource, number>;
} {
  const filtered = Object.values(companies).filter(
    (c) => selectedState === 'ALL' || c.state === selectedState
  );

  const stats = {
    total: filtered.length,
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
    byCoordSource: {
      hubspot: 0,
      geocoded: 0,
      postcode: 0,
      missing: 0,
    } as Record<CoordSource, number>,
  };

  filtered.forEach((c) => {
    if (c.lat !== null && c.long !== null) {
      stats.withCoords++;
    } else {
      stats.missingCoords++;
    }
    stats.byLifecycle[c.lifecycleStage]++;
    stats.byCoordSource[c.coordSource]++;
  });

  return stats;
}
