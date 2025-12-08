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
  assigned: _assigned,
  unassigned,
  territories,
  territoryCounts,
  selectedState,
}: StatsPanelProps) {
  // Note: assigned is part of the interface but we display unassigned instead
  void _assigned;
  const territoryList = Object.values(territories).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-[#F5F5F7] border border-[#E5E5E5] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 bg-[#1A1A2E] px-3 py-1 rounded-full">
          <span className="font-medium text-white">State:</span>
          <span className="text-[#EE0B4F] font-semibold">{selectedState}</span>
        </div>
        <div className="h-4 w-px bg-[#E5E5E5]" />
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#6B7280]">Total:</span>
          <span className="text-[#1A1A2E] font-semibold">{total.toLocaleString()}</span>
        </div>
        <div className="h-4 w-px bg-[#E5E5E5]" />
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#6B7280]">Unassigned:</span>
          <span className="text-[#1A1A2E] font-semibold">{unassigned.toLocaleString()}</span>
        </div>
        {territoryList.length > 0 && <div className="h-4 w-px bg-[#E5E5E5]" />}
        {territoryList.map((territory) => {
          const count = territoryCounts[territory.name] || 0;
          return (
            <div key={territory.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: territory.color }}
              />
              <span className="font-medium" style={{ color: territory.color }}>
                {territory.name}:
              </span>
              <span className="text-[#1A1A2E] font-semibold">{count.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
