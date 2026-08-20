import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// ----------------------------------------------------------------
// Environment variable validation
// Both variables must come from VITE_ prefixed env vars.
// The anon key is safe for frontend use — it is restricted by RLS.
// NEVER use service_role key in frontend code.
// ----------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Returns true only when both required env vars are set
 * and appear to be real Supabase values (not placeholders).
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20
  );
};

// Fallback dummy credentials to prevent @supabase/supabase-js from throwing on module import
const validUrl = isSupabaseConfigured() ? supabaseUrl! : 'https://placeholder.supabase.co';
const validKey = isSupabaseConfigured()
  ? supabaseAnonKey!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_offline_preview_only_not_secret';

/**
 * Typed Supabase client.
 * Uses safe fallback so frontend never crashes on initialization if env vars are not set.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  validUrl,
  validKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
