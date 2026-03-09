import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/newsletter';

const originalFetch = globalThis.fetch;

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

test('newsletter returns non-ok when upstream fails', async (t) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'duplicate' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    })) as typeof fetch;

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
        source_page: '/'
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

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, 'NEWSLETTER_INSERT_FAILED');
});

test('newsletter accepts valid payload', async (t) => {
  globalThis.fetch = (async () => new Response(null, { status: 201 })) as typeof fetch;

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
        source_page: '/'
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
});
