import type { APIRoute } from 'astro';
import { redirectResponse } from '../../../lib/auth-utils';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = createServerSupabaseClient(context);
  await supabase.auth.signOut();
  return redirectResponse(context.request, '/');
};
