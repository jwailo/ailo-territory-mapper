'use client';

import {
  PUMSummary,
  Territory,
  AustralianState,
} from '../types';
import { formatPUM } from '../utils/pumCalculations';

interface PUMStatsPanelProps {
  pumSummary: PUMSummary;
  territories: Record<string, Territory>;
  selectedState: AustralianState;
}

export default function PUMStatsPanel({
  pumSummary,
  territories,
  selectedState,
}: PUMStatsPanelProps) {
  const stateLabel = selectedState === 'ALL' ? 'All States' : selectedState;
  const territoryList = Object.values(territories).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2">
        <h3 className="text-white font-semibold text-sm">
          Territory PUM Summary ({stateLabel})
        </h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Territory rows */}
        <div className="space-y-2">
          {territoryList.map((territory) => {
            const stats = pumSummary.byTerritory[territory.name];

            return (
              <div
                key={territory.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: territory.color }}
                  />
                  <span className="font-medium" style={{ color: territory.color }}>
                    {territory.name}:
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {formatPUM(stats?.pum || 0)} PUM
                  </span>
                  <span className="text-gray-500 text-xs w-24 text-right">
                    ({stats?.companyCount || 0} companies)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show message if no territories */}
        {territoryList.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            No territories created yet.
          </p>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-gray-200" />

        {/* Unassigned */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#9CA3AF' }}
            />
            <span className="font-medium text-gray-500">Unassigned:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-600 tabular-nums">
              {formatPUM(pumSummary.unassigned.pum)} PUM
            </span>
            <span className="text-gray-500 text-xs w-24 text-right">
              ({pumSummary.unassigned.companyCount} companies)
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-800">TOTAL:</span>
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-900 tabular-nums">
                {formatPUM(pumSummary.total.pum)} PUM
              </span>
              <span className="text-gray-600 text-xs w-24 text-right">
                ({pumSummary.total.companyCount} companies)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
