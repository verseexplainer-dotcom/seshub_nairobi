import type { RuntimeEnv, SessionLocals } from './app-types';

type RuntimeSource = {
  locals?: SessionLocals | null;
} | SessionLocals | null | undefined;

type PublicSupabaseEnvSource = Partial<RuntimeEnv> | null | undefined;

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolvePublicSupabaseUrl(env: PublicSupabaseEnvSource) {
  return trimEnvValue(env?.PUBLIC_SUPABASE_URL) ?? trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_URL);
}

export function resolvePublicSupabaseAnonKey(env: PublicSupabaseEnvSource) {
  return (
    trimEnvValue(env?.PUBLIC_SUPABASE_ANON_KEY) ??
    trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ??
    trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getBuildRuntimeEnv(): RuntimeEnv {
  const env = import.meta.env as Partial<RuntimeEnv>;

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env),
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env),
    NEXT_PUBLIC_SUPABASE_URL: trimEnvValue(env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: trimEnvValue(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: trimEnvValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: trimEnvValue(env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

export function getRuntimeEnv(source?: RuntimeSource): RuntimeEnv {
  let locals: SessionLocals | undefined;

  if (source && 'locals' in source) {
    locals = source.locals ?? undefined;
  } else {
    locals = source as SessionLocals | undefined;
  }

  const env = locals?.runtime?.env;
  const buildEnv = getBuildRuntimeEnv();

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env) ?? buildEnv.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env) ?? buildEnv.PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_URL) ?? buildEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ?? buildEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      trimEnvValue(env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? buildEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: trimEnvValue(env?.SUPABASE_SERVICE_ROLE_KEY) ?? buildEnv.SUPABASE_SERVICE_ROLE_KEY
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
