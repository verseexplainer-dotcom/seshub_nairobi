import type { APIRoute } from 'astro';
import { asTrimmedString, errorResponse, getPublicEnvValue, getRuntimeEnv, isRecord, jsonResponse } from '../../lib/server/http';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_PAGE_LENGTH = 120;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    }

    const email = asTrimmedString(body.email, MAX_EMAIL_LENGTH)?.toLowerCase();
    const consent = body.consent === true;
    const sourcePage = body.source_page == null ? null : asTrimmedString(body.source_page, MAX_SOURCE_PAGE_LENGTH);

    if (!email || !EMAIL_REGEX.test(email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (!consent) {
      return errorResponse(400, 'CONSENT_REQUIRED', 'Consent is required for newsletter signup.');
    }

    if (sourcePage === null && body.source_page != null) {
      return errorResponse(400, 'INVALID_SOURCE_PAGE', 'source_page is invalid.');
    }

    const env = getRuntimeEnv(locals);
    const supabaseUrl = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_URL');
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

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

    return jsonResponse({ ok: true });
  } catch {
    return errorResponse(500, 'NEWSLETTER_UNEXPECTED_ERROR', 'Unexpected server error.');
  }
};
