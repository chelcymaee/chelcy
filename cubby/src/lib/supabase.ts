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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co';
