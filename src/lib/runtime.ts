import { env as cloudflareEnv } from 'cloudflare:workers';
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
  return trimEnvValue(env?.PUBLIC_SUPABASE_URL);
}

export function resolvePublicSupabaseAnonKey(env: PublicSupabaseEnvSource) {
  return trimEnvValue(env?.PUBLIC_SUPABASE_ANON_KEY);
}

export function getBuildRuntimeEnv(): RuntimeEnv {
  const env = import.meta.env as Partial<RuntimeEnv>;

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env),
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env),
    PUBLIC_FALLBACK_IMAGE_URL: trimEnvValue(env.PUBLIC_FALLBACK_IMAGE_URL),
    PUBLIC_TURNSTILE_SITE_KEY: trimEnvValue(env.PUBLIC_TURNSTILE_SITE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: trimEnvValue(env.SUPABASE_SERVICE_ROLE_KEY),
    TURNSTILE_SECRET_KEY: trimEnvValue(env.TURNSTILE_SECRET_KEY)
  };
}

export function getRuntimeEnv(source?: RuntimeSource): RuntimeEnv {
  void source;
  const env = cloudflareEnv as Partial<RuntimeEnv>;
  const buildEnv = getBuildRuntimeEnv();

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env) ?? buildEnv.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env) ?? buildEnv.PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_FALLBACK_IMAGE_URL: trimEnvValue(env?.PUBLIC_FALLBACK_IMAGE_URL) ?? buildEnv.PUBLIC_FALLBACK_IMAGE_URL,
    PUBLIC_TURNSTILE_SITE_KEY: trimEnvValue(env?.PUBLIC_TURNSTILE_SITE_KEY) ?? buildEnv.PUBLIC_TURNSTILE_SITE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: trimEnvValue(env?.SUPABASE_SERVICE_ROLE_KEY) ?? buildEnv.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: trimEnvValue(env?.TURNSTILE_SECRET_KEY) ?? buildEnv.TURNSTILE_SECRET_KEY
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
