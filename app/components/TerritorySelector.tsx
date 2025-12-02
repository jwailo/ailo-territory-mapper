'use client';

import { Territory } from '../types';

interface TerritorySelectorProps {
  territories: Record<string, Territory>;
  selectedTerritory: Territory | null;
  onSelect: (territory: Territory) => void;
}

export default function TerritorySelector({
  territories,
  selectedTerritory,
  onSelect,
}: TerritorySelectorProps) {
  const territoryList = Object.values(territories).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Territory to Assign
      </label>
      {territoryList.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {territoryList.map((territory) => {
              const isSelected = selectedTerritory?.id === territory.id;
              return (
                <button
                  key={territory.id}
                  onClick={() => onSelect(territory)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                    transition-all duration-150
                    ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-gray-900 bg-gray-100'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: territory.color }}
                  />
                  {territory.name}
                </button>
              );
            })}
          </div>
          {selectedTerritory && (
            <p className="mt-3 text-sm text-gray-600">
              Draw a polygon on the map to assign postcodes to{' '}
              <span className="font-semibold" style={{ color: selectedTerritory.color }}>
                {selectedTerritory.name}
              </span>
            </p>
          )}
          {!selectedTerritory && (
            <p className="mt-3 text-sm text-gray-500">
              Select a territory above, then draw a polygon on the map
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">
          No territories created yet. Use the Manage Territories panel to create one.
        </p>
      )}
    </div>
  );
}
