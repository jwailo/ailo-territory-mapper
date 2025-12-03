'use client';

import { useState } from 'react';
import { Territory, COLOR_PALETTE } from '../types';
import { getNextColor } from '../utils/territoryManagement';

interface TerritoryManagementPanelProps {
  territories: Record<string, Territory>;
  territoryCounts: Record<string, number>;
  onCreateTerritory: (name: string, color: string) => void;
  onUpdateTerritory: (id: string, updates: { name?: string; color?: string }) => void;
  onDeleteTerritory: (id: string) => void;
}

export default function TerritoryManagementPanel({
  territories,
  territoryCounts,
  onCreateTerritory,
  onUpdateTerritory,
  onDeleteTerritory,
}: TerritoryManagementPanelProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) {
      setError('Please enter a territory name');
      return;
    }

    try {
      const color = newColor || getNextColor(territories);
      onCreateTerritory(newName.trim(), color);
      setNewName('');
      setNewColor(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStartEdit = (territory: Territory) => {
    setEditingId(territory.id);
    setEditName(territory.name);
    setEditColor(territory.color);
    setError(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    if (!editName.trim()) {
      setError('Territory name cannot be empty');
      return;
    }

    try {
      onUpdateTerritory(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const handleDelete = (id: string, name: string) => {
    const count = territoryCounts[name] || 0;
    const message = count > 0
      ? `Delete "${name}"? This will unassign ${count} postcode${count !== 1 ? 's' : ''}.`
      : `Delete "${name}"?`;

    if (confirm(message)) {
      onDeleteTerritory(id);
    }
  };

  const territoryList = Object.values(territories).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#2D2D3A] px-4 py-2">
        <h3 className="text-white font-semibold text-sm">Manage Territories</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-[#FEE2E8] border border-[#EF4444] border-l-4 text-[#EF4444] px-3 py-2 rounded text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Create New Territory */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Add New Territory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Territory name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="relative">
              <input
                type="color"
                value={newColor || getNextColor(territories)}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                title="Pick a color"
              />
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#EE0B4F] text-white rounded-md text-sm font-medium hover:bg-[#c4093f] transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {COLOR_PALETTE.map((color) => {
              const isUsed = Object.values(territories).some((t) => t.color === color);
              return (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newColor === color
                      ? 'border-gray-900 scale-110'
                      : isUsed
                      ? 'border-gray-300 opacity-40'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  title={isUsed ? 'Color already in use' : 'Select color'}
                />
              );
            })}
          </div>
        </div>

        {/* Existing Territories */}
        {territoryList.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Existing Territories ({territoryList.length})
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {territoryList.map((territory) => {
                const count = territoryCounts[territory.name] || 0;
                const isEditing = editingId === territory.id;

                if (isEditing) {
                  return (
                    <div
                      key={territory.id}
                      className="flex items-center gap-2 p-2 bg-[#F5F5F7] border border-[#E5E5E5] rounded-md"
                    >
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#EE0B4F]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 bg-[#22C55E] text-white rounded text-xs font-medium hover:bg-[#16A34A]"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-gray-400 text-white rounded text-xs font-medium hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={territory.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: territory.color }}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {territory.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {count} postcode{count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => handleStartEdit(territory)}
                      className="px-2 py-1 text-[#EE0B4F] hover:bg-[#FEE2E8] rounded text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(territory.id, territory.name)}
                      className="px-2 py-1 text-[#EF4444] hover:bg-[#FEE2E8] rounded text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {territoryList.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No territories yet. Create one above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
