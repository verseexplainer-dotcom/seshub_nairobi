import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage, redirectResponse } from '../../../lib/auth-utils';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = String(formData.get('email') || '').trim();

  if (!email) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/reset-password', {
        error: 'Enter the email address tied to your account.'
      })
    );
  }

  const supabase = createServerSupabaseClient(context);
  const redirectTo = absoluteUrl(
    context.request,
    '/api/auth/callback?type=recovery&next=/auth/reset-password'
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  return redirectResponse(
    context.request,
    buildPathWithMessage('/auth/reset-password', {
      [error ? 'error' : 'message']:
        error?.message || 'If an account exists for that email, we sent a password reset link.'
    })
  );
};
