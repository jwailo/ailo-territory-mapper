'use client';

import { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { PostcodeStore, Territory, PostcodeData, PostcodeBoundaryStore, AustralianState } from '../types';

// States that are combined for territory polygon display
// When NSW is selected, also include ACT postcodes (and vice versa)
const COMBINED_STATE_GROUPS: Record<string, AustralianState[]> = {
  'NSW': ['NSW', 'ACT'],
  'ACT': ['NSW', 'ACT'],
};

// Check if a postcode's state matches the selected state (considering combined groups)
function isInSelectedStateGroup(postcodeState: string, selectedState: AustralianState): boolean {
  if (selectedState === 'ALL') return true;
  const stateGroup = COMBINED_STATE_GROUPS[selectedState];
  if (stateGroup) {
    return stateGroup.includes(postcodeState as AustralianState);
  }
  return postcodeState === selectedState;
}

interface TerritoryPolygonLayerProps {
  postcodes: PostcodeStore['postcodes'];
  territories: Record<string, Territory>;
  boundaries: PostcodeBoundaryStore;
  selectedState: AustralianState;
  visible: boolean;
}

interface TerritoryPolygonData {
  territoryName: string;
  color: string;
  // Use FeatureCollection to render all postcode boundaries together (faster than union)
  featureCollection: FeatureCollection | null;
  // Fallback convex hull for when no boundaries available
  convexHull: Feature<Polygon> | null;
}

export default function TerritoryPolygonLayer({
  postcodes,
  territories,
  boundaries,
  selectedState,
  visible,
}: TerritoryPolygonLayerProps) {
  // Group postcodes by territory and create polygon data
  const territoryPolygons = useMemo(() => {
    if (!visible) {
      return [];
    }

    // Only use boundaries if they're loaded for the correct state (or combined state group)
    // This prevents rendering with stale boundaries from a different state
    const boundariesMatchState = boundaries.loadedState !== null &&
      isInSelectedStateGroup(boundaries.loadedState, selectedState);
    const hasBoundaries = boundariesMatchState && Object.keys(boundaries.features).length > 0;

    // Group postcodes by territory, filtering by selected state
    // This ensures we only show territory polygons for postcodes in the current state
    const postcodesByTerritory: Record<string, PostcodeData[]> = {};

    Object.values(postcodes).forEach((pc) => {
      if (pc.territory && pc.lat && pc.long) {
        // Filter by selected state group - NSW includes ACT and vice versa
        if (!isInSelectedStateGroup(pc.state, selectedState)) {
          return;
        }
        if (!postcodesByTerritory[pc.territory]) {
          postcodesByTerritory[pc.territory] = [];
        }
        postcodesByTerritory[pc.territory].push(pc);
      }
    });

    // Create polygon data for each territory
    const polygons: TerritoryPolygonData[] = [];

    Object.entries(postcodesByTerritory).forEach(([territoryName, territoryPostcodes]) => {
      // Find territory by name (territories object is keyed by ID, not name)
      const territory = Object.values(territories).find(t => t.name === territoryName);
      if (!territory) {
        return;
      }

      try {
        // Try to use actual postcode boundaries if available
        if (hasBoundaries) {
          const boundaryFeatures: Feature<Polygon | MultiPolygon>[] = [];

          territoryPostcodes.forEach((pc) => {
            const boundary = boundaries.features[pc.postcode];
            if (boundary) {
              boundaryFeatures.push(boundary as Feature<Polygon | MultiPolygon>);
            }
          });

          if (boundaryFeatures.length > 0) {
            // Instead of expensive union, just render all boundaries as a FeatureCollection
            // This is much faster and still shows the territory area correctly
            const featureCollection: FeatureCollection = {
              type: 'FeatureCollection',
              features: boundaryFeatures,
            };

            polygons.push({
              territoryName,
              color: territory.color,
              featureCollection,
              convexHull: null,
            });
            return;
          }
        }

        // Fallback to convex hull if no boundaries or not enough
        if (territoryPostcodes.length < 3) {
          return;
        }

        // Create Turf.js points
        const points = territoryPostcodes.map((pc) =>
          turf.point([pc.long, pc.lat])
        );
        const fc = turf.featureCollection(points);

        // Create convex hull around the points
        const hull = turf.convex(fc);

        if (hull) {
          // Add a small buffer to make the polygon look better
          const buffered = turf.buffer(hull, 2, { units: 'kilometers' });

          polygons.push({
            territoryName,
            color: territory.color,
            featureCollection: null,
            convexHull: buffered as Feature<Polygon>,
          });
        }
      } catch (error) {
        console.error(`Error creating polygon for ${territoryName}:`, error);
      }
    });

    return polygons;
  }, [postcodes, territories, boundaries, selectedState, visible]);

  if (!visible || territoryPolygons.length === 0) {
    return null;
  }

  // Create a unique key based on state and boundaries to force GeoJSON re-render
  // GeoJSON component doesn't update when data prop changes, so we need key changes
  const boundaryKey = `${selectedState}-${boundaries.loadedState || 'none'}-${Object.keys(boundaries.features).length}`;

  return (
    <>
      {territoryPolygons.map((polygon) => {
        // Render boundary-based territories (FeatureCollection of individual postcodes)
        if (polygon.featureCollection) {
          return (
            <GeoJSON
              key={`territory-boundaries-${polygon.territoryName}-${boundaryKey}`}
              data={polygon.featureCollection}
              style={{
                fillColor: polygon.color,
                fillOpacity: 0.3,
                color: polygon.color,
                opacity: 0.8,
                weight: 1,
              }}
            />
          );
        }

        // Render convex hull fallback
        if (polygon.convexHull) {
          return (
            <GeoJSON
              key={`territory-hull-${polygon.territoryName}-${boundaryKey}`}
              data={polygon.convexHull}
              style={{
                fillColor: polygon.color,
                fillOpacity: 0.2,
                color: polygon.color,
                opacity: 0.6,
                weight: 2,
              }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
