import type { APIRoute } from 'astro';
import { buildPathWithMessage, getSafeRedirectPath } from '../../lib/auth-utils';
import { getSessionContext } from '../../lib/server-auth';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  const next = getSafeRedirectPath(context.url.searchParams.get('next'), '/account');

  if (!code) {
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/login', {
          error: 'The confirmation link is missing or expired.'
        }),
        context.request.url
      ),
      303
    );
  }

  const session = await getSessionContext(context);
  const { error } = await session.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return Response.redirect(
      new URL(
        buildPathWithMessage('/auth/login', {
          error: error.message
        }),
        context.request.url
      ),
      303
    );
  }

  const refreshed = await getSessionContext(context);
  const destination =
    next === '/account' && refreshed.isStaff ? '/admin' : next;

  return Response.redirect(new URL(destination, context.request.url), 303);
};
