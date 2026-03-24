import { createClient } from '@supabase/supabase-js';
import { getBuildRuntimeEnv } from './runtime';

const { PUBLIC_SUPABASE_URL: supabaseUrl, PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } = getBuildRuntimeEnv();
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const clientUrl = supabaseUrl ?? 'https://invalid.supabase.local';
const clientAnonKey = supabaseAnonKey ?? 'invalid-key';

if (!hasSupabaseConfig) {
    console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(
  clientUrl,
  clientAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export const isSupabaseConfigured = hasSupabaseConfig;
