export async function onRequestPost({ request, env }: { request: Request; env: any }) {
    try {
        const { session_id, event_type, payload } = await request.json();

        if (!session_id || !event_type) {
            return new Response(JSON.stringify({ ok: false, error: 'Missing session_id or event_type' }), { status: 400 });
        }

        const supabaseUrl = env.PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

        const { error: dbError } = await fetch(`${supabaseUrl}/rest/v1/events`, {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                session_id,
                event_type,
                payload
            })
        }).then(res => res.json().catch(() => ({}))).then(data => ({ error: data.error }));

        if (dbError) {
            console.error('Events DB Error:', dbError);
        }

        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
    }
}
