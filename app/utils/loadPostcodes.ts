import Papa from 'papaparse';
import { PostcodeStore, PostcodeData, RawCSVRow } from '../types';

export async function loadPostcodes(): Promise<PostcodeStore> {
  const response = await fetch('/australian_postcodes.csv');
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<RawCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const postcodes: Record<string, PostcodeData> = {};

        // Load all Australian postcodes, deduplicate by postcode+state combination
        results.data.forEach((row) => {
          const state = row.state?.trim();
          if (!state) return; // Skip rows without state

          const postcode = row.postcode;
          const lat = parseFloat(row.lat);
          const long = parseFloat(row.long);

          // Skip rows with invalid coordinates
          if (isNaN(lat) || isNaN(long)) return;

          // Use postcode as key (postcodes are unique across Australia)
          // But some postcodes span states, so we use postcode-state as key for uniqueness
          const key = `${postcode}-${state}`;

          if (postcodes[key]) {
            // Add locality to existing postcode if not already present
            const locality = row.locality?.trim().toUpperCase();
            if (locality && !postcodes[key].localities.includes(locality)) {
              postcodes[key].localities.push(locality);
            }
          } else {
            // Create new postcode entry
            const locality = row.locality?.trim().toUpperCase();
            postcodes[key] = {
              postcode,
              state,
              localities: locality ? [locality] : [],
              lat,
              long,
              sa3name: row.sa3name || '',
              sa4name: row.sa4name || '',
              territory: null,
            };
          }
        });

        const total = Object.keys(postcodes).length;

        resolve({
          postcodes,
          stats: {
            total,
            assigned: 0,
            unassigned: total,
          },
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}
