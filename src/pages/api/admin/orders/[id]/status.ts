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
  const paymentStatus = String(formData.get('payment_status') || '').trim();
  const fulfillmentStatus = String(formData.get('fulfillment_status') || '').trim();
  const note = String(formData.get('note') || '').trim();
  const redirectTo = getSafeRedirectPath(formData.get('redirect_to'), `/admin/orders/${context.params.id}`);
  const adminSupabase = createAdminSupabaseClient(context.locals);

  const { error } = await adminSupabase.rpc('record_order_update', {
    p_order_id: context.params.id,
    p_actor_user_id: session.user.id,
    p_payment_status: paymentStatus || null,
    p_fulfillment_status: fulfillmentStatus || null,
    p_note: note || null
  });

  return Response.redirect(
    new URL(
      buildPathWithMessage(redirectTo, {
        [error ? 'error' : 'message']:
          error?.message || 'Order status updated.'
      }),
      context.request.url
    ),
    303
  );
};
