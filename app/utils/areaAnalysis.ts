import * as turf from '@turf/turf';
import { CompanyData, AreaAnalysisResult } from '../types';
import type { LatLng } from 'leaflet';

export function getCompaniesInPolygon(
  polygonLatLngs: LatLng[],
  companies: CompanyData[]
): CompanyData[] {
  const found: CompanyData[] = [];

  // Convert Leaflet polygon to Turf polygon (needs to be closed, lng/lat order)
  const coordinates = polygonLatLngs.map((p) => [p.lng, p.lat]);
  // Close the polygon if not already closed
  if (
    coordinates.length > 0 &&
    (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1])
  ) {
    coordinates.push(coordinates[0]);
  }

  const turfPolygon = turf.polygon([coordinates]);

  for (const company of companies) {
    if (company.lat === null || company.long === null) continue;
    const point = turf.point([company.long, company.lat]);
    if (turf.booleanPointInPolygon(point, turfPolygon)) {
      found.push(company);
    }
  }

  return found;
}

export function analyzeArea(companies: CompanyData[]): AreaAnalysisResult {
  const result: AreaAnalysisResult = {
    companies,
    totalPUM: 0,
    companyCount: companies.length,
    byStage: {},
    byOwner: {},
  };

  for (const company of companies) {
    const pum = company.pum || 0;
    result.totalPUM += pum;

    // By stage
    const stage = company.lifecycleStage || 'Other';
    if (!result.byStage[stage]) {
      result.byStage[stage] = { count: 0, pum: 0 };
    }
    result.byStage[stage].count++;
    result.byStage[stage].pum += pum;

    // By owner
    const owner = company.owner || 'Unassigned';
    if (!result.byOwner[owner]) {
      result.byOwner[owner] = { count: 0, pum: 0 };
    }
    result.byOwner[owner].count++;
    result.byOwner[owner].pum += pum;
  }

  return result;
}
