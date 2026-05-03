import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/checkout/whatsapp';

const originalFetch = globalThis.fetch;

const validCart = [
  {
    id: 'dell-latitude-7450-core-i5-refurbished',
    qty: 1,
    slug: 'dell-latitude-7450-core-i5-refurbished'
  }
];
const validCartTotalKes = 16500;

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

    throw new Error(`Unexpected fetch in local product lookup test: ${url}`);
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
        total_kes: validCartTotalKes,
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
        total_kes: validCartTotalKes,
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
        total_kes: validCartTotalKes,
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
  assert.equal(requests.length, 3);
  assert.equal(requests[2]?.url, 'https://project.supabase.co/rest/v1/events');
  assert.equal(requests[2]?.body?.event_type, 'whatsapp_checkout_redirect');
  assert.equal(requests[2]?.body?.session_id, 'session-12345');
  assert.equal(JSON.stringify(requests[2]?.body).includes('jane@example.com'), false);
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
        total_kes: validCartTotalKes,
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
  assert.equal(requests[1]?.body?.p_user_id, 'user-123');
  assert.equal(requests[1]?.body?.p_customer_email, 'jane@example.com');
});

test('checkout rejects unavailable local catalog items', async (t) => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return createTurnstileSuccess('checkout_whatsapp');
    }

    throw new Error(`Unexpected fetch in local product lookup test: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: [{ id: 'missing-product', qty: 1, slug: 'missing-product' }],
        total_kes: validCartTotalKes,
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
  assert.equal(body.error.code, 'INVALID_CART_ITEM');
});

test('checkout returns 502 when order creation fails', async (t) => {
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
        total_kes: validCartTotalKes,
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
  assert.equal(body.error.code, 'ORDER_CREATE_FAILED');
});
