import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/newsletter';

const originalFetch = globalThis.fetch;

function createTurnstileSuccess(action: string) {
  return new Response(JSON.stringify({ success: true, action }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createNewsletterLocals() {
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

test('newsletter rejects missing consent', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        consent: false,
        source_page: '/'
      })
    }),
    locals: {}
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'CONSENT_REQUIRED');
});

test('newsletter requires turnstile verification', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        consent: true,
        source_page: '/'
      })
    }),
    locals: createNewsletterLocals()
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'TURNSTILE_REQUIRED');
});

test('newsletter returns non-ok when upstream fails', async (t) => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return createTurnstileSuccess('newsletter_signup');
    }

    return new Response(JSON.stringify({ error: 'duplicate' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        consent: true,
        source_page: '/',
        turnstile_token: 'token-123'
      })
    }),
    locals: createNewsletterLocals()
  } as any);

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, 'NEWSLETTER_INSERT_FAILED');
});

test('newsletter accepts valid payload', async (t) => {
  const requests: Array<{ url: string; body: Record<string, unknown> | null }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      requests.push({ url, body: null });
      return createTurnstileSuccess('newsletter_signup');
    }

    const bodyText = typeof init?.body === 'string' ? init.body : '';
    requests.push({
      url,
      body: bodyText ? JSON.parse(bodyText) : null
    });

    return new Response(null, { status: 201 });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        consent: true,
        source_page: '/',
        session_id: 'session-12345',
        turnstile_token: 'token-123'
      })
    }),
    locals: createNewsletterLocals()
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(requests.length, 3);
  assert.equal(requests[2]?.url, 'https://project.supabase.co/rest/v1/events');
  assert.equal(requests[2]?.body?.event_type, 'newsletter_signup_intent');
  assert.equal(requests[2]?.body?.session_id, 'session-12345');
  assert.equal(JSON.stringify(requests[2]?.body).includes('user@example.com'), false);
});
