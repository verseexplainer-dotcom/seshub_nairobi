import type { APIRoute } from 'astro';
import { asTrimmedString, errorResponse, getPublicEnvValue, getRuntimeEnv, isRecord, jsonResponse } from '../../../lib/server/http';

export const prerender = false;

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const attemptsByIp = new Map<string, number[]>();
const MAX_CART_ITEMS = 50;
const MAX_PAYLOAD_BYTES = 25_000;
const MAX_ITEM_QTY = 20;
const MAX_TITLE_LENGTH = 180;
const MAX_LOCATION_LENGTH = 180;
const MAX_SOURCE_PAGE_LENGTH = 120;
const MAX_TOTAL_KES = 20_000_000;
const PHONE_REGEX = /^\+?\d{9,15}$/;

function getClientIp(request: Request) {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return (forwarded.split(',')[0] ?? '').trim();
  return 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const attempts = (attemptsByIp.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  attempts.push(now);
  attemptsByIp.set(ip, attempts);
  if (attemptsByIp.size > 5000) {
    for (const [key, timestamps] of attemptsByIp.entries()) {
      const lastAttempt = timestamps[timestamps.length - 1] ?? 0;
      if (timestamps.length === 0 || now - lastAttempt > RATE_WINDOW_MS) {
        attemptsByIp.delete(key);
      }
    }
  }
  return attempts.length > RATE_LIMIT_MAX;
}

type CartItem = {
  id: string;
  title: string;
  qty: number;
  price_kes: number;
  slug: string | null;
};

type RequestedCartItem = {
  id: string;
  qty: number;
  slug: string | null;
};

type CatalogProduct = {
  id: string;
  title: string;
  slug: string | null;
  price_kes: number;
  in_stock: boolean;
};

function normalizePhone(rawPhone: string) {
  return rawPhone.replace(/[\s()-]/g, '');
}

function normalizeCart(cart: unknown): RequestedCartItem[] {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > MAX_CART_ITEMS) {
    throw new Error('Cart is empty or invalid.');
  }

  return cart.map((item) => {
    if (!isRecord(item)) {
      throw new Error('Cart contains invalid item data.');
    }

    const id = asTrimmedString(item.id, 64);
    const qty = Number(item.qty);
    const slug = item.slug == null ? null : asTrimmedString(item.slug, 180);

    if (
      !id ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > MAX_ITEM_QTY
    ) {
      throw new Error('Cart contains invalid item data.');
    }

    return {
      id,
      qty,
      slug
    };
  });
}

function buildProductsLookupUrl(supabaseUrl: string, ids: string[]) {
  const params = new URLSearchParams({
    select: 'id,title,slug,price_kes,in_stock',
    id: `in.(${ids.join(',')})`,
    limit: String(ids.length)
  });
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?${params.toString()}`;
}

async function fetchCatalogProducts(
  supabaseUrl: string,
  serviceRoleKey: string,
  ids: string[]
): Promise<Map<string, CatalogProduct>> {
  const response = await fetch(buildProductsLookupUrl(supabaseUrl, ids), {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    const upstreamError = await response.text().catch(() => '');
    console.error('products lookup error', response.status, upstreamError);
    throw new Error('Unable to validate cart products right now.');
  }

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) {
    throw new Error('Unable to validate cart products right now.');
  }

  const map = new Map<string, CatalogProduct>();
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, MAX_TITLE_LENGTH) : '';
    const slug = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : null;
    const price = Number(row.price_kes);
    const inStock = row.in_stock !== false;

    if (!id || !title || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    map.set(id, {
      id,
      title,
      slug,
      price_kes: Math.round(price),
      in_stock: inStock
    });
  }

  return map;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const payloadBytes = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(payloadBytes) && payloadBytes > MAX_PAYLOAD_BYTES) {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Checkout payload is too large.');
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return errorResponse(429, 'RATE_LIMITED', 'Too many checkout attempts. Please retry in 5 minutes.');
    }

    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    }

    const requestedCart = normalizeCart(body?.cart);
    const providedTotalKes = body?.total_kes == null ? null : Number(body.total_kes);
    const customerName = asTrimmedString(body.customer_name, 120);
    const rawPhone = asTrimmedString(body.phone, 30);
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : '';
    const consent = body?.consent === true;
    const sourcePage = body?.source_page == null ? null : asTrimmedString(body.source_page, MAX_SOURCE_PAGE_LENGTH);
    const location = body?.location == null ? null : asTrimmedString(body.location, MAX_LOCATION_LENGTH);

    if (!customerName) {
      return errorResponse(400, 'INVALID_CUSTOMER_NAME', 'Customer name is required.');
    }

    if (!normalizedPhone || !PHONE_REGEX.test(normalizedPhone)) {
      return errorResponse(400, 'INVALID_PHONE', 'A valid phone number is required.');
    }

    if (location === null && body.location != null) {
      return errorResponse(400, 'INVALID_LOCATION', 'Delivery location is invalid.');
    }

    if (sourcePage === null && body.source_page != null) {
      return errorResponse(400, 'INVALID_SOURCE_PAGE', 'source_page is invalid.');
    }

    if (!consent) {
      return errorResponse(400, 'CONSENT_REQUIRED', 'Consent is required to submit an order intent.');
    }

    const env = getRuntimeEnv(locals);
    const supabaseUrl = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_URL');
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'SUPABASE_CONFIG_MISSING', 'Server configuration missing Supabase credentials.');
    }

    const uniqueIds = Array.from(new Set(requestedCart.map((item) => item.id)));
    const catalogById = await fetchCatalogProducts(supabaseUrl, serviceRoleKey, uniqueIds);

    const cart: CartItem[] = [];
    for (const item of requestedCart) {
      const product = catalogById.get(item.id);
      if (!product) {
        return errorResponse(400, 'INVALID_CART_ITEM', 'Cart contains products that are no longer available.');
      }

      if (!product.in_stock) {
        return errorResponse(409, 'OUT_OF_STOCK', `Item "${product.title}" is currently out of stock.`);
      }

      cart.push({
        id: product.id,
        title: product.title,
        qty: item.qty,
        price_kes: product.price_kes,
        slug: product.slug ?? item.slug
      });
    }

    const computedTotalKes = cart.reduce((sum, item) => sum + item.price_kes * item.qty, 0);
    if (computedTotalKes <= 0 || computedTotalKes > MAX_TOTAL_KES) {
      return errorResponse(400, 'INVALID_TOTAL', 'Computed cart total is invalid.');
    }

    if (providedTotalKes != null && (!Number.isFinite(providedTotalKes) || Math.round(providedTotalKes) !== computedTotalKes)) {
      return errorResponse(400, 'TOTAL_MISMATCH', 'Your cart pricing changed. Please refresh and try again.');
    }

    const payload: Record<string, unknown> = {
      cart,
      total_kes: computedTotalKes,
      customer_name: customerName,
      phone: normalizedPhone,
      location,
      consent,
      source_page: sourcePage,
      status: 'new'
    };

    const insertResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/order_intents?select=id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!insertResponse.ok) {
      const upstreamError = await insertResponse.text().catch(() => '');
      console.error('order_intents insert error', insertResponse.status, upstreamError);
      return errorResponse(502, 'ORDER_INTENT_INSERT_FAILED', 'Failed to save order intent.');
    }

    const insertedPayload = (await insertResponse.json().catch(() => null)) as
      | Array<{ id?: string }>
      | { id?: string }
      | null;
    const orderRef = Array.isArray(insertedPayload)
      ? typeof insertedPayload[0]?.id === 'string'
        ? insertedPayload[0].id
        : null
      : typeof insertedPayload?.id === 'string'
        ? insertedPayload.id
        : null;

    if (!orderRef) {
      return errorResponse(502, 'ORDER_REF_MISSING', 'Order was created but no order reference was returned.');
    }

    const itemsSummary = cart.map((item) => `${item.qty}x ${item.title}`).join(', ');
    const message = `Hello SES ICT HUB, I want to place order ref ${orderRef}. Items: ${itemsSummary}. Total: KES ${computedTotalKes}.`;
    const whatsappUrl = `https://wa.me/254720480475?text=${encodeURIComponent(message)}`;

    return jsonResponse({
      ok: true,
      order_id: orderRef,
      whatsapp_url: whatsappUrl,
      url: whatsappUrl
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return errorResponse(400, 'CHECKOUT_VALIDATION_FAILED', message);
  }
};
