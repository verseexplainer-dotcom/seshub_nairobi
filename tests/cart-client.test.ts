import assert from 'node:assert/strict';
import test from 'node:test';
import { safeCartImageSrc } from '../src/lib/cartClient';

test('cart image sanitizer preserves absolute and storage bucket paths', () => {
  assert.equal(
    safeCartImageSrc('https://project.supabase.co/storage/v1/object/public/product-images/sample.webp'),
    'https://project.supabase.co/storage/v1/object/public/product-images/sample.webp'
  );
  assert.equal(
    safeCartImageSrc('/storage/v1/object/public/product-images/folder/sample.webp'),
    '/storage/v1/object/public/product-images/folder/sample.webp'
  );
  assert.equal(
    safeCartImageSrc('storage/v1/object/public/product-images/folder/sample.webp'),
    '/storage/v1/object/public/product-images/folder/sample.webp'
  );
});

test('cart image sanitizer encodes product image filenames', () => {
  assert.equal(
    safeCartImageSrc('folder/sample product.webp'),
    '/product-images/folder/sample%20product.webp'
  );
  assert.equal(safeCartImageSrc(''), '');
});
