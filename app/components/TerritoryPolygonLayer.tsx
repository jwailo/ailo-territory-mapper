'use client';

import { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import { PostcodeStore, Territory, PostcodeData } from '../types';

interface TerritoryPolygonLayerProps {
  postcodes: PostcodeStore['postcodes'];
  territories: Record<string, Territory>;
  visible: boolean;
}

interface TerritoryPolygon {
  territoryName: string;
  color: string;
  geoJson: Feature<Polygon> | null;
}

export default function TerritoryPolygonLayer({
  postcodes,
  territories,
  visible,
}: TerritoryPolygonLayerProps) {
  // Group postcodes by territory and create convex hulls
  const territoryPolygons = useMemo(() => {
    if (!visible) {
      console.log('TerritoryPolygonLayer: not visible');
      return [];
    }

    // Group postcodes by territory
    const postcodesByTerritory: Record<string, PostcodeData[]> = {};

    // Count postcodes with territory assignments
    const assignedCount = Object.values(postcodes).filter(pc => pc.territory).length;
    console.log('TerritoryPolygonLayer: total postcodes:', Object.keys(postcodes).length, 'assigned:', assignedCount);

    Object.values(postcodes).forEach((pc) => {
      if (pc.territory && pc.lat && pc.long) {
        if (!postcodesByTerritory[pc.territory]) {
          postcodesByTerritory[pc.territory] = [];
        }
        postcodesByTerritory[pc.territory].push(pc);
      }
    });

    // Create convex hull for each territory
    const polygons: TerritoryPolygon[] = [];

    console.log('TerritoryPolygonLayer: territories with postcodes:', Object.keys(postcodesByTerritory));

    Object.entries(postcodesByTerritory).forEach(([territoryName, territoryPostcodes]) => {
      console.log(`TerritoryPolygonLayer: ${territoryName} has ${territoryPostcodes.length} postcodes`);

      // Need at least 3 points to create a polygon
      if (territoryPostcodes.length < 3) {
        console.log(`TerritoryPolygonLayer: skipping ${territoryName} - less than 3 postcodes`);
        return;
      }

      // Find territory by name (territories object is keyed by ID, not name)
      const territory = Object.values(territories).find(t => t.name === territoryName);
      if (!territory) {
        console.log(`TerritoryPolygonLayer: skipping ${territoryName} - territory not found in territories object`);
        console.log(`TerritoryPolygonLayer: available territories:`, Object.values(territories).map(t => t.name));
        return;
      }

      try {
        // Create Turf.js points
        const points = territoryPostcodes.map((pc) =>
          turf.point([pc.long, pc.lat])
        );
        const featureCollection = turf.featureCollection(points);

        // Create convex hull around the points
        const hull = turf.convex(featureCollection);

        if (hull) {
          // Add a small buffer to make the polygon look better
          const buffered = turf.buffer(hull, 2, { units: 'kilometers' });

          polygons.push({
            territoryName,
            color: territory.color,
            geoJson: buffered as Feature<Polygon>,
          });
        }
      } catch (error) {
        console.error(`Error creating polygon for territory ${territoryName}:`, error);
      }
    });

    console.log('TerritoryPolygonLayer: created', polygons.length, 'polygons');
    return polygons;
  }, [postcodes, territories, visible]);

  console.log('TerritoryPolygonLayer render: visible=', visible, 'polygons=', territoryPolygons.length);

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
              fillOpacity: 0.2,
              color: polygon.color,
              opacity: 0.6,
              weight: 2,
            }}
          />
        )
      ))}
    </>
  );
}
