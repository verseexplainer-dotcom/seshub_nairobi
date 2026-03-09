import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '').trim();
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
    console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : 'https://invalid.supabase.local',
  hasSupabaseConfig ? supabaseAnonKey : 'invalid-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export const isSupabaseConfigured = hasSupabaseConfig;
