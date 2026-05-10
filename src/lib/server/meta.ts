import { getRuntimeEnv } from './http';

type MetaEventName =
  | 'Contact'
  | 'Lead'
  | 'PageView'
  | 'Purchase'
  | 'Search'
  | 'Subscribe'
  | 'ViewContent';

type MetaEventPayload = {
  eventName: MetaEventName;
  eventSourceUrl?: string | null;
  actionSource?: 'website' | 'chat' | 'phone_call' | 'email' | 'business_messaging' | 'other';
  eventId?: string | null;
  userData?: Record<string, string | string[] | undefined>;
  customData?: Record<string, string | number | boolean | null | undefined>;
};

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
  );
}

export async function recordMetaServerEvent(locals: unknown, payload: MetaEventPayload) {
  const env = getRuntimeEnv(locals);
  const pixelId = env.META_PIXEL_ID?.trim() || env.PUBLIC_META_PIXEL_ID?.trim();
  const token = env.META_CAPI_TOKEN?.trim();

  if (!pixelId || !token) {
    return false;
  }

  const body = {
    data: [
      cleanObject({
        event_name: payload.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: payload.eventSourceUrl || undefined,
        action_source: payload.actionSource || 'website',
        event_id: payload.eventId || undefined,
        user_data: payload.userData ? cleanObject(payload.userData) : undefined,
        custom_data: payload.customData ? cleanObject(payload.customData) : undefined
      })
    ]
  };

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  ).catch((error: unknown) => {
    console.error('meta capi network error', error);
    return null;
  });

  if (!response) {
    return false;
  }

  if (!response.ok) {
    const upstreamError = await response.text().catch(() => '');
    console.error('meta capi event error', response.status, upstreamError);
    return false;
  }

  return true;
}
