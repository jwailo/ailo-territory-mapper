'use client';

import { useRef } from 'react';
import { Territory, PostcodeStore, AustralianState, CompanyData, SavedTerritoryState } from '../types';
import {
  exportTerritoryCSV,
  exportAllTerritoriesCSV,
  exportUnassignedCSV,
  exportHubSpotList,
  clearTerritory,
} from '../utils/exportUtils';
import {
  exportStateJSON,
  importStateJSON,
} from '../utils/territoryManagement';
import { exportMissingCoordsCSV } from '../utils/loadCompanies';
import { calculateStats } from '../utils/territoryAssignment';

interface ToolbarProps {
  data: PostcodeStore;
  territories: Record<string, Territory>;
  selectedTerritory: Territory | null;
  selectedState: AustralianState;
  clickToAssign: boolean;
  showUnassignedOnly: boolean;
  showCompanies: boolean;
  companies: Record<string, CompanyData>;
  companyMissingCount: number;
  onClickToAssignToggle: () => void;
  onShowUnassignedOnlyToggle: () => void;
  onShowCompaniesToggle: () => void;
  onClearTerritory: (territoryName: string, count: number) => void;
  onImportState: (state: SavedTerritoryState) => void;
}

export default function Toolbar({
  data,
  territories,
  selectedTerritory,
  selectedState,
  clickToAssign,
  showUnassignedOnly,
  showCompanies,
  companies,
  companyMissingCount,
  onClickToAssignToggle,
  onShowUnassignedOnlyToggle,
  onShowCompaniesToggle,
  onClearTerritory,
  onImportState,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearTerritory = () => {
    if (!selectedTerritory) {
      alert('Please select a territory first');
      return;
    }

    const stats = calculateStats(data.postcodes, selectedState);
    const count = stats.territoryCounts[selectedTerritory.name] || 0;

    if (count === 0) {
      const stateText = selectedState !== 'ALL' ? ` in ${selectedState}` : '';
      alert(`${selectedTerritory.name} has no assigned postcodes${stateText}`);
      return;
    }

    const stateText = selectedState !== 'ALL' ? ` in ${selectedState}` : '';
    if (
      confirm(
        `Are you sure you want to clear ${selectedTerritory.name}${stateText}? This will unassign ${count} postcodes.`
      )
    ) {
      const cleared = clearTerritory(data.postcodes, selectedTerritory.name, selectedState);
      onClearTerritory(selectedTerritory.name, cleared);
    }
  };

  const handleExportTerritory = () => {
    if (!selectedTerritory) {
      alert('Please select a territory first');
      return;
    }
    exportTerritoryCSV(data.postcodes, selectedTerritory.name);
  };

  const handleExportHubSpot = () => {
    if (!selectedTerritory) {
      alert('Please select a territory first');
      return;
    }
    exportHubSpotList(data.postcodes, selectedTerritory.name);
  };

  const handleExportUnassigned = () => {
    exportUnassignedCSV(data.postcodes, selectedState);
  };

  const handleExportState = () => {
    exportStateJSON(territories, data.postcodes);
  };

  const handleImportState = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const loadedState = await importStateJSON(file);
      onImportState(loadedState);
      alert('State imported successfully!');
    } catch (error) {
      alert('Failed to import state: ' + (error as Error).message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
      {/* Mode Toggles */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onClickToAssignToggle}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            clickToAssign
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {clickToAssign ? 'Click to Assign: ON' : 'Click to Assign: OFF'}
        </button>

        <button
          onClick={onShowUnassignedOnlyToggle}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showUnassignedOnly
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showUnassignedOnly ? 'Showing Unassigned Only' : 'Show All Postcodes'}
        </button>

        <button
          onClick={onShowCompaniesToggle}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showCompanies
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showCompanies ? 'Companies: ON' : 'Companies: OFF'}
        </button>

        <button
          onClick={handleClearTerritory}
          disabled={!selectedTerritory}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTerritory
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Clear {selectedTerritory?.name || 'Territory'}
          {selectedState !== 'ALL' ? ` (${selectedState})` : ''}
        </button>
      </div>

      {/* Export Options */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Export Options</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportTerritory}
            disabled={!selectedTerritory}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedTerritory
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Export {selectedTerritory?.name || 'Territory'} (CSV)
          </button>

          <button
            onClick={handleExportHubSpot}
            disabled={!selectedTerritory}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedTerritory
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            HubSpot List ({selectedTerritory?.name || 'Territory'})
          </button>

          <button
            onClick={() => exportAllTerritoriesCSV(data.postcodes)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Export All Territories (CSV)
          </button>

          <button
            onClick={handleExportUnassigned}
            className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Export Unassigned{selectedState !== 'ALL' ? ` (${selectedState})` : ''} (CSV)
          </button>

          {companyMissingCount > 0 && (
            <button
              onClick={() => exportMissingCoordsCSV(companies)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Export Missing Coords ({companyMissingCount})
            </button>
          )}
        </div>
      </div>

      {/* Save/Load State */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Save/Load State</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportState}
            className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          >
            Export State (JSON)
          </button>

          <label className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors cursor-pointer">
            Import State (JSON)
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportState}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
