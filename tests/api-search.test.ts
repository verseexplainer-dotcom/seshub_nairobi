import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/pages/api/search/suggest';

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

test('search suggest handles special characters safely', async () => {
  const response = await GET({
    request: new Request('https://example.com/api/search/suggest?q=hp%25_%3Cscript%3E'),
    locals: {}
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(body.products.length > 0);
  assert.ok(body.products.every((product: { slug: string }) => !product.slug.includes('<script>')));
});
