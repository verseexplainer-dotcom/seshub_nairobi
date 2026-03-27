import assert from 'node:assert/strict';
import test from 'node:test';
import { STOREFRONT_CATEGORIES, getCategoryPath } from '../src/lib/productPresentation';
import { mainShopLinks } from '../src/lib/storefront';

test('main shop links are derived from the storefront category source of truth', () => {
  assert.deepEqual(
    mainShopLinks,
    STOREFRONT_CATEGORIES.map((category) => ({
      label: category.label,
      href: getCategoryPath(category.slug)
    }))
  );
});
