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
