'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CompanyData,
  CompanyFilters,
  LifecycleStage,
  AiloCustomerFilter,
  DEFAULT_COMPANY_FILTERS,
  LIFECYCLE_COLORS,
} from '../types';

interface ViewModeFiltersProps {
  companies: Record<string, CompanyData>;
  filters: CompanyFilters;
  onFiltersChange: (filters: CompanyFilters) => void;
  filteredCount: number;
  totalCount: number;
  filteredPUM: number;
}

export default function ViewModeFilters({
  companies,
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
  filteredPUM,
}: ViewModeFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Get unique owners and stages from companies
  const { owners, stages } = useMemo(() => {
    const ownerSet = new Set<string>();
    const stageSet = new Set<LifecycleStage>();

    Object.values(companies).forEach((c) => {
      if (c.owner) ownerSet.add(c.owner);
      if (c.lifecycleStage) stageSet.add(c.lifecycleStage);
    });

    return {
      owners: Array.from(ownerSet).sort(),
      stages: Array.from(stageSet).sort(),
    };
  }, [companies]);

  const handleOwnerToggle = (owner: string) => {
    const newOwners = filters.owners.includes(owner)
      ? filters.owners.filter((o) => o !== owner)
      : [...filters.owners, owner];
    onFiltersChange({ ...filters, owners: newOwners });
  };

  const handleStageToggle = (stage: LifecycleStage) => {
    const newStages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage];
    onFiltersChange({ ...filters, stages: newStages });
  };

  const handleAiloCustomerChange = (value: AiloCustomerFilter) => {
    onFiltersChange({ ...filters, ailoCustomer: value });
  };

  const handleMinPUMChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    onFiltersChange({ ...filters, minPUM: isNaN(num as number) ? null : num });
  };

  const handleMaxPUMChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    onFiltersChange({ ...filters, maxPUM: isNaN(num as number) ? null : num });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFiltersChange(DEFAULT_COMPANY_FILTERS);
  };

  const hasActiveFilters =
    filters.owners.length > 0 ||
    filters.stages.length > 0 ||
    filters.ailoCustomer !== 'all' ||
    filters.minPUM !== null ||
    filters.maxPUM !== null ||
    filters.search !== '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Company Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-white/80 hover:text-white text-xs underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Results Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-sm text-blue-800">
            Showing{' '}
            <span className="font-bold">{filteredCount.toLocaleString()}</span>{' '}
            of {totalCount.toLocaleString()} companies |{' '}
            <span className="font-bold">Total PUM: {filteredPUM.toLocaleString()}</span>
          </p>
        </div>

        {/* Company Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Search Company
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Owner Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Owner ({filters.owners.length > 0 ? filters.owners.length : 'All'})
          </label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {owners.map((owner) => {
              const isSelected = filters.owners.includes(owner);
              return (
                <button
                  key={owner}
                  onClick={() => handleOwnerToggle(owner)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {owner}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lifecycle Stage Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Lifecycle Stage ({filters.stages.length > 0 ? filters.stages.length : 'All'})
          </label>
          <div className="flex flex-wrap gap-1">
            {stages.map((stage) => {
              const isSelected = filters.stages.includes(stage);
              const color = LIFECYCLE_COLORS[stage];
              return (
                <button
                  key={stage}
                  onClick={() => handleStageToggle(stage)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors border ${
                    isSelected
                      ? 'border-transparent text-white'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : undefined,
                    color: isSelected ? 'white' : color,
                  }}
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ailo Customer Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Ailo Customer Status
          </label>
          <div className="flex gap-1">
            {[
              { value: 'all' as AiloCustomerFilter, label: 'All' },
              { value: 'customers' as AiloCustomerFilter, label: 'Customers Only' },
              { value: 'non-customers' as AiloCustomerFilter, label: 'Non-Customers' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleAiloCustomerChange(option.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  filters.ailoCustomer === option.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* PUM Range Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            PUM Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.minPUM ?? ''}
              onChange={(e) => handleMinPUMChange(e.target.value)}
              placeholder="Min"
              className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="number"
              value={filters.maxPUM ?? ''}
              onChange={(e) => handleMaxPUMChange(e.target.value)}
              placeholder="Max"
              className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
