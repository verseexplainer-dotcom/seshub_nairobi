import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { ensureUserProfile } from '../../../lib/server-auth';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const defaultLocation = String(formData.get('default_location') || '').trim();
  const password = String(formData.get('password') || '');
  const next = getSafeRedirectPath(formData.get('next'), '/account');

  if (!fullName || !email || password.length < 8) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/sign-up', {
        error: 'Name, email, and an 8 character password are required.',
        next
      })
    );
  }

  const callbackUrl = new URL('/api/auth/callback', context.request.url);
  callbackUrl.searchParams.set('next', next);

  const supabase = createServerSupabaseClient(context);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: absoluteUrl(context.request, callbackUrl.pathname + callbackUrl.search),
      data: {
        full_name: fullName,
        phone: phone || null,
        default_location: defaultLocation || null
      }
    }
  });

  if (error) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/sign-up', {
        error: error.message,
        next
      })
    );
  }

  if (data.user && data.session) {
    const profile = await ensureUserProfile(supabase, data.user);
    const destination =
      next === '/account' && (profile?.role === 'staff' || profile?.role === 'admin')
        ? '/admin'
        : next;

    return redirectResponse(context.request, destination);
  }

  return redirectResponse(
    context.request,
    buildPathWithMessage('/auth/login', {
      message: 'Check your email to confirm your account before signing in.',
      next
    })
  );
};
