import type { SessionLocals } from './app-types';
import { createClient } from '@supabase/supabase-js';
import { getRuntimeEnv, requireRuntimeValue } from './runtime';

export function createAdminSupabaseClient(source?: { locals?: SessionLocals | null } | SessionLocals | null) {
  const env = getRuntimeEnv(source);
  const supabaseUrl = requireRuntimeValue(env, 'PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireRuntimeValue(env, 'SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
