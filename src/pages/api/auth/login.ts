import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath } from '../../../lib/auth-utils';
import { ensureUserProfile } from '../../../lib/server-auth';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = getSafeRedirectPath(formData.get('next'), '/account');
  const supabase = createServerSupabaseClient(context);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/login', {
          error: error?.message || 'Unable to sign in.',
          next
        }),
        context.request.url
      ),
      303
    );
  }

  const profile = await ensureUserProfile(supabase, data.user);

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/login', {
          error: 'Your account is inactive. Contact support for access.',
          next
        }),
        context.request.url
      ),
      303
    );
  }

  const destination =
    next === '/account' && (profile?.role === 'staff' || profile?.role === 'admin')
      ? '/admin'
      : next;

  return Response.redirect(new URL(destination, context.request.url), 303);
};
