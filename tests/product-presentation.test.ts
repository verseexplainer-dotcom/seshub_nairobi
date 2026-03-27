import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getProductBadge,
  getProductBrand,
  getProductPresentation,
  getStoreCategoryBySlug,
  getStoreCategoryByValue
} from '../src/lib/productPresentation';

function createProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    slug: 'hp-elitebook-840-g5',
    title: 'HP EliteBook 840 G5 Refurbished Laptop',
    category: 'Laptops',
    price_kes: 42000,
    compare_at_kes: null,
    in_stock: true,
    stock_qty: 3,
    brand: 'HP',
    condition: 'refurbished',
    refurb_grade: 'grade_a',
    short_specs: 'Intel Core i5, 8GB RAM, 256GB SSD',
    description: '',
    warranty_months: 6,
    images: [],
    image_overrides: [],
    cpu: 'Intel Core i5',
    ram_gb: 8,
    storage_gb: 256,
    storage_type: 'SSD',
    screen_in: 14,
    ...overrides
  };
}

test('laptop presentation suppresses Grade B and Grade C badges', () => {
  const presentation = getProductPresentation(createProduct({ refurb_grade: 'grade_b' }));

  assert.equal(presentation.condition.label, 'Refurbished');
  assert.equal(presentation.grade, null);
  assert.equal(
    presentation.specRows.some((row) => row.label === 'Refurb grade'),
    false
  );
});

test('brand new laptops never expose a refurb grade badge', () => {
  const presentation = getProductPresentation(
    createProduct({
      condition: 'brand_new',
      refurb_grade: 'grade_a',
      title: 'HP EliteBook 840 G5 Brand New Laptop'
    })
  );

  assert.equal(presentation.condition.label, 'Brand New');
  assert.equal(presentation.grade, null);
});

test('non-laptop products keep their existing refurb grade behavior', () => {
  const presentation = getProductPresentation(
    createProduct({
      category: 'Smartphones',
      refurb_grade: 'grade_b',
      title: 'Samsung Galaxy A54 Refurbished Smartphone'
    })
  );

  assert.equal(presentation.grade?.label, 'Grade B');
});

test('invalid laptop conditions are hidden in storefront presentation', () => {
  const presentation = getProductPresentation(
    createProduct({
      condition: 'unknown',
      refurb_grade: 'grade_a'
    })
  );

  assert.equal(presentation.condition.label, '');
});

test('image overrides win over the base image array', () => {
  const presentation = getProductPresentation(
    createProduct({
      images: ['base-image.jpg'],
      image_overrides: ['override-image.jpg']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );

  assert.equal(
    presentation.primaryImageUrl,
    'https://project.supabase.co/storage/v1/object/public/product-images/override-image.jpg'
  );
});

test('expanded storefront categories resolve by slug and database value', () => {
  assert.equal(getStoreCategoryBySlug('desktops')?.label, 'Desktops');
  assert.equal(getStoreCategoryBySlug('accessories')?.label, 'Accessories');
  assert.equal(getStoreCategoryByValue('Desktops')?.slug, 'desktops');
  assert.equal(getStoreCategoryByValue('Accessories')?.slug, 'accessories');
});

test('homepage brand labels only use explicit schema brands', () => {
  assert.equal(getProductBrand(createProduct({ brand: '' })), '');
  assert.equal(getProductBrand(createProduct({ brand: null, title: 'Dell Latitude 7420 Laptop' })), '');
});

test('homepage badges only expose real sale pricing', () => {
  assert.equal(getProductBadge(createProduct({ compare_at_kes: null }), 'arrival', 0), null);
  assert.equal(getProductBadge(createProduct({ compare_at_kes: 52000 }), 'seller', 3), 'SALE');
});
