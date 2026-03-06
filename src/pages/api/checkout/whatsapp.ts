import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

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
  title: string;
  qty: number;
  price_kes: number;
  slug: string | null;
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
      title,
      qty: Math.floor(qty),
      price_kes: Math.round(price),
      slug: item?.slug ? String(item.slug) : null
    };
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
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

    if (providedTotalKes != null && (!Number.isFinite(providedTotalKes) || Math.round(providedTotalKes) !== computedTotalKes)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Total validation failed. Please refresh your cart and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = (locals as any)?.runtime?.env ?? {};
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration missing Supabase credentials.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = {
      cart,
      total_kes: computedTotalKes,
      customer_name: body?.customer_name ? String(body.customer_name).trim() : null,
      phone: body?.phone ? String(body.phone).trim() : null,
      location: body?.location ? String(body.location).trim() : null,
      status: 'new'
    };

    const { data, error } = await supabase.from('order_intents').insert([payload]).select('id').single();
    if (error || !data?.id) {
      console.error('order_intents insert error', error);
      return new Response(JSON.stringify({ ok: false, error: 'Failed to save order intent.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderRef = data.id;
    const itemsSummary = cart.map((item) => `${item.qty}x ${item.title}`).join(', ');
    const message = `Hello SES ICT HUB, I want to place order ref ${orderRef}. Items: ${itemsSummary}. Total: KES ${computedTotalKes}.`;
    const whatsappUrl = `https://wa.me/254720480475?text=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: orderRef,
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
