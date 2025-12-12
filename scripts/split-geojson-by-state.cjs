/**
 * Script to split the large au-postcodes.geojson file into smaller state-based files.
 * Uses the CSV postcode data to determine which state each postcode belongs to.
 *
 * Run with: node scripts/split-geojson-by-state.js
 */

const fs = require('fs');
const path = require('path');

// Australian postcode ranges by state (approximate, used as fallback)
// https://en.wikipedia.org/wiki/Postcodes_in_Australia
const POSTCODE_STATE_RANGES = {
  NSW: [[1000, 1999], [2000, 2599], [2619, 2899], [2921, 2999]],
  ACT: [[200, 299], [2600, 2618], [2900, 2920]],
  VIC: [[3000, 3999], [8000, 8999]],
  QLD: [[4000, 4999], [9000, 9999]],
  SA: [[5000, 5799], [5800, 5999]],
  WA: [[6000, 6797], [6800, 6999]],
  TAS: [[7000, 7799], [7800, 7999]],
  NT: [[800, 899], [900, 999]],
};

// Build a postcode-to-state map from CSV
function buildPostcodeStateMap(csvPath) {
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',');

  const postcodeIdx = headers.findIndex(h => h.toLowerCase().includes('postcode'));
  const stateIdx = headers.findIndex(h => h.toLowerCase() === 'state');

  const map = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parsing (handles basic cases)
    const cols = line.split(',');
    const postcode = cols[postcodeIdx]?.trim();
    const state = cols[stateIdx]?.trim();

    if (postcode && state) {
      // Use the first state we find for each postcode
      if (!map[postcode]) {
        map[postcode] = state;
      }
    }
  }

  console.log(`Built postcode-state map with ${Object.keys(map).length} entries`);
  return map;
}

// Fallback: determine state from postcode number
function getStateFromPostcodeNumber(postcode) {
  const num = parseInt(postcode, 10);
  if (isNaN(num)) return null;

  for (const [state, ranges] of Object.entries(POSTCODE_STATE_RANGES)) {
    for (const [min, max] of ranges) {
      if (num >= min && num <= max) {
        return state;
      }
    }
  }
  return null;
}

async function main() {
  const geojsonPath = path.join(__dirname, '../public/au-postcodes.geojson');
  const csvPath = path.join(__dirname, '../public/australian_postcodes.csv');
  const outputDir = path.join(__dirname, '../public/postcode-boundaries');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Building postcode-to-state mapping from CSV...');
  const postcodeStateMap = buildPostcodeStateMap(csvPath);

  console.log('Reading GeoJSON file...');
  const geojsonContent = fs.readFileSync(geojsonPath, 'utf-8');
  const geojson = JSON.parse(geojsonContent);

  console.log(`Total features: ${geojson.features.length}`);

  // Group features by state
  const featuresByState = {
    NSW: [],
    VIC: [],
    QLD: [],
    SA: [],
    WA: [],
    TAS: [],
    NT: [],
    ACT: [],
  };

  let unmapped = 0;

  for (const feature of geojson.features) {
    const postcode = feature.properties?.POA;
    if (!postcode) {
      unmapped++;
      continue;
    }

    // Try CSV mapping first, then fallback to postcode ranges
    let state = postcodeStateMap[postcode];
    if (!state) {
      state = getStateFromPostcodeNumber(postcode);
    }

    if (state && featuresByState[state]) {
      featuresByState[state].push(feature);
    } else {
      unmapped++;
      console.log(`Could not map postcode ${postcode} to a state`);
    }
  }

  console.log(`\nUnmapped postcodes: ${unmapped}`);

  // Write state files
  for (const [state, features] of Object.entries(featuresByState)) {
    const stateGeojson = {
      type: 'FeatureCollection',
      features: features,
    };

    const outputPath = path.join(outputDir, `${state}.geojson`);
    const content = JSON.stringify(stateGeojson);
    fs.writeFileSync(outputPath, content);

    const sizeMB = (content.length / 1024 / 1024).toFixed(2);
    console.log(`${state}: ${features.length} postcodes, ${sizeMB} MB`);
  }

  console.log('\nDone! State files written to public/postcode-boundaries/');
}

main().catch(console.error);
