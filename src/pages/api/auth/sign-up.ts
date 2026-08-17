import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { ensureUserProfile } from '../../../lib/server-auth';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

function buildUserMetadata(fullName: string, phone: string, defaultLocation: string) {
  return {
    full_name: fullName,
    phone: phone || null,
    default_location: defaultLocation || null
  };
}

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const defaultLocation = String(formData.get('default_location') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirm_password') || '');
  const next = getSafeRedirectPath(formData.get('next'), '/account');

  if (!fullName || !email || password.length < 8 || password !== confirmPassword) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/sign-up', {
        error: 'Enter your name and email, then use matching passwords of at least 8 characters.',
        next
      })
    );
  }

  const callbackUrl = new URL('/api/auth/callback', context.request.url);
  callbackUrl.searchParams.set('type', 'signup');
  callbackUrl.searchParams.set('next', next);

  const supabase = createServerSupabaseClient(context);
  const userMetadata = buildUserMetadata(fullName, phone, defaultLocation);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: absoluteUrl(context.request, callbackUrl.pathname + callbackUrl.search),
      data: userMetadata
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

  // Supabase deliberately returns an obfuscated user for an existing confirmed
  // account when email confirmation is enabled. An empty identities array is the
  // documented signal that no new identity was created.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/login', {
        message: 'An account already exists for this email. Sign in or reset your password.',
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
