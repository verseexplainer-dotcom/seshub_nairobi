import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { getSessionContext, redirectToLogin } from '../../../lib/server-auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const session = await getSessionContext(context);

  if (!session.user) {
    return redirectToLogin(context.request);
  }

  const formData = await context.request.formData();
  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const defaultLocation = String(formData.get('default_location') || '').trim();
  const redirectTo = getSafeRedirectPath(formData.get('redirect_to'), '/account/profile');

  const { error: profileError } = await session.supabase
    .from('profiles')
    .update({
      full_name: fullName || null,
      phone: phone || null,
      default_location: defaultLocation || null
    })
    .eq('user_id', session.user.id);

  if (!profileError) {
    await session.supabase.auth.updateUser({
      data: {
        full_name: fullName || null,
        phone: phone || null,
        default_location: defaultLocation || null
      }
    });
  }

  return redirectResponse(
    context.request,
    buildPathWithMessage(redirectTo, {
      [profileError ? 'error' : 'message']:
        profileError?.message || 'Profile updated successfully.'
    })
  );
};
