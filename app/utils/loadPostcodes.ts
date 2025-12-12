import Papa from 'papaparse';
import { PostcodeStore, PostcodeData, RawCSVRow, PostcodeBoundaryFeature, PostcodeBoundaryStore } from '../types';

// Cache for lazy-loaded boundaries
let cachedBoundaries: PostcodeBoundaryStore | null = null;

// Load postcode boundary GeoJSON - exported for lazy loading
export async function loadPostcodeBoundaries(): Promise<PostcodeBoundaryStore> {
  // Return cached if already loaded
  if (cachedBoundaries) {
    return cachedBoundaries;
  }

  try {
    console.log('Loading postcode boundaries GeoJSON (37MB)...');
    const response = await fetch('/au-postcodes.geojson');
    if (!response.ok) {
      console.warn('Failed to load postcode boundaries GeoJSON:', response.status);
      return { features: {}, loaded: false };
    }

    const geojson = await response.json();
    const features: Record<string, PostcodeBoundaryFeature> = {};

    for (const feature of geojson.features) {
      const postcode = feature.properties?.POA;
      if (postcode) {
        features[postcode] = feature as PostcodeBoundaryFeature;
      }
    }

    console.log(`Loaded ${Object.keys(features).length} postcode boundaries`);
    cachedBoundaries = { features, loaded: true };
    return cachedBoundaries;
  } catch (error) {
    console.error('Error loading postcode boundaries:', error);
    return { features: {}, loaded: false };
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
          // Boundaries start empty - lazy loaded when admin mode activated
          boundaries: { features: {}, loaded: false },
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
