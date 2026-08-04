import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Anon key is safe to embed — it is a public key by design (Supabase docs).
// Environment variable injection does not work reliably on Expo web, so the
// live values are used as hard-coded defaults.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gqgxahqmndkaeyuvhliv.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ3hhaHFtbmRrYWV5dXZobGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzczNjIsImV4cCI6MjA5NzM1MzM2Mn0.EVuPdC3L_eFrCAGKVCDYPpuuSUiNXOvAkBf-Uc5NqyM';

// Exported for call sites that need the raw project URL rather than a
// supabase-js call — e.g. constructing Supabase Auth API calls directly.
export const SUPABASE_URL = supabaseUrl;

// Base URL for browser-facing Edge Functions (currently just paygate-redirect
// — the page that has to render as real HTML for a user's browser, not JSON).
// Supabase's default *.supabase.co domain rewrites text/html Edge Function
// responses to text/plain (a documented anti-abuse restriction, confirmed by
// a Supabase maintainer: https://github.com/orgs/supabase/discussions/29633),
// so this points at the project's custom domain instead. Falls back to the
// default functions base if the env var isn't set, so nothing breaks before
// the custom domain is configured or if it's ever rolled back.
// Trailing slash stripped so callers can safely append `/function-name`
// without risking a doubled slash.
const rawPublicFunctionsUrl =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? `${supabaseUrl}/functions/v1`;
export const PUBLIC_FUNCTIONS_URL = rawPublicFunctionsUrl.replace(/\/+$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co';
