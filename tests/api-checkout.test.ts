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

function createTurnstileSuccess(action: string) {
  return new Response(JSON.stringify({ success: true, action }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createCheckoutLocals() {
  return {
    runtime: {
      env: {
        PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        TURNSTILE_SECRET_KEY: 'turnstile-secret'
      }
    }
  };
}

test('checkout rejects mismatched totals', async (t) => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return createTurnstileSuccess('checkout_whatsapp');
    }

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
        total_kes: 100,
        customer_name: 'Jane Doe',
        phone: '0712345678',
        location: 'Westlands',
        consent: true,
        source_page: 'cart',
        turnstile_token: 'token-123'
      })
    }),
    locals: createCheckoutLocals()
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

test('checkout requires turnstile verification', async () => {
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
    locals: createCheckoutLocals()
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'TURNSTILE_REQUIRED');
});

test('checkout succeeds and returns whatsapp URL', async (t) => {
  const requests: Array<{ url: string; body: Record<string, unknown> | null }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      requests.push({ url, body: null });
      return createTurnstileSuccess('checkout_whatsapp');
    }

    const bodyText = typeof init?.body === 'string' ? init.body : '';
    requests.push({
      url,
      body: bodyText ? JSON.parse(bodyText) : null
    });

    if (url.includes('/rest/v1/products')) {
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

    return new Response(JSON.stringify([{ order_id: 'order-uuid-123', order_number: 'SES-20260319-00001' }]), {
      status: 200,
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
        source_page: 'cart',
        session_id: 'session-12345',
        turnstile_token: 'token-123'
      })
    }),
    locals: createCheckoutLocals()
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.order_id, 'order-uuid-123');
  assert.equal(body.order_number, 'SES-20260319-00001');
  assert.match(body.whatsapp_url, /wa\.me/);
  assert.equal(requests.length, 4);
  assert.equal(requests[3]?.url, 'https://project.supabase.co/rest/v1/events');
  assert.equal(requests[3]?.body?.event_type, 'whatsapp_checkout_redirect');
  assert.equal(requests[3]?.body?.session_id, 'session-12345');
  assert.equal(JSON.stringify(requests[3]?.body).includes('jane@example.com'), false);
});

test('checkout forwards the signed-in user to order creation', async (t) => {
  const requests: Array<{ url: string; body: Record<string, unknown> | null }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      requests.push({ url, body: null });
      return createTurnstileSuccess('checkout_whatsapp');
    }

    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const body = bodyText ? JSON.parse(bodyText) : null;
    requests.push({ url, body });

    if (url.includes('/rest/v1/products')) {
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

    return new Response(JSON.stringify([{ order_id: 'order-uuid-456', order_number: 'SES-20260319-00002' }]), {
      status: 200,
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
        source_page: 'cart',
        turnstile_token: 'token-123'
      })
    }),
    locals: {
      user: {
        id: 'user-123',
        email: 'jane@example.com'
      },
      ...createCheckoutLocals()
    }
  } as any);

  assert.equal(response.status, 200);
  assert.equal(requests[2]?.body?.p_user_id, 'user-123');
  assert.equal(requests[2]?.body?.p_customer_email, 'jane@example.com');
});

test('checkout rejects out-of-stock items', async (t) => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return createTurnstileSuccess('checkout_whatsapp');
    }

    return new Response(
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
    );
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
        source_page: 'cart',
        turnstile_token: 'token-123'
      })
    }),
    locals: createCheckoutLocals()
  } as any);

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error.code, 'OUT_OF_STOCK');
});

test('checkout returns 502 when product lookup fails', async (t) => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return createTurnstileSuccess('checkout_whatsapp');
    }

    return new Response(JSON.stringify({ error: 'db unavailable' }), {
      status: 500,
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
        source_page: 'cart',
        turnstile_token: 'token-123'
      })
    }),
    locals: createCheckoutLocals()
  } as any);

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, 'PRODUCT_LOOKUP_FAILED');
});
