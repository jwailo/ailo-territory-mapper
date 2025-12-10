import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbCompany {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  owner: string | null;
  lifecycle_stage: string | null;
  domain: string | null;
  phase: string | null;
  pum: number | null;
  coord_source: string | null;
  hubspot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTerritory {
  id: string;
  name: string;
  colour: string;
  created_at: string;
  updated_at: string;
}

export interface DbPostcodeAssignment {
  postcode: string;
  territory_id: string;
  state: string;
  assigned_at: string;
}

export interface DbComplianceZone {
  id: string;
  polygon: number[][]; // Array of [lng, lat] coordinates
  created_at: string;
  updated_at: string;
}

// Analytics event types
export type ToolName = 'territory_map' | 'cost_calculator' | 'case_study_library' | 'admin' | 'aset_hub';
export type EventAction =
  | 'page_view'
  | 'tool_open'
  | 'button_click'
  | 'login'
  | 'logout'
  | 'user_created'
  | 'user_deleted'
  | 'password_reset';

export interface DbEvent {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  tool_name: ToolName;
  action: EventAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
