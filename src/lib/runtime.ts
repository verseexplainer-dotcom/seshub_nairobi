import type { RuntimeEnv, SessionLocals } from './app-types';

type RuntimeSource = {
  locals?: SessionLocals | null;
} | SessionLocals | null | undefined;

type PublicSupabaseEnvSource = Partial<RuntimeEnv> | null | undefined;

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readRuntimeEnv(source?: RuntimeSource) {
  if (!source) {
    return {};
  }

  try {
    if ('locals' in source) {
      return source.locals?.runtime?.env ?? {};
    }

    return (source as SessionLocals).runtime?.env ?? {};
  } catch {
    return {};
  }
}

export function resolvePublicSupabaseUrl(env: PublicSupabaseEnvSource) {
  return trimEnvValue(env?.PUBLIC_SUPABASE_URL);
}

export function resolvePublicSupabaseAnonKey(env: PublicSupabaseEnvSource) {
  return trimEnvValue(env?.PUBLIC_SUPABASE_ANON_KEY);
}

export function getBuildRuntimeEnv(): RuntimeEnv {
  // Astro defines import.meta.env at build/runtime, while direct Node tests do
  // not. Treat the missing object as an empty build-time environment so the
  // Cloudflare runtime values remain the source of truth.
  const env = (import.meta.env ?? {}) as Partial<RuntimeEnv>;

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env),
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env),
    PUBLIC_FALLBACK_IMAGE_URL: trimEnvValue(env.PUBLIC_FALLBACK_IMAGE_URL),
    PUBLIC_TURNSTILE_SITE_KEY: trimEnvValue(env.PUBLIC_TURNSTILE_SITE_KEY),
    WHATSAPP_TOKEN: trimEnvValue(env.WHATSAPP_TOKEN),
    WHATSAPP_PHONE_NUMBER_ID: trimEnvValue(env.WHATSAPP_PHONE_NUMBER_ID),
    WHATSAPP_NOTIFY_TO: trimEnvValue(env.WHATSAPP_NOTIFY_TO),
    SUPABASE_SERVICE_ROLE_KEY: trimEnvValue(env.SUPABASE_SERVICE_ROLE_KEY),
    TURNSTILE_SECRET_KEY: trimEnvValue(env.TURNSTILE_SECRET_KEY)
  };
}

export function getRuntimeEnv(source?: RuntimeSource): RuntimeEnv {
  const env = readRuntimeEnv(source) as Partial<RuntimeEnv>;
  const buildEnv = getBuildRuntimeEnv();

  return {
    PUBLIC_SUPABASE_URL: resolvePublicSupabaseUrl(env) ?? buildEnv.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: resolvePublicSupabaseAnonKey(env) ?? buildEnv.PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_FALLBACK_IMAGE_URL: trimEnvValue(env?.PUBLIC_FALLBACK_IMAGE_URL) ?? buildEnv.PUBLIC_FALLBACK_IMAGE_URL,
    PUBLIC_TURNSTILE_SITE_KEY: trimEnvValue(env?.PUBLIC_TURNSTILE_SITE_KEY) ?? buildEnv.PUBLIC_TURNSTILE_SITE_KEY,
    WHATSAPP_TOKEN: trimEnvValue(env?.WHATSAPP_TOKEN) ?? buildEnv.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: trimEnvValue(env?.WHATSAPP_PHONE_NUMBER_ID) ?? buildEnv.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_NOTIFY_TO: trimEnvValue(env?.WHATSAPP_NOTIFY_TO) ?? buildEnv.WHATSAPP_NOTIFY_TO,
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
