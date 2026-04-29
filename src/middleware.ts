import type { SessionLocals } from './lib/app-types';
import { defineMiddleware } from 'astro:middleware';
import { buildPathWithMessage, redirectResponse } from './lib/auth-utils';
import { hasSupabaseAuthCookie } from './lib/http-cache';
import { getSessionContext } from './lib/server-auth';

const ACCOUNT_PREFIX = '/account';
const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/auth/login';
const SIGNUP_PATH = '/auth/sign-up';
const RESET_PASSWORD_PATH = '/auth/reset-password';
const CALLBACK_PATH = '/api/auth/callback';
const LOGOUT_PATH = '/api/auth/logout';

export const onRequest = defineMiddleware(async (context, next) => {
  const locals = context.locals as SessionLocals;
  locals.user = null;
  locals.profile = null;
  locals.isStaff = false;
  locals.isAdmin = false;

  const path = context.url.pathname;
  const hasSessionCookie = hasSupabaseAuthCookie(context.request);
  const isAuthScreen =
    path === LOGIN_PATH ||
    path === SIGNUP_PATH ||
    path === RESET_PASSWORD_PATH ||
    path === CALLBACK_PATH ||
    path === LOGOUT_PATH;
  const isAdminApi = !isAuthScreen && path.startsWith('/api/admin');

  if (path.startsWith(ACCOUNT_PREFIX) && !hasSessionCookie) {
    const nextPath = `${path}${context.url.search}`;
    return redirectResponse(
      context.request,
      buildPathWithMessage(LOGIN_PATH, { next: nextPath })
    );
  }

  if (path.startsWith(ADMIN_PREFIX) && !hasSessionCookie) {
    const nextPath = `${path}${context.url.search}`;
    return redirectResponse(
      context.request,
      buildPathWithMessage(LOGIN_PATH, { next: nextPath })
    );
  }

  if (isAdminApi && !hasSessionCookie) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!hasSessionCookie) {
    return next();
  }

  const session = await getSessionContext(context);
  locals.user = session.user;
  locals.profile = session.profile;
  locals.isStaff = session.isStaff;
  locals.isAdmin = session.isAdmin;

  if (session.user && session.profile?.is_active === false && path !== LOGOUT_PATH) {
    await session.supabase.auth.signOut();
      return redirectResponse(
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
    return redirectResponse(context.request, session.isStaff ? '/admin' : '/account');
  }

  if (path.startsWith(ACCOUNT_PREFIX) && !session.user) {
    const nextPath = `${path}${context.url.search}`;
    return redirectResponse(
      context.request,
      buildPathWithMessage(LOGIN_PATH, { next: nextPath })
    );
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    if (!session.user) {
      const nextPath = `${path}${context.url.search}`;
      return redirectResponse(
        context.request,
        buildPathWithMessage(LOGIN_PATH, { next: nextPath })
      );
    }

    if (!session.isStaff) {
      return redirectResponse(
        context.request,
        buildPathWithMessage('/account', {
          error: 'Staff access is required for that area.'
        })
      );
    }
  }

  if (isAdminApi && !session.isStaff) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: session.user ? 403 : 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return next();
});
