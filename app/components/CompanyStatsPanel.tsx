'use client';

import {
  LifecycleStage,
  LIFECYCLE_COLORS,
  CoordSource,
  AustralianState,
} from '../types';

interface CompanyStatsPanelProps {
  total: number;
  withCoords: number;
  missingCoords: number;
  byLifecycle: Record<LifecycleStage, number>;
  byCoordSource: Record<CoordSource, number>;
  selectedState: AustralianState;
}

const LIFECYCLE_ORDER: LifecycleStage[] = [
  'Target',
  'Lead',
  'MQL',
  'SQL',
  'Opportunity',
  'Customer',
  'Evangelist',
  'Other',
];

export default function CompanyStatsPanel({
  total,
  withCoords,
  missingCoords,
  byLifecycle,
  byCoordSource,
  selectedState,
}: CompanyStatsPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
          <span className="font-semibold text-orange-700">Companies</span>
          <span className="text-orange-900 font-medium">
            {selectedState === 'ALL' ? 'All States' : selectedState}
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Total:</span>
          <span className="text-gray-900">{total.toLocaleString()}</span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-green-600">Mapped:</span>
          <span className="text-gray-900">{withCoords.toLocaleString()}</span>
        </div>
        {missingCoords > 0 && (
          <>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-red-500">Missing:</span>
              <span className="text-gray-900">{missingCoords.toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="h-4 w-px bg-gray-300" />
        {LIFECYCLE_ORDER.map((stage) => {
          const count = byLifecycle[stage] || 0;
          if (count === 0) return null;
          return (
            <div key={stage} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: LIFECYCLE_COLORS[stage] }}
              />
              <span className="font-semibold" style={{ color: LIFECYCLE_COLORS[stage] }}>
                {stage}:
              </span>
              <span className="text-gray-900">{count.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      {byCoordSource.postcode > 0 && (
        <div className="mt-2 text-center text-xs text-amber-600">
          {byCoordSource.postcode} companies using postcode centroid for location
        </div>
      )}
    </div>
  );
}
