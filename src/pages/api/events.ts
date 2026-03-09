import type { APIRoute } from 'astro';
import { asTrimmedString, errorResponse, getPublicEnvValue, getRuntimeEnv, isRecord, jsonResponse } from '../../lib/server/http';

export const prerender = false;

const VALID_EVENT_TYPES = new Set([
  'page_view',
  'add_to_cart',
  'remove_from_cart',
  'checkout_start',
  'whatsapp_click',
  'submit_order_intent',
  'newsletter_signup_intent',
  'whatsapp_checkout_redirect'
]);

const MAX_PAYLOAD_BYTES = 10_000;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!isRecord(rawBody)) {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    }

    const sessionId = asTrimmedString(rawBody.session_id, 128);
    const eventType = asTrimmedString(rawBody.event_type, 64);
    const payload = isRecord(rawBody.payload) ? rawBody.payload : {};

    if (!sessionId || !eventType) {
      return errorResponse(400, 'INVALID_INPUT', 'Missing required fields: session_id and event_type.');
    }

    if (!VALID_EVENT_TYPES.has(eventType)) {
      return errorResponse(400, 'INVALID_EVENT_TYPE', 'event_type is not allowed.');
    }

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Event payload is too large.');
    }

    const env = getRuntimeEnv(locals);
    const supabaseUrl = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse(500, 'SUPABASE_CONFIG_MISSING', 'Server configuration missing Supabase credentials.');
    }

    const insertResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        payload
      })
    });

    if (!insertResponse.ok) {
      const upstreamError = await insertResponse.text().catch(() => '');
      console.error('Events DB Error:', insertResponse.status, upstreamError);
      return errorResponse(502, 'EVENTS_INSERT_FAILED', 'Failed to record analytics event.');
    }

    return jsonResponse({ ok: true });
  } catch {
    return errorResponse(500, 'EVENTS_UNEXPECTED_ERROR', 'Unexpected server error.');
  }
};
