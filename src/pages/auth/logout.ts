import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '../../lib/supabase-server';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = createServerSupabaseClient(context);
  await supabase.auth.signOut();
  return Response.redirect(new URL('/', context.request.url), 303);
};
