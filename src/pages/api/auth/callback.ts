import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { getSessionContext } from '../../../lib/server-auth';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  const next = getSafeRedirectPath(context.url.searchParams.get('next'), '/account');

  if (!code) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/login', {
        error: 'The confirmation link is missing or expired.'
      })
    );
  }

  const session = await getSessionContext(context);
  const { error } = await session.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/login', {
        error: error.message
      })
    );
  }

  const refreshed = await getSessionContext(context);
  const destination =
    next === '/account' && refreshed.isStaff ? '/admin' : next;

  return redirectResponse(context.request, destination);
};
