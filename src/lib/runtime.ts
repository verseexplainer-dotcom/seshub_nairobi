import type { RuntimeEnv, SessionLocals } from './app-types';

type RuntimeSource = {
  locals?: SessionLocals | null;
} | SessionLocals | null | undefined;

export function getRuntimeEnv(source?: RuntimeSource): RuntimeEnv {
  let locals: SessionLocals | undefined;

  if (source && 'locals' in source) {
    locals = source.locals ?? undefined;
  } else {
    locals = source as SessionLocals | undefined;
  }

  const env = locals?.runtime?.env;

  return {
    PUBLIC_SUPABASE_URL:
      env?.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY:
      env?.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env?.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function requireRuntimeValue(
  env: RuntimeEnv,
  key: keyof RuntimeEnv
) {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required runtime value: ${key}`);
  }
  return value;
}
