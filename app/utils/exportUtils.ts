import { PostcodeData, Territory, AustralianState } from '../types';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export single territory as CSV (with state column)
export function exportTerritoryCSV(
  postcodes: Record<string, PostcodeData>,
  territoryName: string
) {
  const rows = Object.values(postcodes)
    .filter((pc) => pc.territory === territoryName)
    .map((pc) => ({
      postcode: pc.postcode,
      locality: pc.localities[0] || '',
      state: pc.state,
      lat: pc.lat,
      long: pc.long,
    }));

  const header = 'postcode,locality,state,lat,long';
  const csvContent = [
    header,
    ...rows.map((r) => `${r.postcode},"${r.locality}",${r.state},${r.lat},${r.long}`),
  ].join('\n');

  const filename = `${territoryName.toLowerCase().replace(/\s+/g, '_')}_postcodes.csv`;
  downloadFile(csvContent, filename, 'text/csv');
}

// Export all territories as CSV (with state column)
export function exportAllTerritoriesCSV(postcodes: Record<string, PostcodeData>) {
  const rows = Object.values(postcodes)
    .filter((pc) => pc.territory)
    .map((pc) => ({
      postcode: pc.postcode,
      locality: pc.localities[0] || '',
      state: pc.state,
      territory: pc.territory,
      lat: pc.lat,
      long: pc.long,
    }));

  const header = 'postcode,locality,state,territory,lat,long';
  const csvContent = [
    header,
    ...rows.map(
      (r) => `${r.postcode},"${r.locality}",${r.state},"${r.territory}",${r.lat},${r.long}`
    ),
  ].join('\n');

  downloadFile(csvContent, 'territory_assignments.csv', 'text/csv');
}

// Export unassigned postcodes as CSV (with state column)
export function exportUnassignedCSV(
  postcodes: Record<string, PostcodeData>,
  selectedState: AustralianState = 'ALL'
) {
  const rows = Object.values(postcodes)
    .filter((pc) => {
      if (pc.territory) return false;
      if (selectedState !== 'ALL' && pc.state !== selectedState) return false;
      return true;
    })
    .map((pc) => ({
      postcode: pc.postcode,
      locality: pc.localities[0] || '',
      state: pc.state,
      lat: pc.lat,
      long: pc.long,
    }));

  const header = 'postcode,locality,state,lat,long';
  const csvContent = [
    header,
    ...rows.map((r) => `${r.postcode},"${r.locality}",${r.state},${r.lat},${r.long}`),
  ].join('\n');

  const statePrefix = selectedState !== 'ALL' ? `${selectedState.toLowerCase()}_` : '';
  downloadFile(csvContent, `${statePrefix}unassigned_postcodes.csv`, 'text/csv');
}

// Export HubSpot-friendly postcode list (comma-separated)
export function exportHubSpotList(
  postcodes: Record<string, PostcodeData>,
  territoryName: string
) {
  const postcodeList = Object.values(postcodes)
    .filter((pc) => pc.territory === territoryName)
    .map((pc) => pc.postcode)
    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
    .sort()
    .join(',');

  const filename = `${territoryName.toLowerCase().replace(/\s+/g, '_')}_hubspot.txt`;
  downloadFile(postcodeList, filename, 'text/plain');
}

// Export all HubSpot lists (one file per territory)
export function exportAllHubSpotLists(
  postcodes: Record<string, PostcodeData>,
  territories: Record<string, Territory>
) {
  Object.values(territories).forEach((territory) => {
    const territoryPostcodes = Object.values(postcodes).filter(
      (pc) => pc.territory === territory.name
    );
    if (territoryPostcodes.length > 0) {
      exportHubSpotList(postcodes, territory.name);
    }
  });
}

// Clear a territory (reset all postcodes in that territory to unassigned)
export function clearTerritory(
  postcodes: Record<string, PostcodeData>,
  territoryName: string,
  selectedState: AustralianState = 'ALL'
): number {
  let count = 0;
  for (const pc of Object.values(postcodes)) {
    if (pc.territory === territoryName) {
      // If state filter is active, only clear postcodes in that state
      if (selectedState !== 'ALL' && pc.state !== selectedState) continue;
      pc.territory = null;
      count++;
    }
  }
  return count;
}
