'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  FeatureGroup,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import {
  PostcodeStore,
  Territory,
  getTerritoryColor,
  AssignmentResult,
  PostcodeData,
  AustralianState,
  STATE_BOUNDS,
  CompanyData,
  AppMode,
  AssignmentMode,
  AreaAnalysisResult,
  ComplianceZone,
  PostcodeBoundaryStore,
} from '../types';
import { getPostcodesInPolygon, assignPostcodes } from '../utils/territoryAssignment';
import { getCompaniesInPolygon, analyzeArea } from '../utils/areaAnalysis';
import CompanyLayer from './CompanyLayer';
import ComplianceZoneLayer from './ComplianceZoneLayer';
import ComplianceDrawControl from './ComplianceDrawControl';
import TerritoryPolygonLayer from './TerritoryPolygonLayer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Target location for location search
export interface TargetLocation {
  lat: number;
  lng: number;
  zoom: number;
  label: string;
}

interface MapProps {
  data: PostcodeStore;
  territories: Record<string, Territory>;
  boundaries: PostcodeBoundaryStore;
  selectedTerritory: Territory | null;
  selectedState: AustralianState;
  clickToAssign: boolean;
  showUnassignedOnly: boolean;
  showCompanies: boolean;
  companies: Record<string, CompanyData>;
  filteredCompanies: CompanyData[];
  mode: AppMode;
  assignmentMode: AssignmentMode;
  // Location search target
  targetLocation?: TargetLocation | null;
  // Compliance zone props
  complianceZones: ComplianceZone[];
  showComplianceZones: boolean;
  complianceDrawEnabled: boolean;
  onComplianceZoneCreated: (polygon: number[][]) => void;
  onComplianceZoneDeleted: (zoneId: string) => void;
  // Callbacks
  onAssignment: (result: AssignmentResult) => void;
  onClickAssign: (postcode: PostcodeData) => void;
  onAreaAnalysis: (result: AreaAnalysisResult | null) => void;
}

// Component to handle map view changes when state changes
function MapViewController({ selectedState }: { selectedState: AustralianState }) {
  const map = useMap();

  useEffect(() => {
    const bounds = STATE_BOUNDS[selectedState];
    map.setView(bounds.center, bounds.zoom);
  }, [selectedState, map]);

  return null;
}

// Component to fly to a target location from search
function FlyToLocation({ targetLocation }: { targetLocation: TargetLocation | null | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom, {
        duration: 1,
      });
    }
  }, [targetLocation, map]);

  return null;
}

// Component to handle map resize when layout changes
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount to ensure proper initial rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Handle window resize
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    // Also listen for visibility changes (e.g., tab switching)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => map.invalidateSize(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Use ResizeObserver to detect container size changes
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

interface DrawControlProps {
  selectedTerritory: Territory | null;
  selectedState: AustralianState;
  postcodes: PostcodeStore['postcodes'];
  assignmentMode: AssignmentMode;
  onAssignment: (result: AssignmentResult) => void;
  enabled: boolean;
}

function DrawControl({
  selectedTerritory,
  selectedState,
  postcodes,
  assignmentMode,
  onAssignment,
  enabled,
}: DrawControlProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const handleCreated = (e: L.DrawEvents.Created) => {
    if (!selectedTerritory) {
      alert('Please select a territory first');
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
      return;
    }

    const layer = e.layer as L.Polygon;
    const latLngs = layer.getLatLngs()[0] as L.LatLng[];

    const postcodeIds = getPostcodesInPolygon(latLngs, postcodes);
    const result = assignPostcodes(
      postcodeIds,
      selectedTerritory.name,
      postcodes,
      selectedState,
      assignmentMode
    );

    onAssignment(result);

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
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
              color: selectedTerritory?.color || '#666',
              fillColor: selectedTerritory?.color || '#666',
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

// Analysis polygon draw control for view mode
interface AnalysisDrawControlProps {
  companies: CompanyData[];
  onAnalysis: (result: AreaAnalysisResult | null) => void;
  enabled: boolean;
}

function AnalysisDrawControl({
  companies,
  onAnalysis,
  enabled,
}: AnalysisDrawControlProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const handleCreated = (e: L.DrawEvents.Created) => {
    const layer = e.layer as L.Polygon;
    const latLngs = layer.getLatLngs()[0] as L.LatLng[];

    const foundCompanies = getCompaniesInPolygon(latLngs, companies);
    const result = analyzeArea(foundCompanies);

    onAnalysis(result);

    // Keep the polygon visible for reference (optional: could clear it)
    // If you want to clear: featureGroupRef.current?.clearLayers();
  };

  const handleDeleted = () => {
    onAnalysis(null);
  };

  if (!enabled) {
    return null;
  }

  return (
    <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
        onCreated={handleCreated}
        onDeleted={handleDeleted}
        draw={{
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#EE0B4F',       // Ailo pink border at 60% opacity
              fillColor: '#EE0B4F',   // Ailo pink fill at 20% opacity
              fillOpacity: 0.2,
              opacity: 0.6,
              dashArray: '5, 5',
            },
          },
        }}
        edit={{
          edit: false,
          remove: true,
        }}
      />
    </FeatureGroup>
  );
}

export default function Map({
  data,
  territories,
  boundaries,
  selectedTerritory,
  selectedState,
  clickToAssign,
  showUnassignedOnly,
  showCompanies,
  companies,
  filteredCompanies,
  mode,
  assignmentMode,
  targetLocation,
  complianceZones,
  showComplianceZones,
  complianceDrawEnabled,
  onComplianceZoneCreated,
  onComplianceZoneDeleted,
  onAssignment,
  onClickAssign,
  onAreaAnalysis,
}: MapProps) {
  const postcodeEntries = Object.values(data.postcodes);
  const isViewMode = mode === 'view';

  // Filter based on state and showUnassignedOnly
  const isInSelectedState = (pc: PostcodeData) =>
    selectedState === 'ALL' || pc.state === selectedState;

  const visiblePostcodes = postcodeEntries.filter((pc) => {
    if (!isInSelectedState(pc)) return false;
    if (showUnassignedOnly && pc.territory) return false;
    return true;
  });

  // Dimmed postcodes: either from other states, or assigned when showing unassigned only
  const dimmedPostcodes = postcodeEntries.filter((pc) => {
    // If from other state, show dimmed
    if (!isInSelectedState(pc)) return true;
    // If showing unassigned only and this is assigned, show dimmed
    if (showUnassignedOnly && pc.territory) return true;
    return false;
  });

  const handleMarkerClick = (postcode: PostcodeData) => {
    if (clickToAssign && selectedTerritory) {
      // Check if postcode is in selected state
      if (selectedState !== 'ALL' && postcode.state !== selectedState) {
        alert(`Cannot assign postcode from ${postcode.state} when ${selectedState} is selected`);
        return;
      }
      onClickAssign(postcode);
    }
  };

  const initialBounds = STATE_BOUNDS[selectedState];

  return (
    <MapContainer
      center={initialBounds.center}
      zoom={initialBounds.zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewController selectedState={selectedState} />
      <MapResizeHandler />
      <FlyToLocation targetLocation={targetLocation} />

      {/* Territory assignment draw control in admin mode (disabled when compliance draw is active) */}
      {!isViewMode && !complianceDrawEnabled && (
        <DrawControl
          selectedTerritory={selectedTerritory}
          selectedState={selectedState}
          postcodes={data.postcodes}
          assignmentMode={assignmentMode}
          onAssignment={onAssignment}
          enabled={true}
        />
      )}

      {/* Analysis polygon draw control in view mode */}
      <AnalysisDrawControl
        companies={filteredCompanies}
        onAnalysis={onAreaAnalysis}
        enabled={isViewMode}
      />

      {/* Compliance zone display layer */}
      <ComplianceZoneLayer
        zones={complianceZones}
        visible={showComplianceZones}
        isAdminMode={!isViewMode}
        onDeleteZone={onComplianceZoneDeleted}
      />

      {/* Compliance zone draw control in admin mode */}
      {complianceDrawEnabled && (
        <ComplianceDrawControl
          enabled={true}
          onZoneCreated={onComplianceZoneCreated}
        />
      )}

      {/* Territory polygon layer - render filled polygons for each territory */}
      <TerritoryPolygonLayer
        postcodes={data.postcodes}
        territories={territories}
        boundaries={boundaries}
        selectedState={selectedState}
        visible={!isViewMode}
      />

      {/* Only show postcodes in admin mode */}
      {!isViewMode && (
        <>
          {/* Render dimmed postcodes (other states or assigned when showing unassigned) */}
          {dimmedPostcodes.map((postcode) => {
            const color = getTerritoryColor(postcode.territory, territories);
            const isOtherState = !isInSelectedState(postcode);
            return (
              <CircleMarker
                key={`dim-${postcode.postcode}-${postcode.state}`}
                center={[postcode.lat, postcode.long]}
                radius={isOtherState ? 2 : 3}
                pathOptions={{
                  fillColor: isOtherState ? '#d1d5db' : color,
                  fillOpacity: isOtherState ? 0.1 : 0.15,
                  color: isOtherState ? '#d1d5db' : color,
                  weight: 0.5,
                  opacity: isOtherState ? 0.2 : 0.3,
                }}
              />
            );
          })}

          {/* Render main visible postcodes */}
          {visiblePostcodes.map((postcode) => {
            const color = getTerritoryColor(postcode.territory, territories);
            const isClickable = clickToAssign && selectedTerritory;

            return (
              <CircleMarker
                key={`${postcode.postcode}-${postcode.state}`}
                center={[postcode.lat, postcode.long]}
                radius={5}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.7,
                  color: color,
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(postcode),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">
                      Postcode: {postcode.postcode}{' '}
                      <span className="text-gray-500">({postcode.state})</span>
                    </p>
                    <p>
                      <span className="font-semibold">Localities:</span>{' '}
                      {postcode.localities.slice(0, 3).join(', ')}
                      {postcode.localities.length > 3 && '...'}
                    </p>
                    <p>
                      <span className="font-semibold">SA3:</span> {postcode.sa3name || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">SA4:</span> {postcode.sa4name || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">Territory:</span>{' '}
                      <span style={{ color: getTerritoryColor(postcode.territory, territories) }}>
                        {postcode.territory || 'Unassigned'}
                      </span>
                    </p>
                    {isClickable && (
                      <p className="mt-2 text-xs text-blue-600">
                        Click to assign to {selectedTerritory.name}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </>
      )}

      {/* Company layer - uses filtered companies in view mode, all companies in admin mode */}
      <CompanyLayer
        companies={isViewMode ? filteredCompanies : Object.values(companies)}
        selectedState={selectedState}
        visible={isViewMode || showCompanies}
        isViewMode={isViewMode}
      />
    </MapContainer>
  );
}
