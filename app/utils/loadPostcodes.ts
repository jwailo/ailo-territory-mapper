import Papa from 'papaparse';
import {
  PostcodeStore,
  PostcodeData,
  RawCSVRow,
  PostcodeBoundaryFeature,
  PostcodeBoundaryStore,
  AustralianState,
} from '../types';

// States that should be treated together for boundary loading
// NSW file now contains both NSW and ACT boundaries
const COMBINED_STATES: Record<string, AustralianState> = {
  'ACT': 'NSW', // ACT uses NSW boundary file (which contains both)
};

// Load postcode boundaries for a specific state
export async function loadPostcodeBoundaries(
  state: AustralianState
): Promise<PostcodeBoundaryStore> {
  // Skip loading for "ALL" - boundaries are too large
  if (state === 'ALL') {
    return { features: {}, loadedState: null };
  }

  // Use combined boundary file if applicable (e.g., ACT uses NSW file)
  const boundaryFile = COMBINED_STATES[state] || state;

  try {
    const response = await fetch(`/postcode-boundaries/${boundaryFile}.geojson`);
    if (!response.ok) {
      console.warn(`Failed to load boundaries for ${state}: ${response.status}`);
      return { features: {}, loadedState: null };
    }

    const geojson = await response.json();
    const features: Record<string, PostcodeBoundaryFeature> = {};

    // Index features by postcode for fast lookup
    for (const feature of geojson.features) {
      const postcode = feature.properties?.POA;
      if (postcode) {
        features[postcode] = feature;
      }
    }

    console.log(`Loaded ${Object.keys(features).length} postcode boundaries for ${state}`);
    return { features, loadedState: state };
  } catch (error) {
    console.error(`Error loading boundaries for ${state}:`, error);
    return { features: {}, loadedState: null };
  }
}

export async function loadPostcodes(): Promise<PostcodeStore> {
  // Only load CSV initially - boundaries are lazy loaded when needed
  const csvResponse = await fetch('/australian_postcodes.csv');
  const csvText = await csvResponse.text();

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
          boundaries: { features: {}, loadedState: null },
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
