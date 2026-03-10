import type { APIRoute } from 'astro';
import { createAdminSupabaseClient } from '../../../lib/supabase-admin';
import { getSessionContext } from '../../../lib/server-auth';

export const prerender = false;

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const attemptsByIp = new Map<string, number[]>();

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
  return attempts.length > RATE_LIMIT_MAX;
}

type CartItem = {
  id: string | null;
  title: string;
  qty: number;
  price_kes: number;
  slug: string | null;
  image: string | null;
};

function normalizeCart(cart: any): CartItem[] {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Cart is empty or invalid');
  }

  return cart.map((item) => {
    const title = String(item?.title || '').trim();
    const qty = Number(item?.qty || 0);
    const price = Number(item?.price_kes || 0);
    if (!title || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price <= 0) {
      throw new Error('Cart contains invalid item data');
    }

    return {
      id: item?.id ? String(item.id) : null,
      title,
      qty: Math.floor(qty),
      price_kes: Math.round(price),
      slug: item?.slug ? String(item.slug) : null,
      image: item?.image ? String(item.image) : null
    };
  });
}

export const POST: APIRoute = async (context) => {
  try {
    const { request, locals } = context;
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Too many checkout attempts. Please retry in 5 minutes.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const cart = normalizeCart(body?.cart);
    const computedTotalKes = cart.reduce((sum, item) => sum + item.price_kes * item.qty, 0);
    const providedTotalKes = body?.total_kes == null ? null : Number(body.total_kes);
    const customerName = body?.customer_name ? String(body.customer_name).trim() : '';
    const phone = body?.phone ? String(body.phone).trim() : '';
    const consent = body?.consent === true;
    const sourcePage = body?.source_page ? String(body.source_page).trim() : null;

    if (providedTotalKes != null && (!Number.isFinite(providedTotalKes) || Math.round(providedTotalKes) !== computedTotalKes)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Total validation failed. Please refresh your cart and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!customerName || !phone || phone.length < 9) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Customer name and valid phone are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!consent) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Consent is required to submit an order intent.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await getSessionContext(context);
    const adminSupabase = createAdminSupabaseClient(locals);

    const { data, error } = await adminSupabase.rpc('create_checkout_order', {
      p_cart: cart,
      p_total_kes: computedTotalKes,
      p_customer_name: customerName,
      p_phone: phone,
      p_location: body?.location ? String(body.location).trim() : null,
      p_consent: consent,
      p_source_page: sourcePage,
      p_user_id: session.user?.id ?? null,
      p_customer_email: session.user?.email ?? null
    });

    const orderRow = Array.isArray(data) ? data[0] : data;

    if (error || !orderRow?.order_id) {
      console.error('create_checkout_order error', error);
      return new Response(JSON.stringify({ ok: false, error: error?.message || 'Failed to save order.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderRef = orderRow.order_number || orderRow.order_id;
    const itemsSummary = cart.map((item) => `${item.qty}x ${item.title}`).join(', ');
    const message = `Hello SES ICT HUB, I want to place order ref ${orderRef}. Items: ${itemsSummary}. Total: KES ${computedTotalKes}.`;
    const whatsappUrl = `https://wa.me/254720480475?text=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: orderRow.order_id,
        order_number: orderRow.order_number,
        whatsapp_url: whatsappUrl,
        url: whatsappUrl
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unexpected server error.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
