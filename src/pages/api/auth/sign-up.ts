import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { ensureUserProfile } from '../../../lib/server-auth';
import { createAdminSupabaseClient } from '../../../lib/supabase-admin';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

function isConfirmationEmailDeliveryError(error: { message?: string } | null | undefined) {
  return /sending confirmation email/i.test(error?.message || '');
}

function buildUserMetadata(fullName: string, phone: string, defaultLocation: string) {
  return {
    full_name: fullName,
    phone: phone || null,
    default_location: defaultLocation || null
  };
}

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const defaultLocation = String(formData.get('default_location') || '').trim();
  const password = String(formData.get('password') || '');
  const next = getSafeRedirectPath(formData.get('next'), '/account');

  if (!fullName || !email || password.length < 8) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/sign-up', {
        error: 'Name, email, and an 8 character password are required.',
        next
      })
    );
  }

  const callbackUrl = new URL('/api/auth/callback', context.request.url);
  callbackUrl.searchParams.set('next', next);

  const supabase = createServerSupabaseClient(context);
  const userMetadata = buildUserMetadata(fullName, phone, defaultLocation);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: absoluteUrl(context.request, callbackUrl.pathname + callbackUrl.search),
      data: userMetadata
    }
  });

  if (error) {
    if (isConfirmationEmailDeliveryError(error)) {
      try {
        const adminSupabase = createAdminSupabaseClient(context);
        const { error: createError } = await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMetadata
        });

        if (!createError || /already.*registered|already.*exists/i.test(createError.message)) {
          const signInResult = await supabase.auth.signInWithPassword({ email, password });

          if (signInResult.data.user && !signInResult.error) {
            const profile = await ensureUserProfile(supabase, signInResult.data.user);
            const destination =
              next === '/account' && (profile?.role === 'staff' || profile?.role === 'admin')
                ? '/admin'
                : next;

            return redirectResponse(context.request, destination);
          }

          return redirectResponse(
            context.request,
            buildPathWithMessage('/auth/login', {
              message: 'Your account was created. Sign in to continue.',
              next
            })
          );
        }
      } catch {
        return redirectResponse(
          context.request,
          buildPathWithMessage('/auth/sign-up', {
            error:
              'We could not send the confirmation email. Please contact SES ICT HUB so we can finish your account setup.',
            next
          })
        );
      }
    }

    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/sign-up', {
        error: isConfirmationEmailDeliveryError(error)
          ? 'We could not send the confirmation email. Please contact SES ICT HUB so we can finish your account setup.'
          : error.message,
        next
      })
    );
  }

  if (data.user && data.session) {
    const profile = await ensureUserProfile(supabase, data.user);
    const destination =
      next === '/account' && (profile?.role === 'staff' || profile?.role === 'admin')
        ? '/admin'
        : next;

    return redirectResponse(context.request, destination);
  }

  return redirectResponse(
    context.request,
    buildPathWithMessage('/auth/login', {
      message: 'Check your email to confirm your account before signing in.',
      next
    })
  );
};
