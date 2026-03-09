import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/events';

const originalFetch = globalThis.fetch;

test('events API validates required fields', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'page_view' })
    }),
    locals: {}
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'INVALID_INPUT');
});

test('events API returns non-ok when upstream insert fails', async (t) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'boom' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await POST({
    request: new Request('https://example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'session-12345',
        event_type: 'page_view',
        payload: { path: '/' }
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
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'EVENTS_INSERT_FAILED');
});
