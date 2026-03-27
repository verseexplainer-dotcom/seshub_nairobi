import type { APIRoute } from 'astro';
import { recordServerEvent } from '../../lib/server/analytics';
import { verifyTurnstileToken } from '../../lib/server/turnstile';
import { asTrimmedString, errorResponse, getClientIp, getPublicEnvValue, getRuntimeEnv, isRecord, jsonResponse } from '../../lib/server/http';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_PAGE_LENGTH = 120;
const MAX_SESSION_ID_LENGTH = 128;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    }

    const email = asTrimmedString(body.email, MAX_EMAIL_LENGTH)?.toLowerCase();
    const consent = body.consent === true;
    const sourcePage = body.source_page == null ? null : asTrimmedString(body.source_page, MAX_SOURCE_PAGE_LENGTH);
    const sessionId = body.session_id == null ? null : asTrimmedString(body.session_id, MAX_SESSION_ID_LENGTH);
    const turnstileToken = asTrimmedString(body.turnstile_token, MAX_TURNSTILE_TOKEN_LENGTH);

    if (!email || !EMAIL_REGEX.test(email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (!consent) {
      return errorResponse(400, 'CONSENT_REQUIRED', 'Consent is required for newsletter signup.');
    }

    if (sourcePage === null && body.source_page != null) {
      return errorResponse(400, 'INVALID_SOURCE_PAGE', 'source_page is invalid.');
    }

    if (sessionId === null && body.session_id != null) {
      return errorResponse(400, 'INVALID_SESSION_ID', 'session_id is invalid.');
    }

    const env = getRuntimeEnv(locals);
    const supabaseUrl = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_URL');
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      secretKey: env.TURNSTILE_SECRET_KEY?.trim(),
      remoteIp: getClientIp(request),
      expectedAction: 'newsletter_signup'
    });

    if (!turnstileResult.ok) {
      return errorResponse(turnstileResult.status, turnstileResult.code, turnstileResult.message);
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'SUPABASE_CONFIG_MISSING', 'Server configuration missing Supabase credentials.');
    }

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/newsletter_signups?on_conflict=email`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([
          {
            email,
            consent: true,
            source_page: sourcePage
          }
        ])
      }
    );

    if (!response.ok) {
      const upstreamError = await response.text().catch(() => '');
      console.error('newsletter_signups upsert error', response.status, upstreamError);
      return errorResponse(502, 'NEWSLETTER_INSERT_FAILED', 'Unable to save newsletter signup.');
    }

    await recordServerEvent({
      supabaseUrl,
      serviceRoleKey,
      eventType: 'newsletter_signup_intent',
      sessionId,
      payload: {
        consent: true,
        source_page: sourcePage ?? '/'
      }
    });

    return jsonResponse({ ok: true });
  } catch {
    return errorResponse(500, 'NEWSLETTER_UNEXPECTED_ERROR', 'Unexpected server error.');
  }
};
