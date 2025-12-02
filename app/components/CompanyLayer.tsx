'use client';

import { CircleMarker, Popup } from 'react-leaflet';
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

export default function CompanyLayer({
  companies,
  selectedState,
  visible,
  isViewMode = false,
}: CompanyLayerProps) {
  if (!visible) return null;

  // In view mode, companies are already filtered, so we just filter by coordinates
  // In admin mode, we also need to filter by state
  const visibleCompanies = companies.filter((company) => {
    // Must have valid coordinates
    if (company.lat === null || company.long === null) return false;
    // In view mode, companies are pre-filtered by state
    // In admin mode, filter by state here
    if (!isViewMode && selectedState !== 'ALL' && company.state !== selectedState) {
      return false;
    }
    return true;
  });

  // Only show dimmed companies in admin mode
  const dimmedCompanies = isViewMode
    ? []
    : companies.filter((company) => {
        if (company.lat === null || company.long === null) return false;
        if (selectedState === 'ALL') return false;
        return company.state !== selectedState;
      });

  return (
    <>
      {/* Render dimmed companies from other states (admin mode only) */}
      {dimmedCompanies.map((company) => (
        <CircleMarker
          key={`dim-company-${company.id}`}
          center={[company.lat!, company.long!]}
          radius={4}
          pathOptions={{
            fillColor: '#d1d5db',
            fillOpacity: 0.2,
            color: '#d1d5db',
            weight: 1,
            opacity: 0.3,
          }}
        />
      ))}

      {/* Render visible companies */}
      {visibleCompanies.map((company) => {
        const color = getLifecycleColor(company.lifecycleStage);
        const isPostcodeFallback = company.coordSource === 'postcode';
        const ailoCustomer = isAiloCustomer(company);

        return (
          <CircleMarker
            key={`company-${company.id}`}
            center={[company.lat!, company.long!]}
            radius={isViewMode ? 8 : 7}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.85,
              color: isPostcodeFallback ? '#000' : color,
              weight: isPostcodeFallback ? 2 : 1.5,
              dashArray: isPostcodeFallback ? '3,3' : undefined,
            }}
          >
            <Popup>
              <div className="text-sm min-w-[220px]">
                <p className="font-bold text-base mb-1">{company.name}</p>
                <div className="space-y-1 text-gray-700">
                  {company.address && (
                    <p>
                      <span className="font-semibold">Address:</span> {company.address}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Location:</span> {company.city}, {company.state} {company.postcode}
                  </p>
                  {company.owner && (
                    <p>
                      <span className="font-semibold">Owner:</span> {company.owner}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Lifecycle:</span>{' '}
                    <span style={{ color }}>{company.lifecycleStage}</span>
                  </p>
                  {company.phase && (
                    <p>
                      <span className="font-semibold">Phase:</span> {company.phase}
                      {ailoCustomer && (
                        <span className="ml-1 text-green-600 text-xs">(Ailo Customer)</span>
                      )}
                    </p>
                  )}
                  {company.pum > 0 && (
                    <p>
                      <span className="font-semibold">PUM:</span> {company.pum.toLocaleString()}
                    </p>
                  )}
                  {company.territory && (
                    <p>
                      <span className="font-semibold">Territory:</span> {company.territory}
                    </p>
                  )}
                  {company.domain && (
                    <p>
                      <span className="font-semibold">Domain:</span>{' '}
                      <a
                        href={`https://${company.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.domain}
                      </a>
                    </p>
                  )}
                  {isPostcodeFallback && (
                    <p className="text-amber-600 text-xs mt-1">
                      * Location approximate (postcode centroid)
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <a
                    href={company.hubspotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition-colors"
                  >
                    Open in HubSpot
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
