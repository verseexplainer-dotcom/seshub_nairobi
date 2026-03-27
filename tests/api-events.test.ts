import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/events';

test('events API is deprecated for browser writes', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'page_view' })
    }),
    locals: {}
  } as any);

  assert.equal(response.status, 410);
  const body = await response.json();
  assert.equal(body.error.code, 'EVENTS_ENDPOINT_DEPRECATED');
});
