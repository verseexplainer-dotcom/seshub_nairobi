import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath } from '@/lib/auth-utils';
import { getSessionContext, redirectToAccount, redirectToLogin } from '@/lib/server-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const ALLOWED_ROLES = new Set(['customer', 'staff', 'admin']);

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const session = await getSessionContext(context);

  if (!session.user) {
    return redirectToLogin(context.request);
  }

  if (!session.isAdmin) {
    return redirectToAccount(context.request, 'Only admins can change roles.');
  }

  if (session.user.id === context.params.id) {
    return redirectToAccount(context.request, 'You cannot change your own role from this screen.');
  }

  const formData = await context.request.formData();
  const role = String(formData.get('role') || '').trim();
  const redirectTo = getSafeRedirectPath(formData.get('redirect_to'), '/admin/users');

  if (!ALLOWED_ROLES.has(role)) {
    return Response.redirect(
      new URL(
        buildPathWithMessage(redirectTo, {
          error: 'Invalid role selected.'
        }),
        context.request.url
      ),
      303
    );
  }

  const adminSupabase = createAdminSupabaseClient(context.locals);
  const { error } = await adminSupabase
    .from('profiles')
    .update({ role })
    .eq('user_id', context.params.id);

  return Response.redirect(
    new URL(
      buildPathWithMessage(redirectTo, {
        [error ? 'error' : 'message']:
          error?.message || 'User role updated.'
      }),
      context.request.url
    ),
    303
  );
};
