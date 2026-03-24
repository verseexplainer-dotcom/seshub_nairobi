import { createBrowserClient } from '@supabase/ssr';
import { getBuildRuntimeEnv } from './runtime';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  const { PUBLIC_SUPABASE_URL: supabaseUrl, PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } = getBuildRuntimeEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser credentials are missing.');
  }

  browserClient ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
