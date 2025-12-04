'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { CompanyData } from '../types';

interface HeatMapLayerProps {
  companies: CompanyData[];
  visible: boolean;
  cellSize?: number; // Size of hexagons in kilometers
}

// Color scale for PUM intensity: Grey -> Yellow -> Orange -> Red -> Purple
function getHexColor(intensity: number): string {
  if (intensity < 0.2) return '#9CA3AF'; // grey
  if (intensity < 0.4) return '#FCD34D'; // yellow
  if (intensity < 0.6) return '#F97316'; // orange
  if (intensity < 0.8) return '#EF4444'; // red
  return '#7C3AED'; // purple
}

export default function HeatMapLayer({
  companies,
  visible,
  cellSize = 50, // 50km hexagons by default
}: HeatMapLayerProps) {
  const map = useMap();
  const hexLayerRef = useRef<L.GeoJSON | null>(null);

  // Create hexbin data from companies
  const hexbinData = useMemo(() => {
    // Filter companies with valid coordinates in Australia
    const validCompanies = companies.filter((c) => {
      const lat = c.lat;
      const lng = c.long;
      return (
        lat !== null &&
        lng !== null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat > -45 &&
        lat < -10 &&
        lng > 110 &&
        lng < 155
      );
    });

    console.log('Valid companies for hexbin:', validCompanies.length);

    if (validCompanies.length === 0) {
      return null;
    }

    // Create points from companies
    const points = turf.featureCollection(
      validCompanies.map((c) =>
        turf.point([c.long!, c.lat!], { pum: c.pum || 0 })
      )
    );

    // Australia bounding box
    const bbox: [number, number, number, number] = [110, -45, 155, -10];

    // Create hexbin grid
    const hexGrid = turf.hexGrid(bbox, cellSize, { units: 'kilometers' });

    // Aggregate PUM into each hexagon
    hexGrid.features.forEach((hex) => {
      const ptsWithin = turf.pointsWithinPolygon(points, hex);
      const totalPUM = ptsWithin.features.reduce(
        (sum, pt) => sum + ((pt.properties?.pum as number) || 0),
        0
      );
      const companyCount = ptsWithin.features.length;
      hex.properties = hex.properties || {};
      hex.properties.pum = totalPUM;
      hex.properties.count = companyCount;
    });

    // Filter out empty hexagons
    const nonEmptyHexes = {
      type: 'FeatureCollection' as const,
      features: hexGrid.features.filter(
        (h) => h.properties && h.properties.count > 0
      ),
    };

    // Find max PUM for color scaling
    const maxPUM = Math.max(
      ...nonEmptyHexes.features.map((h) => h.properties?.pum || 0),
      1 // Prevent division by zero
    );

    console.log(
      'Hexbin grid created:',
      nonEmptyHexes.features.length,
      'hexagons with data, max PUM:',
      maxPUM
    );

    return { hexes: nonEmptyHexes, maxPUM };
  }, [companies, cellSize]);

  useEffect(() => {
    // Remove existing layer if any
    if (hexLayerRef.current) {
      try {
        map.removeLayer(hexLayerRef.current);
      } catch (e) {
        console.warn('Error removing hex layer:', e);
      }
      hexLayerRef.current = null;
    }

    // Don't show if not visible or no data
    if (!visible || !hexbinData) {
      console.log('Hexbin layer hidden or no data');
      return;
    }

    const { hexes, maxPUM } = hexbinData;

    // Create GeoJSON layer with color based on PUM
    const hexLayer = L.geoJSON(hexes as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const pum = feature?.properties?.pum || 0;
        const intensity = pum / maxPUM;
        return {
          fillColor: getHexColor(intensity),
          fillOpacity: 0.6,
          weight: 1,
          color: '#ffffff',
          opacity: 0.3,
        };
      },
      onEachFeature: (feature, layer) => {
        const count = feature.properties?.count || 0;
        const pum = feature.properties?.pum || 0;
        layer.bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <strong style="font-size: 14px;">${count} ${count === 1 ? 'Company' : 'Companies'}</strong><br/>
            <span style="color: #666;">Total PUM: ${pum.toLocaleString()}</span>
          </div>
        `);
      },
    });

    hexLayer.addTo(map);
    hexLayerRef.current = hexLayer;
    console.log('Hexbin layer added with', hexes.features.length, 'hexagons');

    // Cleanup on unmount
    return () => {
      if (hexLayerRef.current) {
        try {
          map.removeLayer(hexLayerRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
        hexLayerRef.current = null;
      }
    };
  }, [map, visible, hexbinData]);

  return null;
}
