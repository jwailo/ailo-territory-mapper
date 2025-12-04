'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ComplianceZone } from '../types';

interface ComplianceZoneLayerProps {
  zones: ComplianceZone[];
  visible: boolean;
  isAdminMode?: boolean;
  onDeleteZone?: (zoneId: string) => void;
}

const COMPLIANCE_COLOR = '#3B82F6';

export default function ComplianceZoneLayer({
  zones,
  visible,
  isAdminMode = false,
  onDeleteZone,
}: ComplianceZoneLayerProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Remove existing layers
    if (layerGroupRef.current) {
      try {
        map.removeLayer(layerGroupRef.current);
      } catch (e) {
        console.warn('Error removing compliance zone layer:', e);
      }
      layerGroupRef.current = null;
    }

    // Don't show if not visible or no zones
    if (!visible || zones.length === 0) {
      return;
    }

    // Create a layer group to hold all polygon layers
    const layerGroup = L.layerGroup();

    zones.forEach((zone) => {
      // Convert [lng, lat] to [lat, lng] for Leaflet
      const latLngs = zone.polygon.map((coord) => [coord[1], coord[0]] as [number, number]);

      const polygon = L.polygon(latLngs, {
        fillColor: COMPLIANCE_COLOR,
        fillOpacity: 0.2,
        color: COMPLIANCE_COLOR,
        weight: 2,
        opacity: 0.6,
      });

      // Add popup for admin mode with delete option
      if (isAdminMode && onDeleteZone) {
        polygon.bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <strong style="font-size: 14px;">Compliance Zone</strong><br/>
            <button
              onclick="window.deleteComplianceZone('${zone.id}')"
              style="
                margin-top: 8px;
                padding: 4px 12px;
                background-color: #EF4444;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
            >
              Delete Zone
            </button>
          </div>
        `);
      } else {
        polygon.bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <strong style="font-size: 14px; color: ${COMPLIANCE_COLOR};">Compliance Zone</strong>
          </div>
        `);
      }

      layerGroup.addLayer(polygon);
    });

    layerGroup.addTo(map);
    layerGroupRef.current = layerGroup;

    // Cleanup on unmount
    return () => {
      if (layerGroupRef.current) {
        try {
          map.removeLayer(layerGroupRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
        layerGroupRef.current = null;
      }
    };
  }, [map, zones, visible, isAdminMode, onDeleteZone]);

  // Set up global delete handler for popup buttons
  useEffect(() => {
    if (isAdminMode && onDeleteZone) {
      (window as unknown as { deleteComplianceZone: (id: string) => void }).deleteComplianceZone = (id: string) => {
        if (confirm('Are you sure you want to delete this compliance zone?')) {
          onDeleteZone(id);
        }
      };
    }

    return () => {
      delete (window as unknown as { deleteComplianceZone?: (id: string) => void }).deleteComplianceZone;
    };
  }, [isAdminMode, onDeleteZone]);

  return null;
}
