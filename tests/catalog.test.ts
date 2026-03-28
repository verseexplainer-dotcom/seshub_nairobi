import assert from 'node:assert/strict';
import test from 'node:test';
import { getHomepageProductColumns, isMissingImageOverridesError } from '../src/lib/catalog';

test('homepage product columns include image_overrides by default', () => {
  const columns = getHomepageProductColumns();

  assert.match(columns, /\bimage_overrides\b/);
});

test('homepage product columns can omit image_overrides for legacy schemas', () => {
  const columns = getHomepageProductColumns(false);

  assert.doesNotMatch(columns, /\bimage_overrides\b/);
  assert.match(columns, /\bimages\b/);
});

test('missing image_overrides error detection only matches the expected schema error', () => {
  assert.equal(
    isMissingImageOverridesError({
      code: '42703',
      message: 'column products.image_overrides does not exist'
    }),
    true
  );

  assert.equal(
    isMissingImageOverridesError({
      code: '42703',
      message: 'column products.featured_rank does not exist'
    }),
    false
  );

  assert.equal(
    isMissingImageOverridesError({
      code: 'PGRST204',
      message: 'Could not find the requested column in the schema cache'
    }),
    false
  );
});
