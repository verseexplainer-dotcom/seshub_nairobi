import type { APIRoute } from 'astro';
import { buildPathWithMessage } from '../../../lib/auth-utils';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const newPassword = String(formData.get('new_password') || '');
  const confirmPassword = String(formData.get('confirm_password') || '');

  if (newPassword.length < 8 || newPassword !== confirmPassword) {
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/reset-password', {
          error: 'Passwords must match and contain at least 8 characters.'
        }),
        context.request.url
      ),
      303
    );
  }

  const supabase = createServerSupabaseClient(context);
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  return Response.redirect(
    new URL(
      buildPathWithMessage(error ? '/auth/reset-password' : '/account/profile', {
        [error ? 'error' : 'message']:
          error?.message || 'Password updated successfully.'
      }),
      context.request.url
    ),
    303
  );
};
