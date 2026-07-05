/**
 * supabaseClient.js
 * -----------------
 * Single Supabase client instance for the entire application.
 *
 * ARCHITECTURE RULE: Only this file and context/AuthContext.jsx may
 * import from this module. All other data access goes through services/*.
 *
 * Environment variables are injected by Vite at build time from .env:
 *   VITE_SUPABASE_URL      — your project URL
 *   VITE_SUPABASE_ANON_KEY — public anon key (safe for browser)
 *
 * Never use the service-role key on the frontend.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Guard: fail loudly at startup if env vars are missing,
// so the developer knows immediately rather than getting
// cryptic network errors later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Shanjive Tex] Missing Supabase environment variables.\n' +
    'Create a .env file in the project root with:\n' +
    '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    'See .env.example for reference.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage so the user stays logged in
    // across browser refreshes and tab closes.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
