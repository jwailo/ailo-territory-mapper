'use client';

import { Territory, AustralianState } from '../types';

interface StatsPanelProps {
  total: number;
  assigned: number;
  unassigned: number;
  territories: Record<string, Territory>;
  territoryCounts: Record<string, number>;
  selectedState: AustralianState;
}

export default function StatsPanel({
  total,
  assigned,
  unassigned,
  territories,
  territoryCounts,
  selectedState,
}: StatsPanelProps) {
  const territoryList = Object.values(territories).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
          <span className="font-semibold text-gray-700">State:</span>
          <span className="text-gray-900 font-medium">{selectedState}</span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Total:</span>
          <span className="text-gray-900">{total.toLocaleString()}</span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500">Unassigned:</span>
          <span className="text-gray-900">{unassigned.toLocaleString()}</span>
        </div>
        {territoryList.length > 0 && <div className="h-4 w-px bg-gray-300" />}
        {territoryList.map((territory) => {
          const count = territoryCounts[territory.name] || 0;
          return (
            <div key={territory.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: territory.color }}
              />
              <span className="font-semibold" style={{ color: territory.color }}>
                {territory.name}:
              </span>
              <span className="text-gray-900">{count.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
