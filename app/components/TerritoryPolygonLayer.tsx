'use client';

import { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson';
import { PostcodeStore, Territory, PostcodeData, PostcodeBoundaryStore } from '../types';

interface TerritoryPolygonLayerProps {
  postcodes: PostcodeStore['postcodes'];
  boundaries: PostcodeBoundaryStore;
  territories: Record<string, Territory>;
  visible: boolean;
}

interface TerritoryPolygon {
  territoryName: string;
  color: string;
  geoJson: Feature<Polygon | MultiPolygon, GeoJsonProperties> | null;
}

// Merge multiple postcode polygon boundaries into a single territory polygon
function mergePostcodeBoundaries(
  postcodeNumbers: string[],
  boundaries: PostcodeBoundaryStore
): Feature<Polygon | MultiPolygon, GeoJsonProperties> | null {
  if (!boundaries.loaded || postcodeNumbers.length === 0) {
    return null;
  }

  // Collect all boundary features for these postcodes
  const features: Feature<Polygon | MultiPolygon, GeoJsonProperties>[] = [];

  for (const postcode of postcodeNumbers) {
    const boundary = boundaries.features[postcode];
    if (boundary) {
      // Convert to turf-compatible feature
      features.push(boundary as Feature<Polygon | MultiPolygon, GeoJsonProperties>);
    }
  }

  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0];
  }

  try {
    // Use turf.union to merge all polygons into one
    // Start with the first feature and progressively union with the rest
    let merged: Feature<Polygon | MultiPolygon, GeoJsonProperties> | null = features[0];

    for (let i = 1; i < features.length; i++) {
      if (merged) {
        const result = turf.union(
          turf.featureCollection([merged, features[i]])
        );
        if (result) {
          merged = result as Feature<Polygon | MultiPolygon, GeoJsonProperties>;
        }
      }
    }

    return merged;
  } catch (error) {
    console.error('Error merging postcode boundaries:', error);
    // Fallback: return as a feature collection (will render each separately)
    return null;
  }
}

// Fallback: Create convex hull from postcode center points (when boundaries unavailable)
function createConvexHullFallback(
  territoryPostcodes: PostcodeData[]
): Feature<Polygon, GeoJsonProperties> | null {
  if (territoryPostcodes.length < 3) {
    return null;
  }

  try {
    const points = territoryPostcodes.map((pc) =>
      turf.point([pc.long, pc.lat])
    );
    const featureCollection = turf.featureCollection(points);
    const hull = turf.convex(featureCollection);

    if (hull) {
      // Add a small buffer to make the polygon look better
      const buffered = turf.buffer(hull, 2, { units: 'kilometers' });
      return buffered as Feature<Polygon, GeoJsonProperties>;
    }
  } catch (error) {
    console.error('Error creating convex hull fallback:', error);
  }
  return null;
}

export default function TerritoryPolygonLayer({
  postcodes,
  boundaries,
  territories,
  visible,
}: TerritoryPolygonLayerProps) {
  // Group postcodes by territory and merge their actual boundary polygons
  const territoryPolygons = useMemo(() => {
    if (!visible) {
      return [];
    }

    // Group postcodes by territory
    const postcodesByTerritory: Record<string, PostcodeData[]> = {};
    const postcodeNumbersByTerritory: Record<string, Set<string>> = {};

    Object.values(postcodes).forEach((pc) => {
      if (pc.territory && pc.lat && pc.long) {
        if (!postcodesByTerritory[pc.territory]) {
          postcodesByTerritory[pc.territory] = [];
          postcodeNumbersByTerritory[pc.territory] = new Set();
        }
        postcodesByTerritory[pc.territory].push(pc);
        // Store just the postcode number (without state) for boundary lookup
        postcodeNumbersByTerritory[pc.territory].add(pc.postcode);
      }
    });

    const polygons: TerritoryPolygon[] = [];
    const boundariesAvailable = boundaries.loaded && Object.keys(boundaries.features).length > 0;

    console.log('TerritoryPolygonLayer: boundaries loaded:', boundariesAvailable);

    Object.entries(postcodesByTerritory).forEach(([territoryName, territoryPostcodes]) => {
      // Find territory by name (territories object is keyed by ID, not name)
      const territory = Object.values(territories).find(t => t.name === territoryName);
      if (!territory) {
        return;
      }

      let geoJson: Feature<Polygon | MultiPolygon, GeoJsonProperties> | null = null;

      if (boundariesAvailable) {
        // Use actual postcode boundary merging
        const postcodeNumbers = Array.from(postcodeNumbersByTerritory[territoryName]);
        geoJson = mergePostcodeBoundaries(postcodeNumbers, boundaries);

        if (geoJson) {
          console.log(`TerritoryPolygonLayer: ${territoryName} merged ${postcodeNumbers.length} postcode boundaries`);
        }
      }

      // Fallback to convex hull if boundaries not available or merge failed
      if (!geoJson) {
        geoJson = createConvexHullFallback(territoryPostcodes);
        if (geoJson) {
          console.log(`TerritoryPolygonLayer: ${territoryName} using convex hull fallback`);
        }
      }

      if (geoJson) {
        polygons.push({
          territoryName,
          color: territory.color,
          geoJson,
        });
      }
    });

    console.log('TerritoryPolygonLayer: created', polygons.length, 'territory polygons');
    return polygons;
  }, [postcodes, boundaries, territories, visible]);

  if (!visible || territoryPolygons.length === 0) {
    return null;
  }

  return (
    <>
      {territoryPolygons.map((polygon) => (
        polygon.geoJson && (
          <GeoJSON
            key={`territory-polygon-${polygon.territoryName}`}
            data={polygon.geoJson}
            style={{
              fillColor: polygon.color,
              fillOpacity: 0.25,
              color: polygon.color,
              opacity: 0.8,
              weight: 2,
            }}
          />
        )
      ))}
    </>
  );
}
