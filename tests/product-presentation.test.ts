import assert from 'node:assert/strict';
import test from 'node:test';
import { getPrimaryImage, getProductGallery } from '../src/lib/images';
import {
  getProductBadge,
  getProductBrand,
  getProductPresentation,
  getStoreCategoryBySlug,
  getStoreCategoryByValue,
  getStoreCategoryQueryValues,
  matchesStoreCategoryValue
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

  assert.equal(presentation.condition.label, 'Ex-uk Grade A refurb');
  assert.equal(presentation.grade, null);
  assert.equal(
    presentation.specRows.some((row) => row.label === 'Refurb grade'),
    false
  );
});

test('Grade A refurb condition does not duplicate the grade in specs', () => {
  const presentation = getProductPresentation(createProduct());

  assert.equal(presentation.condition.label, 'Ex-uk Grade A refurb');
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
      image_overrides: ['folder/override image (2).jpg']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );

  assert.equal(
    presentation.primaryImageUrl,
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/override%20image%20(2).jpg'
  );
});

test('shared image resolver prefers overrides and safely encodes filenames', () => {
  const imageUrl = getPrimaryImage(
    createProduct({
      images: ['base-image.jpg'],
      image_overrides: ['folder/override image (2).jpg']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );

  assert.equal(
    imageUrl,
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/override%20image%20(2).jpg'
  );
});

test('product galleries only use image_overrides when they exist', () => {
  const gallery = getProductGallery(
    createProduct({
      images: ['stale-base-image.jpg'],
      image_overrides: ['folder/override image (2).jpg', 'folder/override image.webp']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );
  const presentation = getProductPresentation(
    createProduct({
      images: ['stale-base-image.jpg'],
      image_overrides: ['folder/override image (2).jpg', 'folder/override image.webp']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );

  const expected = [
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/override%20image%20(2).jpg',
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/override%20image.webp'
  ];

  assert.deepEqual(gallery, expected);
  assert.deepEqual(presentation.imageUrls, expected);
});

test('shared image resolver preserves absolute Supabase image URLs', () => {
  const imageUrl = getPrimaryImage(
    createProduct({
      images: [
        'https://jddjdebcuruzwxiwaqfq.supabase.co/storage/v1/object/public/product-images/dell-refurbished-ex-uk-latitude-5420-intel-core-i5-1135g7-11th-gen-16gb-ram-512gb-ssd-14-inch-hd-display-windows-11-pro-2.webp'
      ]
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co',
      fallbackImage: '/product-placeholder.svg'
    }
  );

  assert.equal(
    imageUrl,
    'https://jddjdebcuruzwxiwaqfq.supabase.co/storage/v1/object/public/product-images/dell-refurbished-ex-uk-latitude-5420-intel-core-i5-1135g7-11th-gen-16gb-ram-512gb-ssd-14-inch-hd-display-windows-11-pro-2.webp'
  );
});

test('shared image resolver promotes bucket paths to Supabase public URLs', () => {
  const imageUrl = getPrimaryImage(
    createProduct({
      images: ['/product-images/folder/sample product.webp']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co'
    }
  );
  const storagePathUrl = getPrimaryImage(
    createProduct({
      images: ['/storage/v1/object/public/product-images/folder/sample product.webp']
    }),
    {
      publicSupabaseUrl: 'https://project.supabase.co'
    }
  );

  assert.equal(
    imageUrl,
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/sample%20product.webp'
  );
  assert.equal(storagePathUrl, imageUrl);
});

test('missing product images resolve to the storefront fallback image', () => {
  const imageUrl = getPrimaryImage(createProduct());
  const presentation = getProductPresentation(createProduct());

  assert.equal(imageUrl, '/product-placeholder.svg');
  assert.deepEqual(presentation.imageUrls, ['/product-placeholder.svg']);
  assert.equal(presentation.primaryImageUrl, '/product-placeholder.svg');
});

test('expanded storefront categories resolve by slug and database value', () => {
  assert.equal(getStoreCategoryBySlug('desktops')?.label, 'Desktops');
  assert.equal(getStoreCategoryBySlug('accessories')?.label, 'Accessories');
  assert.equal(getStoreCategoryByValue('Desktops')?.slug, 'desktops');
  assert.equal(getStoreCategoryByValue('Accessories')?.slug, 'accessories');
  assert.equal(getStoreCategoryByValue('storage')?.slug, 'accessories');
  assert.equal(getStoreCategoryByValue('laptops')?.slug, 'laptops');
  assert.equal(getStoreCategoryByValue('gaming_laptops')?.slug, 'gaming-laptops');
  assert.equal(getStoreCategoryByValue('Gaming Laptops')?.slug, 'gaming-laptops');
  assert.equal(getStoreCategoryByValue('Projectors')?.slug, 'projectors');
  assert.equal(getStoreCategoryByValue('UPS')?.slug, 'ups');
});

test('store category query values include canonical and imported lowercase forms', () => {
  assert.deepEqual(getStoreCategoryQueryValues('laptops'), ['laptops']);
  assert.deepEqual(getStoreCategoryQueryValues('accessories'), ['accessories', 'storage']);
  assert.deepEqual(getStoreCategoryQueryValues('gaming-laptops'), ['gaming_laptops', 'gaming-laptops', 'gaming laptops']);
  assert.equal(matchesStoreCategoryValue('Laptops', 'laptops'), true);
  assert.equal(matchesStoreCategoryValue('laptops', 'laptops'), true);
  assert.equal(matchesStoreCategoryValue('gaming_laptops', 'gaming-laptops'), true);
  assert.equal(matchesStoreCategoryValue('Gaming Laptops', 'gaming-laptops'), true);
  assert.equal(matchesStoreCategoryValue('storage', 'accessories'), true);
  assert.equal(matchesStoreCategoryValue('desktops', 'laptops'), false);
});

test('homepage brand labels only use explicit schema brands', () => {
  assert.equal(getProductBrand(createProduct({ brand: '' })), '');
  assert.equal(getProductBrand(createProduct({ brand: null, title: 'Dell Latitude 7420 Laptop' })), '');
});

test('homepage badges only expose real sale pricing', () => {
  assert.equal(getProductBadge(createProduct({ compare_at_kes: null }), 'arrival', 0), null);
  assert.equal(getProductBadge(createProduct({ compare_at_kes: 52000 }), 'seller', 3), 'SALE');
});
