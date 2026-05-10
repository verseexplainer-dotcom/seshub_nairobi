import type { APIRoute } from 'astro';
import { errorResponse, getRuntimeEnv, isRecord, jsonResponse } from '../../../lib/server/http';

export const prerender = false;

const MAX_WEBHOOK_BYTES = 250_000;

export const GET: APIRoute = async ({ url, locals }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expectedToken = getRuntimeEnv(locals).MESSENGER_VERIFY_TOKEN?.trim();

  if (!expectedToken) {
    return errorResponse(503, 'META_WEBHOOK_NOT_CONFIGURED', 'Meta webhook verification is not configured.');
  }

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  return errorResponse(403, 'META_WEBHOOK_FORBIDDEN', 'Meta webhook verification failed.');
};

export const POST: APIRoute = async ({ request }) => {
  const payloadBytes = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(payloadBytes) && payloadBytes > MAX_WEBHOOK_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Webhook payload is too large.');
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return errorResponse(400, 'INVALID_JSON', 'Webhook payload must be a JSON object.');
  }

  const object = typeof body.object === 'string' ? body.object : 'unknown';
  const entryCount = Array.isArray(body.entry) ? body.entry.length : 0;
  console.info('meta webhook received', { object, entryCount });

  return jsonResponse({ ok: true });
};
