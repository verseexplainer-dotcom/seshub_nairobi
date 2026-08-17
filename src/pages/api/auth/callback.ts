import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { getSessionContext } from '../../../lib/server-auth';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  const type = context.url.searchParams.get('type');
  const next = getSafeRedirectPath(context.url.searchParams.get('next'), '/account');
  const errorDescription = context.url.searchParams.get('error_description');
  const failurePath = type === 'recovery' ? '/auth/reset-password' : '/auth/login';

  if (errorDescription || !code) {
    return redirectResponse(
      context.request,
      buildPathWithMessage(failurePath, {
        error: errorDescription || 'This link is missing, invalid, or expired. Request a new one.'
      })
    );
  }

  const session = await getSessionContext(context);
  const { error } = await session.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectResponse(
      context.request,
      buildPathWithMessage(failurePath, {
        error: error.message
      })
    );
  }

  const refreshed = await getSessionContext(context);
  const destination =
    next === '/account' && refreshed.isStaff ? '/admin' : next;

  return redirectResponse(context.request, destination);
};
