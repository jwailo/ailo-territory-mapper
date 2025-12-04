'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  CompanyData,
  AustralianState,
  getLifecycleColor,
  isAiloCustomer,
} from '../types';

interface CompanyLayerProps {
  companies: CompanyData[];
  selectedState: AustralianState;
  visible: boolean;
  isViewMode?: boolean;
}

// Generate popup HTML for a company
function generatePopupContent(company: CompanyData): string {
  const color = getLifecycleColor(company.lifecycleStage);
  const isPostcodeFallback = company.coordSource === 'postcode';
  const ailoCustomer = isAiloCustomer(company);

  return `
    <div class="text-sm min-w-[240px]">
      <p class="font-bold text-base mb-1">${company.name}</p>
      <div class="space-y-1 text-gray-700">
        ${company.address ? `<p><span class="font-semibold">Address:</span> ${company.address}</p>` : ''}
        <p><span class="font-semibold">Location:</span> ${company.city || ''}, ${company.state || ''} ${company.postcode || ''}</p>
        ${company.owner ? `<p><span class="font-semibold">Owner:</span> ${company.owner}</p>` : ''}
        <p><span class="font-semibold">Lifecycle:</span> <span style="color: ${color}">${company.lifecycleStage}</span></p>
        ${company.phase ? `<p><span class="font-semibold">Phase:</span> ${company.phase}${ailoCustomer ? '<span class="ml-1 text-green-600 text-xs">(Ailo Customer)</span>' : ''}</p>` : ''}
        ${company.pum > 0 ? `<p><span class="font-semibold">PUM:</span> ${company.pum.toLocaleString()}</p>` : ''}
        ${company.territory ? `<p><span class="font-semibold">Territory:</span> ${company.territory}</p>` : ''}
        ${company.domain ? `<p><span class="font-semibold">Domain:</span> <a href="https://${company.domain}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${company.domain}</a></p>` : ''}
        ${isPostcodeFallback ? '<p class="text-amber-600 text-xs mt-1">* Location approximate (postcode centroid)</p>' : ''}
      </div>
      <div class="mt-3 pt-2 border-t border-gray-200">
        <a href="${company.hubspotUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors">
          Open in HubSpot
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  `;
}

export default function CompanyLayer({
  companies,
  selectedState,
  visible,
  isViewMode = false,
}: CompanyLayerProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const dimmedLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter companies
  const { visibleCompanies, dimmedCompanies } = useMemo(() => {
    const visible: CompanyData[] = [];
    const dimmed: CompanyData[] = [];

    companies.forEach((company) => {
      if (company.lat === null || company.long === null) return;

      if (isViewMode) {
        visible.push(company);
      } else if (selectedState === 'ALL') {
        visible.push(company);
      } else if (company.state === selectedState) {
        visible.push(company);
      } else {
        dimmed.push(company);
      }
    });

    return { visibleCompanies: visible, dimmedCompanies: dimmed };
  }, [companies, selectedState, isViewMode]);

  // Create and manage the marker cluster group
  useEffect(() => {
    if (!visible) {
      // Remove existing layers when not visible
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
      if (dimmedLayerRef.current) {
        map.removeLayer(dimmedLayerRef.current);
        dimmedLayerRef.current = null;
      }
      return;
    }

    // Create cluster group if it doesn't exist
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 15,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 'small';
          let className = 'marker-cluster-small';

          if (count >= 100) {
            size = 'large';
            className = 'marker-cluster-large';
          } else if (count >= 10) {
            size = 'medium';
            className = 'marker-cluster-medium';
          }

          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster ${className}`,
            iconSize: L.point(40, 40),
          });
        },
      });
      map.addLayer(clusterGroupRef.current);
    }

    // Create dimmed layer for admin mode
    if (!dimmedLayerRef.current && !isViewMode) {
      dimmedLayerRef.current = L.layerGroup();
      map.addLayer(dimmedLayerRef.current);
    }

    // Clear existing markers
    clusterGroupRef.current.clearLayers();
    if (dimmedLayerRef.current) {
      dimmedLayerRef.current.clearLayers();
    }

    // Add visible company markers to cluster group
    const markers: L.CircleMarker[] = [];
    visibleCompanies.forEach((company) => {
      const color = getLifecycleColor(company.lifecycleStage);
      const isPostcodeFallback = company.coordSource === 'postcode';

      const marker = L.circleMarker([company.lat!, company.long!], {
        radius: isViewMode ? 8 : 7,
        fillColor: color,
        fillOpacity: 0.85,
        color: isPostcodeFallback ? '#000' : color,
        weight: isPostcodeFallback ? 2 : 1.5,
        dashArray: isPostcodeFallback ? '3,3' : undefined,
      });

      marker.bindPopup(generatePopupContent(company), {
        maxWidth: 300,
        className: 'company-popup',
      });

      markers.push(marker);
    });

    clusterGroupRef.current.addLayers(markers);

    // Add dimmed markers (admin mode only, not clustered)
    if (dimmedLayerRef.current && !isViewMode) {
      dimmedCompanies.forEach((company) => {
        const marker = L.circleMarker([company.lat!, company.long!], {
          radius: 4,
          fillColor: '#d1d5db',
          fillOpacity: 0.2,
          color: '#d1d5db',
          weight: 1,
          opacity: 0.3,
        });
        dimmedLayerRef.current!.addLayer(marker);
      });
    }

    // Cleanup function
    return () => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
      }
      if (dimmedLayerRef.current) {
        dimmedLayerRef.current.clearLayers();
      }
    };
  }, [map, visible, visibleCompanies, dimmedCompanies, isViewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
      if (dimmedLayerRef.current) {
        map.removeLayer(dimmedLayerRef.current);
      }
    };
  }, [map]);

  return null;
}
