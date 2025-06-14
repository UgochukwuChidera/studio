
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// #############################################################################
// # SUPABASE CLIENT INITIALIZATION                                            #
// # This application uses Supabase as its backend.                            #
// #############################################################################

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase anonymous key is not defined. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
}

// Explicitly configure auth options, though these are defaults for Supabase JS v2
// This makes the intent clear and guards against potential future default changes.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Use localStorage in browser
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Utility to check if localStorage is available
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const testKey = '__supabase_localstorage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
