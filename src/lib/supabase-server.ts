import type { SessionLocals } from './app-types';
import { createServerClient } from '@supabase/ssr';
import { getRuntimeEnv, requireRuntimeValue } from './runtime';

type CookieValue = {
  value: string;
};

type CookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
  httpOnly?: boolean;
  domain?: string;
  encode?: (value: string) => string;
  partitioned?: boolean;
};

type CookieStore = {
  get(name: string): CookieValue | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: CookieOptions): void;
};

type ServerClientContext = {
  request: Request;
  cookies: CookieStore;
  locals?: SessionLocals | null;
};

function listCookieCandidates(key: string) {
  return [key, ...Array.from({ length: 5 }, (_, index) => `${key}.${index}`)];
}

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) {
        return null;
      }

      return {
        name: part.slice(0, separatorIndex),
        value: part.slice(separatorIndex + 1)
      };
    })
    .filter((entry): entry is { name: string; value: string } => Boolean(entry));
}

export function createServerSupabaseClient(context: ServerClientContext) {
  const env = getRuntimeEnv(context.locals);
  const supabaseUrl = requireRuntimeValue(env, 'PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireRuntimeValue(env, 'PUBLIC_SUPABASE_ANON_KEY');
  const isSecure = new URL(context.request.url).protocol === 'https:';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: isSecure
    },
    cookies: {
      getAll(keyHints: string[] = []) {
        if (keyHints.length === 0) {
          return parseCookieHeader(context.request.headers.get('cookie') || '');
        }

        const names = [...new Set(keyHints.flatMap((key) => listCookieCandidates(key)))];
        return names.flatMap((name) => {
          const cookie = context.cookies.get(name);
          return cookie ? [{ name, value: cookie.value }] : [];
        });
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          if (!cookie.value || cookie.options?.maxAge === 0) {
            context.cookies.delete(cookie.name, cookie.options);
            continue;
          }

          context.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      }
    }
  });
}
