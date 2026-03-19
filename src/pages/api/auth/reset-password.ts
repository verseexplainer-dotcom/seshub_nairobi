import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage } from '../../../lib/auth-utils';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = String(formData.get('email') || '').trim();

  if (!email) {
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/reset-password', {
          error: 'Enter the email address tied to your account.'
        }),
        context.request.url
      ),
      303
    );
  }

  const supabase = createServerSupabaseClient(context);
  const redirectTo = absoluteUrl(
    context.request,
    '/auth/callback?next=/auth/reset-password'
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  return Response.redirect(
    new URL(
      buildPathWithMessage('/auth/reset-password', {
        [error ? 'error' : 'message']:
          error?.message || 'Check your email for the password reset link.'
      }),
      context.request.url
    ),
    303
  );
};
