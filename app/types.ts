export interface PostcodeData {
  postcode: string;
  localities: string[];
  state: string;
  lat: number;
  long: number;
  sa3name: string;
  sa4name: string;
  territory: string | null;
}

export interface PostcodeStore {
  postcodes: Record<string, PostcodeData>;
  stats: {
    total: number;
    assigned: number;
    unassigned: number;
  };
}

export interface RawCSVRow {
  postcode: string;
  locality: string;
  state: string;
  lat: string;
  long: string;
  sa3name: string;
  sa4name: string;
}

export interface Territory {
  id: string;
  name: string;
  color: string;
}

export interface AssignmentResult {
  assigned: string[];
  skipped: { postcode: string; currentTerritory: string }[];
  reassigned: { postcode: string; from: string; to: string }[];
  outsideState?: string[];
}

// Assignment modes for territory drawing
export type AssignmentMode = 'fill-unassigned' | 'take-over' | 'expand-existing';

export const ASSIGNMENT_MODES: { value: AssignmentMode; label: string; description: string }[] = [
  {
    value: 'fill-unassigned',
    label: 'Fill unassigned only',
    description: 'Only assign postcodes that have no territory',
  },
  {
    value: 'take-over',
    label: 'Take over all postcodes',
    description: 'Reassign all postcodes regardless of current assignment',
  },
  {
    value: 'expand-existing',
    label: 'Expand existing territory',
    description: 'Add unassigned postcodes to a selected territory',
  },
];

// Color palette for auto-assigning to new territories
export const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Dark Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

export const UNASSIGNED_COLOR = '#9CA3AF';

// Helper to get territory color by territory name
export function getTerritoryColor(
  territoryName: string | null,
  territories: Record<string, Territory>
): string {
  if (!territoryName) return UNASSIGNED_COLOR;
  // Find territory by name
  const territory = Object.values(territories).find((t) => t.name === territoryName);
  return territory ? territory.color : UNASSIGNED_COLOR;
}

// Saved state interface for localStorage persistence
export interface SavedTerritoryState {
  territories: Record<string, Territory>;
  postcodeAssignments: Record<string, string>; // postcode key -> territory id
}

// Australian states
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT' | 'ALL';

export const AUSTRALIAN_STATES: { code: AustralianState; name: string }[] = [
  { code: 'ALL', name: 'All States' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'ACT', name: 'Australian Capital Territory' },
];

export const STATE_BOUNDS: Record<AustralianState, { center: [number, number]; zoom: number }> = {
  NSW: { center: [-32.0, 147.0], zoom: 6 },
  VIC: { center: [-37.0, 144.5], zoom: 7 },
  QLD: { center: [-22.0, 145.0], zoom: 5 },
  SA: { center: [-30.0, 136.0], zoom: 5 },
  WA: { center: [-25.0, 122.0], zoom: 5 },
  TAS: { center: [-42.0, 146.5], zoom: 7 },
  NT: { center: [-19.5, 133.0], zoom: 5 },
  ACT: { center: [-35.3, 149.1], zoom: 10 },
  ALL: { center: [-28.0, 134.0], zoom: 4 },
};

// Company/HubSpot types
export type CoordSource = 'hubspot' | 'geocoded' | 'postcode' | 'missing';

export type LifecycleStage =
  | 'Target'
  | 'Lead'
  | 'MQL'
  | 'SQL'
  | 'Opportunity'
  | 'Customer'
  | 'Evangelist'
  | 'Other';

export interface CompanyData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  lat: number | null;
  long: number | null;
  owner: string;
  lifecycleStage: LifecycleStage;
  domain: string;
  phase: string;
  pum: number;
  hubspotUrl: string;
  coordSource: CoordSource;
  territory: string | null;
}

export interface TerritoryPUMStats {
  pum: number;
  companyCount: number;
}

export interface PUMSummary {
  byTerritory: Record<string, TerritoryPUMStats>;
  unassigned: TerritoryPUMStats;
  total: TerritoryPUMStats;
}

export interface CompanyStore {
  companies: Record<string, CompanyData>;
  stats: {
    total: number;
    withCoords: number;
    missingCoords: number;
    byLifecycle: Record<LifecycleStage, number>;
  };
}

export interface RawCompanyCSVRow {
  'Record ID': string;
  'Company name': string;
  'Street Address': string;
  'City': string;
  'State/Region (AU)': string;
  'Postal Code': string;
  'Latitude': string;
  'Longitude': string;
  'Company owner': string;
  'Lifecycle Stage': string;
  'Company Domain Name': string;
  'Phase': string;
  'Estimated PUM': string;
}

export const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
  Target: '#6B7280',      // Gray
  Lead: '#3B82F6',        // Blue
  MQL: '#8B5CF6',         // Purple
  SQL: '#EC4899',         // Pink
  Opportunity: '#F59E0B', // Amber
  Customer: '#22C55E',    // Green
  Evangelist: '#14B8A6',  // Teal
  Other: '#9CA3AF',       // Light Gray
};

export function getLifecycleColor(stage: LifecycleStage): string {
  return LIFECYCLE_COLORS[stage] || LIFECYCLE_COLORS.Other;
}

// App Mode types
export type AppMode = 'view' | 'admin';

// Company filter types
export type AiloCustomerFilter = 'all' | 'customers' | 'non-customers';

export interface CompanyFilters {
  owners: string[];
  stages: LifecycleStage[];
  ailoCustomer: AiloCustomerFilter;
  minPUM: number | null;
  maxPUM: number | null;
  search: string;
}

export const DEFAULT_COMPANY_FILTERS: CompanyFilters = {
  owners: [],
  stages: [],
  ailoCustomer: 'all',
  minPUM: null,
  maxPUM: null,
  search: '',
};

// Phases that indicate an agency is an Ailo customer
const CUSTOMER_PHASES = ['Onboarding', 'Maturity', 'Handover', 'Adoption'];

// Check if a company is an Ailo customer based on phase
export function isAiloCustomer(company: CompanyData): boolean {
  const phase = company.phase?.trim();
  if (!phase) return false;
  return CUSTOMER_PHASES.includes(phase);
}

// Filter companies based on filter criteria
export function filterCompanies(
  companies: Record<string, CompanyData>,
  filters: CompanyFilters,
  selectedState: AustralianState
): CompanyData[] {
  return Object.values(companies).filter((company) => {
    // State filter
    if (selectedState !== 'ALL' && company.state !== selectedState) {
      return false;
    }

    // Owner filter
    if (filters.owners.length > 0 && !filters.owners.includes(company.owner)) {
      return false;
    }

    // Lifecycle stage filter
    if (filters.stages.length > 0 && !filters.stages.includes(company.lifecycleStage)) {
      return false;
    }

    // Ailo customer filter
    if (filters.ailoCustomer === 'customers' && !isAiloCustomer(company)) {
      return false;
    }
    if (filters.ailoCustomer === 'non-customers' && isAiloCustomer(company)) {
      return false;
    }

    // PUM range filter
    const pum = company.pum || 0;
    if (filters.minPUM !== null && pum < filters.minPUM) return false;
    if (filters.maxPUM !== null && pum > filters.maxPUM) return false;

    // Company name search
    if (
      filters.search &&
      !company.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    return true;
  });
}

// Area analysis types
export interface AreaAnalysisResult {
  companies: CompanyData[];
  totalPUM: number;
  companyCount: number;
  byStage: Record<string, { count: number; pum: number }>;
  byOwner: Record<string, { count: number; pum: number }>;
}

// Compliance Zone types
export interface ComplianceZone {
  id: string;
  polygon: number[][]; // Array of [lng, lat] coordinates
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceStats {
  companyCount: number;
  totalPUM: number;
}
