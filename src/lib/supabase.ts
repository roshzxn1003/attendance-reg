import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// ----------------------------------------------------------------
// Supabase Configuration
// Defaults to the active SPIHER project credentials (public anon key)
// Can be overridden via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
// ----------------------------------------------------------------

const DEFAULT_SUPABASE_URL = 'https://ebkionwzcfisqcmxlkpp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVia2lvbnd6Y2Zpc3FjbXhsa3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIwNzgsImV4cCI6MjEwMjc5ODA3OH0.cNAumUWeXPBgasdhNtGBysqGHNiC_Lf-ClU-FZwpVdk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

/**
 * Returns true when Supabase credentials are configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes('placeholder')
  );
};

/**
 * Typed Supabase client for all database operations.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
