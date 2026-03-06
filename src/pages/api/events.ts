import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { session_id, event_type, payload } = await request.json();

    if (!session_id || !event_type) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing session_id or event_type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = (locals as any)?.runtime?.env ?? {};
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration missing Supabase credentials.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error: dbError } = await fetch(`${supabaseUrl}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        session_id,
        event_type,
        payload
      })
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => ({ error: data.error }));

    if (dbError) {
      console.error('Events DB Error:', dbError);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
