import {
  PostcodeData,
  CompanyData,
  PUMSummary,
  TerritoryPUMStats,
  Territory,
  AustralianState,
} from '../types';

// Update company territories based on their postcode's territory assignment
export function updateCompanyTerritories(
  postcodes: Record<string, PostcodeData>,
  companies: Record<string, CompanyData>
): void {
  for (const company of Object.values(companies)) {
    // Build the postcode key (postcode-state format)
    const postcodeKey = `${company.postcode}-${company.state}`;
    const postcodeData = postcodes[postcodeKey];

    if (postcodeData && postcodeData.territory) {
      company.territory = postcodeData.territory;
    } else {
      company.territory = null;
    }
  }
}

// Calculate PUM totals per territory
export function calculateTerritoryPUM(
  companies: Record<string, CompanyData>,
  territories: Record<string, Territory>,
  selectedState: AustralianState = 'ALL'
): PUMSummary {
  // Initialize territory stats from dynamic territories
  const byTerritory: Record<string, TerritoryPUMStats> = {};
  Object.values(territories).forEach((t) => {
    byTerritory[t.name] = { pum: 0, companyCount: 0 };
  });

  const unassigned: TerritoryPUMStats = { pum: 0, companyCount: 0 };
  const total: TerritoryPUMStats = { pum: 0, companyCount: 0 };

  // Filter companies by state if needed
  const filteredCompanies = Object.values(companies).filter(
    (c) => selectedState === 'ALL' || c.state === selectedState
  );

  // Calculate totals
  for (const company of filteredCompanies) {
    const pum = company.pum || 0;
    const territory = company.territory;

    total.pum += pum;
    total.companyCount++;

    if (territory && byTerritory[territory]) {
      byTerritory[territory].pum += pum;
      byTerritory[territory].companyCount++;
    } else {
      unassigned.pum += pum;
      unassigned.companyCount++;
    }
  }

  return {
    byTerritory,
    unassigned,
    total,
  };
}

// Format PUM number for display
export function formatPUM(pum: number): string {
  return pum.toLocaleString();
}
