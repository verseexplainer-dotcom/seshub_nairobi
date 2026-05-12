import type { Provider } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import { absoluteUrl, buildPathWithMessage, getSafeRedirectPath, redirectResponse } from '../../../lib/auth-utils';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

const SUPPORTED_PROVIDERS = new Set<Provider>(['google', 'facebook']);

function getProvider(value: FormDataEntryValue | string | null | undefined) {
  const provider = String(value || '').trim().toLowerCase() as Provider;
  return SUPPORTED_PROVIDERS.has(provider) ? provider : null;
}

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const provider = getProvider(formData.get('provider'));
  const next = getSafeRedirectPath(formData.get('next'), '/account');

  if (!provider) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/login', {
        error: 'Unsupported sign-in provider.',
        next
      })
    );
  }

  const callbackUrl = new URL('/api/auth/callback', context.request.url);
  callbackUrl.searchParams.set('next', next);

  const supabase = createServerSupabaseClient(context);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: absoluteUrl(context.request, callbackUrl.pathname + callbackUrl.search)
    }
  });

  if (error || !data.url) {
    return redirectResponse(
      context.request,
      buildPathWithMessage('/auth/login', {
        error: error?.message || 'Unable to start social sign-in.',
        next
      })
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: data.url
    }
  });
};
