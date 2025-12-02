'use client';

import { AustralianState, AUSTRALIAN_STATES } from '../types';

interface StateSelectorProps {
  selectedState: AustralianState;
  onSelect: (state: AustralianState) => void;
}

export default function StateSelector({ selectedState, onSelect }: StateSelectorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select State
      </label>
      <select
        value={selectedState}
        onChange={(e) => onSelect(e.target.value as AustralianState)}
        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {AUSTRALIAN_STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name} ({state.code})
          </option>
        ))}
      </select>
      {selectedState !== 'ALL' && (
        <p className="mt-2 text-xs text-gray-500">
          Polygon assignments will only affect {selectedState} postcodes
        </p>
      )}
    </div>
  );
}
