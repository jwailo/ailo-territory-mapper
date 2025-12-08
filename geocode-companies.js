/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// CSV parsing helpers
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row, headers) {
  return headers.map(h => escapeCSV(row[h])).join(',');
}

// Geocoding function using Nominatim
async function geocodeAddress(streetAddress, city, state, postcode) {
  const query = encodeURIComponent(`${streetAddress}, ${city}, ${state}, ${postcode}, Australia`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AiloTerritoryMapper/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        success: true
      };
    }

    return { success: false };
  } catch (error) {
    console.error(`  Geocode error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Postcode fallback using the postcode CSV
function loadPostcodeCentroids() {
  const postcodeFile = path.join(__dirname, 'public', 'australian_postcodes.csv');

  if (!fs.existsSync(postcodeFile)) {
    console.warn('Warning: australian_postcodes.csv not found, postcode fallback disabled');
    return {};
  }

  const content = fs.readFileSync(postcodeFile, 'utf-8');
  const { rows } = parseCSV(content);

  const centroids = {};

  rows.forEach(row => {
    const postcode = row.postcode?.trim();
    const state = row.state?.trim().toUpperCase();
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.long);

    if (postcode && state && !isNaN(lat) && !isNaN(lon)) {
      const key = `${postcode}-${state}`;
      // Only keep first entry for each postcode-state combo
      if (!centroids[key]) {
        centroids[key] = { lat, lon };
      }
    }
  });

  console.log(`Loaded ${Object.keys(centroids).length} postcode centroids\n`);
  return centroids;
}

// Rate limiter
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main processing function
async function processCompanies() {
  const inputFile = path.join(__dirname, 'public', 'hubspot_companies.csv');
  const outputFile = path.join(__dirname, 'public', 'hubspot_companies_geocoded.csv');

  if (!fs.existsSync(inputFile)) {
    console.error('Error: hubspot_companies.csv not found in public folder');
    process.exit(1);
  }

  console.log('Loading postcode centroids for fallback...');
  const postcodeCentroids = loadPostcodeCentroids();

  console.log('Reading companies CSV...');
  const content = fs.readFileSync(inputFile, 'utf-8');
  const { headers, rows } = parseCSV(content);

  // Add Coord Source column if not present
  if (!headers.includes('Coord Source')) {
    headers.push('Coord Source');
  }

  const stats = {
    total: rows.length,
    alreadyHadCoords: 0,
    geocoded: 0,
    postcodeFallback: 0,
    failed: 0
  };

  console.log(`\nProcessing ${rows.length} companies...\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const companyName = row['Company name'] || `Row ${i + 1}`;
    const lat = row['Latitude']?.trim();
    const lon = row['Longitude']?.trim();

    process.stdout.write(`[${i + 1}/${rows.length}] ${companyName.substring(0, 40).padEnd(40)} `);

    // Check if already has coordinates
    if (lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
      row['Coord Source'] = 'hubspot';
      stats.alreadyHadCoords++;
      console.log('-> Already has coords (hubspot)');
      continue;
    }

    // Try geocoding from address
    const streetAddress = row['Street Address']?.trim() || '';
    const city = row['City']?.trim() || '';
    const state = row['State/Region (AU)']?.trim() || '';
    const postcode = row['Postal Code']?.trim() || '';

    if (streetAddress || city) {
      const result = await geocodeAddress(streetAddress, city, state, postcode);

      if (result.success) {
        row['Latitude'] = result.lat.toString();
        row['Longitude'] = result.lon.toString();
        row['Coord Source'] = 'geocoded';
        stats.geocoded++;
        console.log(`-> Geocoded (${result.lat.toFixed(4)}, ${result.lon.toFixed(4)})`);
        await delay(1100); // Rate limit
        continue;
      }

      await delay(1100); // Rate limit even on failure
    }

    // Try postcode fallback
    if (postcode && state) {
      const key = `${postcode}-${state.toUpperCase()}`;
      const centroid = postcodeCentroids[key];

      if (centroid) {
        row['Latitude'] = centroid.lat.toString();
        row['Longitude'] = centroid.lon.toString();
        row['Coord Source'] = 'postcode';
        stats.postcodeFallback++;
        console.log(`-> Postcode fallback (${centroid.lat.toFixed(4)}, ${centroid.lon.toFixed(4)})`);
        continue;
      }
    }

    // Failed to locate
    row['Coord Source'] = 'missing';
    stats.failed++;
    console.log('-> FAILED (no location found)');
  }

  // Write output CSV
  console.log('\nWriting output file...');
  const outputLines = [headers.join(',')];
  rows.forEach(row => {
    outputLines.push(rowToCSV(row, headers));
  });

  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('GEOCODING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total:                    ${stats.total}`);
  console.log(`Already had coordinates:  ${stats.alreadyHadCoords}`);
  console.log(`Geocoded from address:    ${stats.geocoded}`);
  console.log(`Postcode fallback:        ${stats.postcodeFallback}`);
  console.log(`Failed:                   ${stats.failed}`);
  console.log('='.repeat(50));
  console.log(`\nOutput saved to: ${outputFile}`);
}

// Run
processCompanies().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
