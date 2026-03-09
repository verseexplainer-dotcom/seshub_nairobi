import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/checkout/whatsapp';

const originalFetch = globalThis.fetch;

const validCart = [
  {
    id: 'prod-1',
    qty: 1,
    slug: 'hp-elitebook-840-g5'
  }
];

test('checkout rejects mismatched totals', async (t) => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          id: 'prod-1',
          title: 'HP EliteBook',
          slug: 'hp-elitebook-840-g5',
          price_kes: 42000,
          in_stock: true
        }
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: validCart,
        total_kes: 100,
        customer_name: 'Jane Doe',
        phone: '0712345678',
        location: 'Westlands',
        consent: true,
        source_page: 'cart'
      })
    }),
    locals: {
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role'
        }
      }
    }
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'TOTAL_MISMATCH');
});

test('checkout rejects invalid phone', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: validCart,
        total_kes: 42000,
        customer_name: 'Jane Doe',
        phone: 'abc',
        location: 'Westlands',
        consent: true,
        source_page: 'cart'
      })
    }),
    locals: {}
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'INVALID_PHONE');
});

test('checkout succeeds and returns whatsapp URL', async (t) => {
  let call = 0;
  globalThis.fetch = (async () => {
    call += 1;

    if (call === 1) {
      return new Response(
        JSON.stringify([
          {
            id: 'prod-1',
            title: 'HP EliteBook',
            slug: 'hp-elitebook-840-g5',
            price_kes: 42000,
            in_stock: true
          }
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify([{ id: 'order-uuid-123' }]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: validCart,
        total_kes: 42000,
        customer_name: 'Jane Doe',
        phone: '0712345678',
        location: 'Westlands',
        consent: true,
        source_page: 'cart'
      })
    }),
    locals: {
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role'
        }
      }
    }
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.order_id, 'order-uuid-123');
  assert.match(body.whatsapp_url, /wa\.me/);
  const whatsappUrl = new URL(body.whatsapp_url);
  const message = whatsappUrl.searchParams.get('text') ?? '';
  assert.match(message, /Order ref: order-uuid-123/);
  assert.match(message, /Name: Jane Doe/);
  assert.match(message, /Phone: 0712345678/);
  assert.match(message, /Location: Westlands/);
  assert.match(message, /Items:\n- 1x HP EliteBook/);
  assert.match(message, /Total: KES 42,000/);
});

test('checkout rejects out-of-stock items', async (t) => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          id: 'prod-1',
          title: 'HP EliteBook',
          slug: 'hp-elitebook-840-g5',
          price_kes: 42000,
          in_stock: false
        }
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: validCart,
        total_kes: 42000,
        customer_name: 'Jane Doe',
        phone: '0712345678',
        location: 'Westlands',
        consent: true,
        source_page: 'cart'
      })
    }),
    locals: {
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role'
        }
      }
    }
  } as any);

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error.code, 'OUT_OF_STOCK');
});
