import type { User } from '@supabase/supabase-js';
import type { ProfileRecord, SessionLocals } from './app-types';
import { applyBootstrapAdminAccess, getEffectiveUserRole } from './admin-access';
import { buildPathWithMessage, getSafeRedirectPath, redirectResponse } from './auth-utils';
import { createServerSupabaseClient } from './supabase-server';

type SessionContextInput = {
  request: Request;
  cookies: {
    get(name: string): { value: string } | undefined;
    set(name: string, value: string, options?: Record<string, unknown>): void;
    delete(name: string, options?: Record<string, unknown>): void;
  };
  locals?: SessionLocals | null;
};

function profileSeedFromUser(user: User) {
  return {
    user_id: user.id,
    full_name:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null,
    phone:
      typeof user.user_metadata?.phone === 'string'
        ? user.user_metadata.phone
        : null,
    default_location:
      typeof user.user_metadata?.default_location === 'string'
        ? user.user_metadata.default_location
        : null
  };
}

export async function ensureUserProfile(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  user: User
) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  if (existingProfile) {
    return applyBootstrapAdminAccess(user.email, existingProfile);
  }

  const seed = profileSeedFromUser(user);
  const { data: insertedProfile } = await supabase
    .from('profiles')
    .insert(seed)
    .select('*')
    .single<ProfileRecord>();

  if (insertedProfile) {
    return applyBootstrapAdminAccess(user.email, insertedProfile);
  }

  const { data: fallbackProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  return applyBootstrapAdminAccess(user.email, fallbackProfile ?? null);
}

export async function getSessionContext(input: SessionContextInput) {
  const supabase = createServerSupabaseClient(input);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      supabase,
      user: null,
      profile: null,
      isStaff: false,
      isAdmin: false
    };
  }

  const profile = await ensureUserProfile(supabase, data.user);
  const role = getEffectiveUserRole(data.user.email, profile?.role);

  return {
    supabase,
    user: data.user,
    profile,
    isStaff: role === 'staff' || role === 'admin',
    isAdmin: role === 'admin'
  };
}

export function redirectToLogin(request: Request) {
  const currentUrl = new URL(request.url);
  const next = `${currentUrl.pathname}${currentUrl.search}`;
  const destination = buildPathWithMessage('/auth/login', {
    next: getSafeRedirectPath(next, '/account')
  });

  return redirectResponse(request, destination);
}

export function redirectToAccount(request: Request, error: string) {
  const destination = buildPathWithMessage('/account', { error });
  return redirectResponse(request, destination);
}
