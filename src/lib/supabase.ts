import { createClient } from '@supabase/supabase-js';
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

/**
 * Typed Supabase client.
 * Falls back to empty strings (fails safely) if env vars are missing —
 * the isSupabaseConfigured() guard should be checked before any query.
 */
export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
