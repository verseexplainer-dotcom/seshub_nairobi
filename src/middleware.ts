import type { SessionLocals } from './lib/app-types';
import { defineMiddleware } from 'astro:middleware';
import { buildPathWithMessage } from './lib/auth-utils';
import { getSessionContext } from './lib/server-auth';

const ACCOUNT_PREFIX = '/account';
const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/auth/login';
const SIGNUP_PATH = '/auth/sign-up';
const RESET_PASSWORD_PATH = '/auth/reset-password';
const CALLBACK_PATH = '/auth/callback';
const LOGOUT_PATH = '/auth/logout';

function redirect(request: Request, path: string) {
  return Response.redirect(new URL(path, request.url), 303);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await getSessionContext(context);
  const locals = context.locals as SessionLocals;

  locals.user = session.user;
  locals.profile = session.profile;
  locals.isStaff = session.isStaff;
  locals.isAdmin = session.isAdmin;

  const path = context.url.pathname;
  const isAuthScreen =
    path === LOGIN_PATH ||
    path === SIGNUP_PATH ||
    path === RESET_PASSWORD_PATH ||
    path === CALLBACK_PATH ||
    path === LOGOUT_PATH;

  if (session.user && session.profile?.is_active === false && path !== LOGOUT_PATH) {
    await session.supabase.auth.signOut();
    return redirect(
      context.request,
      buildPathWithMessage(LOGIN_PATH, {
        error: 'Your account is inactive. Contact support for access.'
      })
    );
  }

  if (
    session.user &&
    (path === LOGIN_PATH || path === SIGNUP_PATH) &&
    !context.url.searchParams.has('force')
  ) {
    return redirect(context.request, session.isStaff ? '/admin' : '/account');
  }

  if (path.startsWith(ACCOUNT_PREFIX) && !session.user) {
    const nextPath = `${path}${context.url.search}`;
    return redirect(
      context.request,
      buildPathWithMessage(LOGIN_PATH, { next: nextPath })
    );
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    if (!session.user) {
      const nextPath = `${path}${context.url.search}`;
      return redirect(
        context.request,
        buildPathWithMessage(LOGIN_PATH, { next: nextPath })
      );
    }

    if (!session.isStaff) {
      return redirect(
        context.request,
        buildPathWithMessage('/account', {
          error: 'Staff access is required for that area.'
        })
      );
    }
  }

  if (!isAuthScreen && path.startsWith('/api/admin') && !session.isStaff) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: session.user ? 403 : 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return next();
});
