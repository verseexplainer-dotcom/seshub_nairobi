import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/pages/api/search/suggest';

const originalFetch = globalThis.fetch;

test('search suggest returns empty payload for short query', async () => {
  const response = await GET({
    request: new Request('https://example.com/api/search/suggest?q=a'),
    locals: {}
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.products, []);
  assert.deepEqual(body.categories, []);
});

test('search suggest rejects query above max length', async () => {
  const longQuery = 'x'.repeat(65);
  const response = await GET({
    request: new Request(`https://example.com/api/search/suggest?q=${longQuery}`),
    locals: {}
  } as any);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'INVALID_QUERY');
});

test('search suggest handles special characters safely', async (t) => {
  const calledUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledUrls.push(String(input));
    return new Response(
      JSON.stringify([
        {
          title: 'HP EliteBook 840 G5',
          slug: 'hp-elitebook-840-g5',
          price_kes: 42000,
          images: ['https://cdn.example.com/hp-elitebook-840-g5.webp']
        }
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await GET({
    request: new Request('https://example.com/api/search/suggest?q=hp%25_%3Cscript%3E'),
    locals: {
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          PUBLIC_SUPABASE_ANON_KEY: 'anon-key'
        }
      }
    }
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.products.length, 1);
  assert.equal(calledUrls.length, 3);
  assert.ok(calledUrls.some((url) => url.includes('brand=')));
  assert.ok(calledUrls.every((url) => !url.includes('<script>')));
});
