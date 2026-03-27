const EVENTS_PATH = '/rest/v1/events';

type AnalyticsEventType = 'newsletter_signup_intent' | 'whatsapp_checkout_redirect';
type AnalyticsPayloadValue = string | number | boolean | null;

function sanitizePayload(payload: Record<string, AnalyticsPayloadValue | undefined>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export async function recordServerEvent(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  eventType: AnalyticsEventType;
  sessionId?: string | null;
  payload?: Record<string, AnalyticsPayloadValue | undefined>;
}) {
  const { supabaseUrl, serviceRoleKey, eventType, sessionId = null, payload = {} } = options;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}${EVENTS_PATH}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      session_id: sessionId,
      event_type: eventType,
      payload: sanitizePayload(payload)
    })
  }).catch((error: unknown) => {
    console.error('server analytics network error', eventType, error);
    return null;
  });

  if (!response) {
    return false;
  }

  if (!response.ok) {
    const upstreamError = await response.text().catch(() => '');
    console.error('server analytics insert error', eventType, response.status, upstreamError);
    return false;
  }

  return true;
}
