import * as turf from '@turf/turf';
import { PostcodeData, AssignmentResult, AustralianState, AssignmentMode } from '../types';
import type { LatLng } from 'leaflet';

export function getPostcodesInPolygon(
  polygonLatLngs: LatLng[],
  postcodes: Record<string, PostcodeData>
): string[] {
  const found: string[] = [];

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

  for (const [id, pc] of Object.entries(postcodes)) {
    const point = turf.point([pc.long, pc.lat]);
    if (turf.booleanPointInPolygon(point, turfPolygon)) {
      found.push(id);
    }
  }

  return found;
}

export function assignPostcodes(
  postcodeIds: string[],
  territoryName: string,
  postcodes: Record<string, PostcodeData>,
  selectedState: AustralianState = 'ALL',
  mode: AssignmentMode = 'fill-unassigned'
): AssignmentResult {
  const results: AssignmentResult = {
    assigned: [],
    skipped: [],
    reassigned: [],
    outsideState: []
  };

  for (const id of postcodeIds) {
    const postcode = postcodes[id];
    if (!postcode) continue;

    // Skip if wrong state (when state filter is active)
    if (selectedState !== 'ALL' && postcode.state !== selectedState) {
      results.outsideState!.push(id);
      continue;
    }

    const currentTerritory = postcode.territory;
    const isAssigned = !!currentTerritory;
    const isSameTerritory = currentTerritory === territoryName;

    switch (mode) {
      case 'fill-unassigned':
        // Only assign postcodes that have no territory
        if (!isAssigned) {
          postcode.territory = territoryName;
          results.assigned.push(id);
        } else if (!isSameTerritory) {
          results.skipped.push({
            postcode: id,
            currentTerritory: currentTerritory!,
          });
        }
        break;

      case 'take-over':
        // Reassign all postcodes regardless of current assignment
        if (isAssigned && !isSameTerritory) {
          results.reassigned.push({
            postcode: id,
            from: currentTerritory!,
            to: territoryName,
          });
        } else if (!isAssigned) {
          results.assigned.push(id);
        }
        postcode.territory = territoryName;
        break;

      case 'expand-existing':
        // Only add unassigned postcodes adjacent to existing territory
        // For now, we treat this the same as fill-unassigned since adjacency
        // would require complex spatial analysis
        if (!isAssigned) {
          postcode.territory = territoryName;
          results.assigned.push(id);
        } else if (!isSameTerritory) {
          results.skipped.push({
            postcode: id,
            currentTerritory: currentTerritory!,
          });
        }
        break;
    }
  }

  return results;
}

export function calculateStats(
  postcodes: Record<string, PostcodeData>,
  selectedState: AustralianState = 'ALL'
) {
  const filteredPostcodes = Object.values(postcodes).filter(
    (pc) => selectedState === 'ALL' || pc.state === selectedState
  );

  const total = filteredPostcodes.length;
  let assigned = 0;

  const territoryCounts: Record<string, number> = {};
  const stateCounts: Record<string, { total: number; assigned: number }> = {};

  for (const pc of filteredPostcodes) {
    // Count by state
    if (!stateCounts[pc.state]) {
      stateCounts[pc.state] = { total: 0, assigned: 0 };
    }
    stateCounts[pc.state].total++;

    if (pc.territory) {
      assigned++;
      stateCounts[pc.state].assigned++;
      territoryCounts[pc.territory] = (territoryCounts[pc.territory] || 0) + 1;
    }
  }

  return {
    total,
    assigned,
    unassigned: total - assigned,
    territoryCounts,
    stateCounts,
  };
}
