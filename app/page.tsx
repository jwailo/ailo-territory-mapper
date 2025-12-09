'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { loadPostcodes } from './utils/loadPostcodes';
import { loadCompanies, calculateCompanyStats } from './utils/loadCompanies';
import { calculateStats } from './utils/territoryAssignment';
import {
  updateCompanyTerritories,
  calculateTerritoryPUM,
} from './utils/pumCalculations';
import {
  createTerritory,
  updateTerritory,
  deleteTerritory,
  saveToLocalStorage,
  loadFromLocalStorage,
  applyLoadedState,
} from './utils/territoryManagement';
import {
  loadTerritoriesFromSupabase,
  loadPostcodeAssignmentsFromSupabase,
  saveTerritoryToSupabase,
  updateTerritoryInSupabase,
  deleteTerritoryFromSupabase,
  savePostcodeAssignmentsToSupabase,
  clearPostcodeAssignmentsFromSupabase,
  loadComplianceZonesFromSupabase,
  saveComplianceZoneToSupabase,
  deleteComplianceZoneFromSupabase,
  cleanupCorruptedPostcodeAssignments,
} from './utils/supabaseData';
import {
  isSiteAuthenticated,
  isAdminAuthenticated,
  getCaseStudyUrl,
} from './utils/auth';
import {
  PostcodeStore,
  Territory,
  AssignmentResult,
  PostcodeData,
  AustralianState,
  CompanyStore,
  CompanyData,
  LifecycleStage,
  CoordSource,
  PUMSummary,
  SavedTerritoryState,
  AppMode,
  CompanyFilters,
  DEFAULT_COMPANY_FILTERS,
  filterCompanies,
  AssignmentMode,
  AreaAnalysisResult,
  ComplianceZone,
} from './types';
import StatsPanel from './components/StatsPanel';
import CompanyStatsPanel from './components/CompanyStatsPanel';
import PUMStatsPanel from './components/PUMStatsPanel';
import TerritorySelector from './components/TerritorySelector';
import TerritoryManagementPanel from './components/TerritoryManagementPanel';
import StateSelector from './components/StateSelector';
import Toolbar from './components/Toolbar';
import ModeToggle from './components/ModeToggle';
import ViewModeFilters from './components/ViewModeFilters';
import AssignmentModeSelector from './components/AssignmentModeSelector';
import AreaAnalysisPanel from './components/AreaAnalysisPanel';
import SiteLoginScreen from './components/SiteLoginScreen';
import AdminPasswordModal from './components/AdminPasswordModal';
import ComplianceStatsBar from './components/ComplianceStatsBar';
import LocationSearch from './components/LocationSearch';
import { TargetLocation } from './components/Map';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  // Authentication state
  const [siteAuthenticated, setSiteAuthenticated] = useState(false);
  const [adminAuthenticated, setAdminAuthenticatedState] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [data, setData] = useState<PostcodeStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [territories, setTerritories] = useState<Record<string, Territory>>({});
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedState, setSelectedState] = useState<AustralianState>('ALL');
  const [lastResult, setLastResult] = useState<AssignmentResult | null>(null);
  const [territoryCounts, setTerritoryCounts] = useState<Record<string, number>>({});
  const [clickToAssign, setClickToAssign] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);
  const [stateStats, setStateStats] = useState<{
    total: number;
    assigned: number;
    unassigned: number;
  }>({ total: 0, assigned: 0, unassigned: 0 });

  // App mode state
  const [appMode, setAppMode] = useState<AppMode>('view');
  const [companyFilters, setCompanyFilters] = useState<CompanyFilters>(DEFAULT_COMPANY_FILTERS);

  // Assignment mode state (admin mode)
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('fill-unassigned');

  // View mode analysis state
  const [areaAnalysisResult, setAreaAnalysisResult] = useState<AreaAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Compliance zone state
  const [complianceZones, setComplianceZones] = useState<ComplianceZone[]>([]);
  const [showComplianceZones, setShowComplianceZones] = useState(false);
  const [complianceDrawEnabled, setComplianceDrawEnabled] = useState(false);

  // Collapsible panel state
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Location search state
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);

  // Check authentication on mount
  useEffect(() => {
    setSiteAuthenticated(isSiteAuthenticated());
    setAdminAuthenticatedState(isAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  // Company state
  const [companyData, setCompanyData] = useState<CompanyStore | null>(null);
  const [showCompanies, setShowCompanies] = useState(true);
  const [companyStats, setCompanyStats] = useState<{
    total: number;
    withCoords: number;
    missingCoords: number;
    byLifecycle: Record<LifecycleStage, number>;
    byCoordSource: Record<CoordSource, number>;
  }>({
    total: 0,
    withCoords: 0,
    missingCoords: 0,
    byLifecycle: {
      Target: 0,
      Lead: 0,
      MQL: 0,
      SQL: 0,
      Opportunity: 0,
      Customer: 0,
      Evangelist: 0,
      Other: 0,
    },
    byCoordSource: {
      hubspot: 0,
      geocoded: 0,
      postcode: 0,
      missing: 0,
    },
  });

  // PUM summary state
  const [pumSummary, setPumSummary] = useState<PUMSummary>({
    byTerritory: {},
    unassigned: { pum: 0, companyCount: 0 },
    total: { pum: 0, companyCount: 0 },
  });

  // Filtered companies for view mode
  const filteredCompanies = useMemo(() => {
    if (!companyData) return [];
    return filterCompanies(companyData.companies, companyFilters, selectedState);
  }, [companyData, companyFilters, selectedState]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalCount = companyData
      ? Object.values(companyData.companies).filter(
          (c) => selectedState === 'ALL' || c.state === selectedState
        ).length
      : 0;
    const filteredPUM = filteredCompanies.reduce((sum, c) => sum + (c.pum || 0), 0);
    // Count companies that have valid coordinates (can be displayed on map)
    const mappableCount = filteredCompanies.filter(
      (c) => c.lat !== null && c.long !== null
    ).length;
    return {
      filteredCount: filteredCompanies.length,
      totalCount,
      filteredPUM,
      mappableCount,
    };
  }, [companyData, filteredCompanies, selectedState]);

  // Load data from Supabase (with localStorage fallback for territories)
  useEffect(() => {
    loadPostcodes()
      .then(async (result) => {
        // Try to load territories and assignments from Supabase first
        let loadedTerritories: Record<string, Territory> = {};
        let postcodeAssignments: Record<string, string> = {};

        try {
          // Run cleanup for corrupted postcode assignments (one-time fix)
          const cleanupResult = await cleanupCorruptedPostcodeAssignments();
          if (cleanupResult.fixed > 0) {
            console.log(`Cleanup: Fixed ${cleanupResult.fixed} corrupted postcode assignments`);
          }

          // Load from Supabase
          loadedTerritories = await loadTerritoriesFromSupabase();
          postcodeAssignments = await loadPostcodeAssignmentsFromSupabase();

          // Apply assignments to postcodes
          if (Object.keys(postcodeAssignments).length > 0) {
            let appliedCount = 0;
            let noMatchCount = 0;
            let noTerritoryCount = 0;

            // Log first few assignment keys to debug format
            const assignmentKeys = Object.keys(postcodeAssignments);
            console.log('Sample assignment keys:', JSON.stringify(assignmentKeys.slice(0, 10)));

            // Log first few postcode keys to compare format
            const postcodeKeys = Object.values(result.postcodes).slice(0, 10).map(p => `${p.postcode}-${p.state}`);
            console.log('Sample postcode keys:', JSON.stringify(postcodeKeys));

            // Find any matching key to debug
            const firstAssignmentKey = assignmentKeys[0];
            console.log('First assignment key details:', JSON.stringify({
              key: firstAssignmentKey,
              territoryId: postcodeAssignments[firstAssignmentKey]
            }));

            Object.values(result.postcodes).forEach((postcode) => {
              // Use postcode-state as composite key to match assignment lookup
              const postcodeKey = `${postcode.postcode}-${postcode.state}`;
              const territoryId = postcodeAssignments[postcodeKey];
              if (territoryId) {
                const territory = loadedTerritories[territoryId];
                if (territory) {
                  postcode.territory = territory.name;
                  appliedCount++;
                } else {
                  noTerritoryCount++;
                }
              } else {
                noMatchCount++;
              }
            });
            console.log(`Applied ${appliedCount} postcode assignments from Supabase (${noMatchCount} no match, ${noTerritoryCount} no territory)`);
          }

          console.log(`Loaded ${Object.keys(loadedTerritories).length} territories from Supabase`);
        } catch (err) {
          console.error('Error loading from Supabase, falling back to localStorage:', err);
        }

        // Fall back to localStorage if Supabase is empty
        if (Object.keys(loadedTerritories).length === 0) {
          const savedState = loadFromLocalStorage();
          if (savedState) {
            loadedTerritories = savedState.territories;
            applyLoadedState(savedState, result.postcodes);
            console.log('Loaded territories from localStorage');
          }
        }

        setTerritories(loadedTerritories);
        setData(result);

        // Try to load companies (will use postcode lookup for fallback)
        try {
          const companies = await loadCompanies(result.postcodes);
          setCompanyData(companies);
        } catch (err) {
          console.log('Company data not loaded:', err);
          // Companies are optional, so we don't set error
        }

        // Load compliance zones from Supabase
        try {
          const zones = await loadComplianceZonesFromSupabase();
          setComplianceZones(zones);
          console.log(`Loaded ${zones.length} compliance zones from Supabase`);
        } catch (err) {
          console.log('Compliance zones not loaded:', err);
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Save to localStorage whenever territories or postcode assignments change
  useEffect(() => {
    if (data && Object.keys(territories).length > 0) {
      saveToLocalStorage(territories, data.postcodes);
    }
  }, [territories, data, updateKey]);

  const updateStats = useCallback(() => {
    if (data) {
      const stats = calculateStats(data.postcodes, selectedState);
      setStateStats({
        total: stats.total,
        assigned: stats.assigned,
        unassigned: stats.unassigned,
      });
      setTerritoryCounts(stats.territoryCounts);
      setUpdateKey((k) => k + 1);

      // Update company territories and PUM when postcodes change
      if (companyData) {
        updateCompanyTerritories(data.postcodes, companyData.companies);
        const pumStats = calculateTerritoryPUM(companyData.companies, territories, selectedState);
        setPumSummary(pumStats);
      }
    }

    if (companyData) {
      const cStats = calculateCompanyStats(companyData.companies, selectedState);
      setCompanyStats(cStats);
    }
  }, [data, companyData, territories, selectedState]);

  // Update stats when state or territories change
  useEffect(() => {
    updateStats();
  }, [selectedState, territories, updateStats]);

  const handleAssignment = useCallback(
    async (result: AssignmentResult) => {
      setLastResult(result);
      updateStats();
      setTimeout(() => setLastResult(null), 5000);

      // Save assignments to Supabase
      if (selectedTerritory && data) {
        // Collect all postcodes that were assigned or reassigned
        const assignedPostcodes = [
          ...result.assigned,
          ...result.reassigned.map((r) => r.postcode),
        ];

        if (assignedPostcodes.length > 0) {
          // Group postcodes by state for Supabase
          const byState: Record<string, string[]> = {};
          for (const postcodeId of assignedPostcodes) {
            const postcodeData = data.postcodes[postcodeId];
            if (postcodeData) {
              const state = postcodeData.state;
              if (!byState[state]) byState[state] = [];
              byState[state].push(postcodeId);
            }
          }

          // Save each state group to Supabase
          for (const [state, postcodes] of Object.entries(byState)) {
            await savePostcodeAssignmentsToSupabase(
              postcodes,
              selectedTerritory.id,
              state
            );
          }
        }
      }
    },
    [updateStats, selectedTerritory, data]
  );

  const handleClickAssign = useCallback(
    async (postcode: PostcodeData) => {
      if (!selectedTerritory || !data) return;

      // Check if already assigned to a different territory
      if (postcode.territory && postcode.territory !== selectedTerritory.name) {
        const confirmed = confirm(
          `Reassign ${postcode.postcode} from ${postcode.territory} to ${selectedTerritory.name}?`
        );
        if (!confirmed) return;
      }

      // Assign the postcode
      postcode.territory = selectedTerritory.name;
      updateStats();

      // Save to Supabase
      await savePostcodeAssignmentsToSupabase(
        [postcode.postcode],
        selectedTerritory.id,
        postcode.state
      );

      setLastResult({
        assigned: [postcode.postcode],
        skipped: [],
        reassigned: [],
      });
      setTimeout(() => setLastResult(null), 3000);
    },
    [selectedTerritory, data, updateStats]
  );

  const handleAreaAnalysis = useCallback(
    (result: AreaAnalysisResult | null) => {
      setAreaAnalysisResult(result);
    },
    []
  );

  const handleClearTerritory = useCallback(
    async (territoryName: string, count: number) => {
      updateStats();
      setLastResult({
        assigned: [],
        skipped: [],
        reassigned: [],
      });

      // Find territory ID by name and clear from Supabase
      const territory = Object.values(territories).find((t) => t.name === territoryName);
      if (territory) {
        await clearPostcodeAssignmentsFromSupabase(
          territory.id,
          selectedState !== 'ALL' ? selectedState : undefined
        );
      }

      alert(`Cleared ${count} postcodes from ${territoryName}`);
    },
    [updateStats, territories, selectedState]
  );

  const handleCreateTerritory = useCallback(
    async (name: string, color: string) => {
      try {
        const result = createTerritory(name, territories, color);
        setTerritories(result.territories);

        // Save to Supabase
        await saveTerritoryToSupabase(result.newTerritory);
      } catch (err) {
        alert((err as Error).message);
      }
    },
    [territories]
  );

  const handleUpdateTerritory = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      if (!data) return;
      try {
        const result = updateTerritory(id, updates, territories, data.postcodes);
        setTerritories(result.territories);
        // If the selected territory was updated, update the selection
        if (selectedTerritory?.id === id) {
          setSelectedTerritory(result.territories[id]);
        }
        updateStats();

        // Update in Supabase
        await updateTerritoryInSupabase(result.territories[id]);
      } catch (err) {
        alert((err as Error).message);
      }
    },
    [territories, data, selectedTerritory, updateStats]
  );

  const handleDeleteTerritory = useCallback(
    async (id: string) => {
      if (!data) return;
      try {
        const result = deleteTerritory(id, territories, data.postcodes);
        setTerritories(result.territories);
        // If the selected territory was deleted, clear the selection
        if (selectedTerritory?.id === id) {
          setSelectedTerritory(null);
        }
        updateStats();

        // Delete from Supabase (this also clears postcode assignments)
        await deleteTerritoryFromSupabase(id);

        if (result.clearedCount > 0) {
          alert(`Territory deleted. Cleared ${result.clearedCount} postcode assignments.`);
        }
      } catch (err) {
        alert((err as Error).message);
      }
    },
    [territories, data, selectedTerritory, updateStats]
  );

  const handleImportState = useCallback(
    async (savedState: SavedTerritoryState) => {
      if (!data) return;
      setTerritories(savedState.territories);
      applyLoadedState(savedState, data.postcodes);
      updateStats();

      // Sync imported state to Supabase
      // Save all territories
      for (const territory of Object.values(savedState.territories)) {
        await saveTerritoryToSupabase(territory);
      }

      // Save all postcode assignments grouped by territory and state
      const assignmentsByTerritoryAndState: Record<string, Record<string, string[]>> = {};
      for (const [postcodeId, territoryId] of Object.entries(savedState.postcodeAssignments)) {
        const postcodeData = data.postcodes[postcodeId];
        if (postcodeData) {
          if (!assignmentsByTerritoryAndState[territoryId]) {
            assignmentsByTerritoryAndState[territoryId] = {};
          }
          const state = postcodeData.state;
          if (!assignmentsByTerritoryAndState[territoryId][state]) {
            assignmentsByTerritoryAndState[territoryId][state] = [];
          }
          assignmentsByTerritoryAndState[territoryId][state].push(postcodeId);
        }
      }

      // Save grouped assignments
      for (const [territoryId, byState] of Object.entries(assignmentsByTerritoryAndState)) {
        for (const [state, postcodes] of Object.entries(byState)) {
          await savePostcodeAssignmentsToSupabase(postcodes, territoryId, state);
        }
      }
    },
    [data, updateStats]
  );

  // Handle admin mode authentication and switching
  const handleAdminModeClick = useCallback(() => {
    setShowAdminModal(true);
  }, []);

  const handleAdminAuthenticated = useCallback(() => {
    setAdminAuthenticatedState(true);
    setAppMode('admin');
  }, []);

  const handleModeChange = useCallback((mode: AppMode) => {
    setAppMode(mode);
    // Disable compliance draw when switching modes
    setComplianceDrawEnabled(false);
  }, []);

  // Case Study Database handler
  const handleCaseStudyClick = useCallback(() => {
    const url = getCaseStudyUrl();
    window.location.href = url;
  }, []);

  // Location search handler
  const handleLocationSelect = useCallback((location: TargetLocation) => {
    setTargetLocation(location);
  }, []);

  // Compliance zone handlers
  const handleComplianceZoneCreated = useCallback(
    async (polygon: number[][]) => {
      const id = `cz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newZone: ComplianceZone = {
        id,
        polygon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to local state
      setComplianceZones((prev) => [...prev, newZone]);

      // Save to Supabase
      const success = await saveComplianceZoneToSupabase(id, polygon);
      if (!success) {
        alert('Failed to save compliance zone. Please try again.');
        setComplianceZones((prev) => prev.filter((z) => z.id !== id));
      }
    },
    []
  );

  const handleComplianceZoneDeleted = useCallback(
    async (zoneId: string) => {
      // Remove from local state
      setComplianceZones((prev) => prev.filter((z) => z.id !== zoneId));

      // Delete from Supabase
      const success = await deleteComplianceZoneFromSupabase(zoneId);
      if (!success) {
        alert('Failed to delete compliance zone from database.');
      }
    },
    []
  );

  // Initial stats calculation
  useEffect(() => {
    if (data) {
      const stats = calculateStats(data.postcodes, selectedState);
      setStateStats({
        total: stats.total,
        assigned: stats.assigned,
        unassigned: stats.unassigned,
      });
      setTerritoryCounts(stats.territoryCounts);

      // Update company territories and PUM
      if (companyData) {
        updateCompanyTerritories(data.postcodes, companyData.companies);
        const pumStats = calculateTerritoryPUM(companyData.companies, territories, selectedState);
        setPumSummary(pumStats);
      }
    }

    if (companyData) {
      const cStats = calculateCompanyStats(companyData.companies, selectedState);
      setCompanyStats(cStats);
    }
  }, [data, companyData, territories, selectedState]);

  // Show nothing while checking auth status
  if (!authChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A]">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!siteAuthenticated) {
    return <SiteLoginScreen onAuthenticated={() => setSiteAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p className="text-gray-500">Loading postcode data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const isViewMode = appMode === 'view';

  return (
    <>
      {/* Admin Password Modal - rendered outside main container for proper z-index */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onAuthenticated={handleAdminAuthenticated}
      />

      <div className="flex-col-layout">
        <header className="bg-[#1A1A2E] px-4 py-3 flex items-center justify-between flex-shrink-0">
        {/* ASET Logo - White version on dark header */}
        <img
          src="/ASET-White.png"
          alt="ASET - Ailo Sales Enablement Tool"
          style={{ height: '45px', width: 'auto' }}
        />
        <div className="flex items-center gap-3">
          {/* Case Study Database button */}
          <button
            onClick={handleCaseStudyClick}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Case Study Database
          </button>
          <ModeToggle
            mode={appMode}
            isAdminAuthenticated={adminAuthenticated}
            onModeChange={handleModeChange}
            onAdminClick={handleAdminModeClick}
          />
        </div>
      </header>

      {/* Collapsible Control Panel */}
      <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0">
        {/* Toggle Header */}
        <button
          onClick={() => setFiltersCollapsed(!filtersCollapsed)}
          className="w-full px-4 py-2 flex items-center justify-between bg-gradient-to-r from-[#EE0B4F] to-[#c4093f] text-white hover:brightness-110 transition-all"
        >
          <span className="font-semibold text-sm">
            {isViewMode ? 'Filters & Controls' : 'Territory Controls'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-80">
              {filtersCollapsed ? 'Click to expand' : 'Click to collapse'}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                filtersCollapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* Collapsible Content */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            filtersCollapsed ? 'max-h-0' : 'max-h-[1000px]'
          }`}
        >
          <div className="p-4 space-y-4">
            {/* State selector and Location Search are always visible */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <StateSelector selectedState={selectedState} onSelect={setSelectedState} />

              {/* Location Search - spans remaining columns on first row */}
              <div className="lg:col-span-3">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Search
                  </label>
                  <LocationSearch
                    postcodes={data.postcodes}
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search suburb, city, or postcode..."
                  />
                </div>
              </div>
            </div>

            {/* Mode-specific controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

              {/* View Mode: Show filters panel and analysis panel */}
              {isViewMode && companyData && (
                <>
                  <div className="lg:col-span-3">
                    <ViewModeFilters
                      companies={companyData.companies}
                      filters={companyFilters}
                      onFiltersChange={setCompanyFilters}
                      filteredCount={filteredStats.filteredCount}
                      totalCount={filteredStats.totalCount}
                      filteredPUM={filteredStats.filteredPUM}
                      mappableCount={filteredStats.mappableCount}
                    />
                  </div>
                  <div className="lg:col-span-1 space-y-3">
                    {/* Compliance Zones Toggle */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showComplianceZones}
                          onChange={(e) => setShowComplianceZones(e.target.checked)}
                          className="h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-300 rounded accent-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">Show Compliance Zones</span>
                          <p className="text-xs text-gray-500">
                            {complianceZones.length} zone{complianceZones.length !== 1 ? 's' : ''} defined
                          </p>
                        </div>
                      </label>
                    </div>
                    {/* Area Analysis Panel */}
                    <AreaAnalysisPanel
                      result={areaAnalysisResult}
                      isAnalyzing={isAnalyzing}
                      onClear={() => setAreaAnalysisResult(null)}
                    />
                  </div>
                </>
              )}

              {/* Admin Mode: Show territory controls */}
              {!isViewMode && (
                <>
                  <div className="lg:col-span-1">
                    <TerritorySelector
                      territories={territories}
                      selectedTerritory={selectedTerritory}
                      onSelect={setSelectedTerritory}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <TerritoryManagementPanel
                      territories={territories}
                      territoryCounts={territoryCounts}
                      onCreateTerritory={handleCreateTerritory}
                      onUpdateTerritory={handleUpdateTerritory}
                      onDeleteTerritory={handleDeleteTerritory}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Admin Mode: Show toolbar and assignment mode */}
            {!isViewMode && (
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <Toolbar
                    data={data}
                    territories={territories}
                    selectedTerritory={selectedTerritory}
                    selectedState={selectedState}
                    clickToAssign={clickToAssign}
                    showUnassignedOnly={showUnassignedOnly}
                    showCompanies={showCompanies}
                    companies={companyData?.companies || {}}
                    companyMissingCount={companyStats.missingCoords}
                    onClickToAssignToggle={() => setClickToAssign(!clickToAssign)}
                    onShowUnassignedOnlyToggle={() => setShowUnassignedOnly(!showUnassignedOnly)}
                    onShowCompaniesToggle={() => setShowCompanies(!showCompanies)}
                    onClearTerritory={handleClearTerritory}
                    onImportState={handleImportState}
                  />
                </div>
                <div className="w-72 flex-shrink-0">
                  <AssignmentModeSelector
                    mode={assignmentMode}
                    onModeChange={setAssignmentMode}
                  />
                </div>
                {/* Compliance Zones Tool */}
                <div className="w-64 flex-shrink-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Compliance Zones
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceDrawEnabled}
                        onChange={(e) => setComplianceDrawEnabled(e.target.checked)}
                        className="h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-300 rounded accent-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">Draw Compliance Zones</span>
                        <p className="text-xs text-gray-500">
                          {complianceZones.length} zone{complianceZones.length !== 1 ? 's' : ''} saved
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment result notification (admin mode only) */}
      {!isViewMode && lastResult && (lastResult.assigned.length > 0 || lastResult.skipped.length > 0 || lastResult.reassigned.length > 0 || (lastResult.outsideState?.length || 0) > 0) && (
        <div className="px-4 py-2 bg-red-50 border-b border-[#EE0B4F]/30 flex-shrink-0">
          <p className="text-sm text-[#EE0B4F]">
            {lastResult.assigned.length > 0 && (
              <span className="font-semibold">
                Assigned {lastResult.assigned.length} postcode
                {lastResult.assigned.length !== 1 ? 's' : ''}
              </span>
            )}
            {lastResult.reassigned.length > 0 && (
              <span className="text-purple-700">
                {lastResult.assigned.length > 0 ? ' | ' : ''}
                Reassigned {lastResult.reassigned.length} postcode
                {lastResult.reassigned.length !== 1 ? 's' : ''}
              </span>
            )}
            {lastResult.skipped.length > 0 && (
              <span className="text-amber-700">
                {(lastResult.assigned.length > 0 || lastResult.reassigned.length > 0) ? ' | ' : ''}
                Skipped {lastResult.skipped.length} (already assigned)
              </span>
            )}
            {(lastResult.outsideState?.length || 0) > 0 && (
              <span className="text-gray-500">
                {(lastResult.assigned.length > 0 || lastResult.reassigned.length > 0 || lastResult.skipped.length > 0) ? ' | ' : ''}
                Ignored {lastResult.outsideState?.length} (outside {selectedState})
              </span>
            )}
          </p>
        </div>
      )}

      <main className="flex-grow-map">
        <div className="map-wrapper">
        <Map
          key={updateKey}
          data={data}
          territories={territories}
          selectedTerritory={selectedTerritory}
          selectedState={selectedState}
          clickToAssign={clickToAssign}
          showUnassignedOnly={showUnassignedOnly}
          showCompanies={showCompanies}
          companies={companyData?.companies || {}}
          filteredCompanies={filteredCompanies}
          mode={appMode}
          assignmentMode={assignmentMode}
          targetLocation={targetLocation}
          complianceZones={complianceZones}
          showComplianceZones={showComplianceZones || complianceDrawEnabled}
          complianceDrawEnabled={complianceDrawEnabled}
          onComplianceZoneCreated={handleComplianceZoneCreated}
          onComplianceZoneDeleted={handleComplianceZoneDeleted}
          onAssignment={handleAssignment}
          onClickAssign={handleClickAssign}
          onAreaAnalysis={handleAreaAnalysis}
        />
        </div>
      </main>

      {/* Footer - only show in admin mode */}
      {!isViewMode && (
        <footer className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0 overflow-auto max-h-[40vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <StatsPanel
                total={stateStats.total}
                assigned={stateStats.assigned}
                unassigned={stateStats.unassigned}
                territories={territories}
                territoryCounts={territoryCounts}
                selectedState={selectedState}
              />
              {companyData && showCompanies && (
                <CompanyStatsPanel
                  total={companyStats.total}
                  withCoords={companyStats.withCoords}
                  missingCoords={companyStats.missingCoords}
                  byLifecycle={companyStats.byLifecycle}
                  byCoordSource={companyStats.byCoordSource}
                  selectedState={selectedState}
                />
              )}
            </div>
            {companyData && showCompanies && (
              <PUMStatsPanel
                pumSummary={pumSummary}
                territories={territories}
                selectedState={selectedState}
              />
            )}
          </div>
        </footer>
      )}

      {/* Compliance Stats Bar - View Mode only */}
      <ComplianceStatsBar
        companies={filteredCompanies}
        zones={complianceZones}
        visible={isViewMode && showComplianceZones}
      />
      </div>
    </>
  );
}
