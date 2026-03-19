import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath } from '@/lib/auth-utils';
import { getSessionContext, redirectToAccount, redirectToLogin } from '@/lib/server-auth';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const session = await getSessionContext(context);

  if (!session.user) {
    return redirectToLogin(context.request);
  }

  if (!session.isAdmin) {
    return redirectToAccount(context.request, 'Only admins can activate or deactivate users.');
  }

  if (session.user.id === context.params.id) {
    return redirectToAccount(context.request, 'You cannot deactivate your own account from this screen.');
  }

  const formData = await context.request.formData();
  const isActive = String(formData.get('is_active') || 'true') === 'true';
  const redirectTo = getSafeRedirectPath(formData.get('redirect_to'), '/admin/users');
  const adminSupabase = createAdminSupabaseClient(context.locals);

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('user_id', context.params.id);

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    context.params.id || '',
    {
      ban_duration: isActive ? 'none' : '876000h'
    }
  );

  const failure = profileError || authError;

  return Response.redirect(
    new URL(
      buildPathWithMessage(redirectTo, {
        [failure ? 'error' : 'message']:
          failure?.message || `User ${isActive ? 'reactivated' : 'deactivated'}.`
      }),
      context.request.url
    ),
    303
  );
};
