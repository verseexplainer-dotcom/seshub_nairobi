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

  if (!session.isStaff) {
    return redirectToAccount(context.request, 'Staff access is required.');
  }

  const formData = await context.request.formData();
  const note = String(formData.get('note') || '').trim();
  const redirectTo = getSafeRedirectPath(formData.get('redirect_to'), `/admin/orders/${context.params.id}`);

  if (!note) {
    return Response.redirect(
      new URL(
        buildPathWithMessage(redirectTo, {
          error: 'A note is required.'
        }),
        context.request.url
      ),
      303
    );
  }

  const adminSupabase = createAdminSupabaseClient(context.locals);
  const { error } = await adminSupabase.rpc('record_order_update', {
    p_order_id: context.params.id,
    p_actor_user_id: session.user.id,
    p_payment_status: null,
    p_fulfillment_status: null,
    p_note: note
  });

  return Response.redirect(
    new URL(
      buildPathWithMessage(redirectTo, {
        [error ? 'error' : 'message']:
          error?.message || 'Internal note added.'
      }),
      context.request.url
    ),
    303
  );
};
