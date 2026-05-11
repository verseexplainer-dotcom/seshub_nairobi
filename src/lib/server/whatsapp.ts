import { getRuntimeEnv } from './http';

const GRAPH_API_VERSION = 'v20.0';
const MAX_MESSAGE_LENGTH = 3900;

type WhatsAppNotificationPayload = {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  location?: string | null;
  totalKes: number;
  items: Array<{
    title: string;
    qty: number;
    price_kes: number;
  }>;
};

type WhatsAppEnv = {
  WHATSAPP_TOKEN?: string | undefined;
  WHATSAPP_PHONE_NUMBER_ID?: string | undefined;
  WHATSAPP_NOTIFY_TO?: string | undefined;
};

function normalizeWhatsAppRecipient(rawPhone: string | undefined) {
  const normalized = rawPhone?.replace(/[^\d]/g, '') ?? '';
  return normalized.length >= 9 && normalized.length <= 15 ? normalized : null;
}

function getWhatsAppConfig(env: WhatsAppEnv) {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const notifyTo = normalizeWhatsAppRecipient(env.WHATSAPP_NOTIFY_TO);

  if (!token || !phoneNumberId || !notifyTo) {
    return null;
  }

  return {
    token,
    phoneNumberId,
    notifyTo
  };
}

function formatKes(value: number) {
  return `KES ${Math.round(value).toLocaleString('en-KE')}`;
}

function buildOrderNotificationMessage(payload: WhatsAppNotificationPayload) {
  const itemLines = payload.items
    .slice(0, 12)
    .map((item) => `- ${item.qty}x ${item.title} (${formatKes(item.price_kes * item.qty)})`);

  if (payload.items.length > 12) {
    itemLines.push(`- ${payload.items.length - 12} more item(s)`);
  }

  const lines = [
    `New SES ICT HUB order: ${payload.orderRef}`,
    `Customer: ${payload.customerName}`,
    `Phone: ${payload.customerPhone}`,
    payload.location ? `Location: ${payload.location}` : null,
    `Total: ${formatKes(payload.totalKes)}`,
    'Items:',
    ...itemLines
  ].filter(Boolean);

  return lines.join('\n').slice(0, MAX_MESSAGE_LENGTH);
}

export async function sendWhatsAppOrderNotification(
  locals: unknown,
  payload: WhatsAppNotificationPayload
) {
  const runtimeEnv = getRuntimeEnv(locals) as Record<string, string | undefined>;
  const config = getWhatsAppConfig({
    WHATSAPP_TOKEN: runtimeEnv.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: runtimeEnv.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_NOTIFY_TO: runtimeEnv.WHATSAPP_NOTIFY_TO
  });

  if (!config) {
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: config.notifyTo,
        type: 'text',
        text: {
          preview_url: false,
          body: buildOrderNotificationMessage(payload)
        }
      })
    }
  ).catch((error: unknown) => {
    console.error('whatsapp notification network error', error);
    return null;
  });

  if (!response) {
    return false;
  }

  if (!response.ok) {
    const upstreamError = await response.text().catch(() => '');
    console.error('whatsapp notification error', response.status, upstreamError);
    return false;
  }

  return true;
}
