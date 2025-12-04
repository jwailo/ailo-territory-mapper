'use client';

import { useRef } from 'react';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';

interface ComplianceDrawControlProps {
  enabled: boolean;
  onZoneCreated: (polygon: number[][]) => void;
}

export default function ComplianceDrawControl({
  enabled,
  onZoneCreated,
}: ComplianceDrawControlProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const handleCreated = (e: L.DrawEvents.Created) => {
    const layer = e.layer as L.Polygon;
    const latLngs = layer.getLatLngs()[0] as L.LatLng[];

    // Convert [lat, lng] from Leaflet to [lng, lat] for storage (GeoJSON standard)
    const polygon = latLngs.map((ll) => [ll.lng, ll.lat]);

    // Close the polygon (first point = last point)
    if (polygon.length > 0) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        polygon.push([...first]);
      }
    }

    onZoneCreated(polygon);

    // Clear the drawn shape (it will be re-rendered by ComplianceZoneLayer)
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <FeatureGroup ref={featureGroupRef} key="compliance-draw-group">
      <EditControl
        key="compliance-edit-control"
        position="topleft"
        onCreated={handleCreated}
        draw={{
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
            },
          },
        }}
        edit={{
          edit: false,
          remove: false,
        }}
      />
    </FeatureGroup>
  );
}
