'use client';

import { AreaAnalysisResult, LIFECYCLE_COLORS, LifecycleStage } from '../types';

interface AreaAnalysisPanelProps {
  result: AreaAnalysisResult | null;
  isAnalyzing: boolean;
  onClear: () => void;
}

export default function AreaAnalysisPanel({
  result,
  isAnalyzing,
  onClear,
}: AreaAnalysisPanelProps) {
  if (!result && !isAnalyzing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-sm font-medium">Draw a polygon on the map</p>
          <p className="text-xs mt-1">Use the polygon tool to analyze companies in an area</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-600">Analyzing area...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const stageEntries = Object.entries(result.byStage).sort(
    (a, b) => b[1].pum - a[1].pum
  );
  const ownerEntries = Object.entries(result.byOwner).sort(
    (a, b) => b[1].pum - a[1].pum
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Area Analysis</h3>
        <button
          onClick={onClear}
          className="text-white/80 hover:text-white text-xs underline"
        >
          Clear
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-blue-600">Companies:</span>{' '}
              <span className="font-bold text-blue-800">{result.companyCount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-600">Total PUM:</span>{' '}
              <span className="font-bold text-blue-800">{result.totalPUM.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* By Lifecycle Stage */}
        {stageEntries.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">By Lifecycle Stage</h4>
            <div className="space-y-1.5">
              {stageEntries.map(([stage, data]) => {
                const color = LIFECYCLE_COLORS[stage as LifecycleStage] || '#6b7280';
                const percentage = result.totalPUM > 0
                  ? Math.round((data.pum / result.totalPUM) * 100)
                  : 0;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-700 flex-1 truncate">{stage}</span>
                    <span className="text-xs text-gray-500">{data.count}</span>
                    <span className="text-xs font-medium text-gray-800 w-16 text-right">
                      {data.pum.toLocaleString()} PUM
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By Owner */}
        {ownerEntries.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">By Owner</h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {ownerEntries.map(([owner, data]) => {
                const percentage = result.totalPUM > 0
                  ? Math.round((data.pum / result.totalPUM) * 100)
                  : 0;
                return (
                  <div key={owner} className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 flex-1 truncate">{owner || 'Unassigned'}</span>
                    <span className="text-xs text-gray-500">{data.count}</span>
                    <span className="text-xs font-medium text-gray-800 w-16 text-right">
                      {data.pum.toLocaleString()} PUM
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Company List Toggle */}
        {result.companies.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
              Show all {result.companies.length} companies
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {result.companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center gap-2 p-1.5 bg-gray-50 rounded"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: LIFECYCLE_COLORS[company.lifecycleStage] || '#6b7280' }}
                  />
                  <span className="flex-1 truncate">{company.name}</span>
                  <span className="text-gray-500">{company.pum.toLocaleString()} PUM</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
