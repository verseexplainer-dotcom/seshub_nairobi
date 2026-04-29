import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHomepageTestimonials,
  buildUseCaseCollections,
  countExplicitBrands,
  selectBestValueProducts,
  selectDealsProducts,
  selectFeaturedProducts,
  selectNewInProducts,
  selectPremiumProducts
} from '../src/lib/homepage';
import type { CatalogProduct } from '../src/types/catalog';

function createProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: String(overrides.id ?? 'prod-1'),
    slug: String(overrides.slug ?? 'hp-elitebook-840-g5'),
    title: String(overrides.title ?? 'HP EliteBook 840 G5'),
    category: String(overrides.category ?? 'Laptops'),
    price_kes: Number(overrides.price_kes ?? 42000),
    compare_at_kes: Number(overrides.compare_at_kes ?? 52000),
    in_stock: overrides.in_stock ?? true,
    stock_qty: Number(overrides.stock_qty ?? 4),
    brand: String(overrides.brand ?? 'HP'),
    condition: String(overrides.condition ?? 'refurbished'),
    short_specs: String(overrides.short_specs ?? 'Intel Core i5, 8GB RAM, 256GB SSD'),
    warranty_months: Number(overrides.warranty_months ?? 6),
    images: overrides.images ?? ['hp-elitebook-840-g5.webp'],
    image_overrides: overrides.image_overrides ?? [],
    featured_home: overrides.featured_home ?? true,
    featured_rank: Number(overrides.featured_rank ?? 1),
    created_at: String(overrides.created_at ?? '2026-04-01T10:00:00.000Z'),
    updated_at: String(overrides.updated_at ?? '2026-04-12T10:00:00.000Z'),
    ram_gb: Number(overrides.ram_gb ?? 8),
    storage_gb: Number(overrides.storage_gb ?? 256),
    storage_type: String(overrides.storage_type ?? 'SSD'),
    cpu: String(overrides.cpu ?? 'Intel Core i5'),
    screen_in: Number(overrides.screen_in ?? 14)
  };
}

test('homepage testimonials stay hidden when there are no approved rows', () => {
  assert.deepEqual(buildHomepageTestimonials([]), []);
  assert.deepEqual(buildHomepageTestimonials(undefined), []);
});

test('homepage testimonials dedupe duplicate approved rows and cap output', () => {
  const testimonials = buildHomepageTestimonials([
    { id: 1, name: 'Jane Doe', persona: 'student', rating: 5, quote: 'Great service.' },
    { id: 2, name: 'Jane Doe', persona: 'student', rating: 4, quote: 'Great service.' },
    { id: 3, name: 'Alex', persona: 'office', rating: 5, quote: 'Helpful team.' }
  ]);

  assert.equal(testimonials.length, 2);
  assert.equal(testimonials[0]?.name, 'Jane Doe');
  assert.equal(testimonials[1]?.name, 'Alex');
});

test('homepage brand counts ignore missing brands and title text', () => {
  const count = countExplicitBrands([
    { title: 'HP EliteBook 840 G5', brand: '' },
    { title: 'Dell Latitude 7420' },
    { title: 'Lenovo ThinkPad T14', brand: 'Lenovo' },
    { title: 'HP ProBook 640', brand: 'HP' },
    { title: 'HP ProBook 450', brand: 'HP' }
  ]);

  assert.equal(count, 2);
});

test('homepage merchandising selectors only keep products with bucket-backed images', () => {
  const visibleLaptop = createProduct({
    id: 'prod-visible-laptop',
    slug: 'visible-laptop',
    title: 'Visible Laptop',
    category: 'Laptops',
    images: ['visible-laptop.webp'],
    featured_rank: 1
  });
  const missingImageLaptop = createProduct({
    id: 'prod-missing-image',
    slug: 'missing-image-laptop',
    title: 'Missing Image Laptop',
    images: [],
    image_overrides: [],
    featured_rank: 0
  });
  const visiblePrinter = createProduct({
    id: 'prod-visible-printer',
    slug: 'visible-printer',
    title: 'Visible Printer',
    category: 'Printers',
    images: ['visible-printer.webp'],
    featured_rank: 2
  });
  const discountedDesktop = createProduct({
    id: 'prod-discounted-desktop',
    slug: 'discounted-desktop',
    title: 'Discounted Desktop',
    category: 'Desktops',
    images: ['discounted-desktop.webp'],
    featured_rank: 3,
    price_kes: 60000,
    compare_at_kes: 78000
  });
  const noImageDeal = createProduct({
    id: 'prod-no-image-deal',
    slug: 'no-image-deal',
    title: 'No Image Deal',
    category: 'Smartphones',
    images: [],
    image_overrides: [],
    price_kes: 35000,
    compare_at_kes: 48000,
    featured_rank: 4
  });
  const products = [missingImageLaptop, noImageDeal, visibleLaptop, visiblePrinter, discountedDesktop];
  const featuredSlugs = selectFeaturedProducts(products, 5).map((product) => product.slug);
  const newInSlugs = selectNewInProducts(products, 5).map((product) => product.slug);
  const bestValueSlugs = selectBestValueProducts(products, 5).map((product) => product.slug);
  const premiumSlugs = selectPremiumProducts(products, 5).map((product) => product.slug);
  const dealSlugs = selectDealsProducts(products, 5).map((product) => product.slug);

  for (const slugs of [featuredSlugs, newInSlugs, bestValueSlugs, premiumSlugs, dealSlugs]) {
    assert.equal(slugs.includes('missing-image-laptop'), false);
    assert.equal(slugs.includes('no-image-deal'), false);
  }

  assert.equal(featuredSlugs.includes('visible-laptop'), true);
  assert.equal(featuredSlugs.includes('visible-printer'), true);
  assert.equal(featuredSlugs.includes('discounted-desktop'), true);
  assert.equal(newInSlugs.includes('visible-laptop'), true);
  assert.equal(bestValueSlugs.includes('discounted-desktop'), true);
  assert.equal(premiumSlugs.includes('discounted-desktop'), true);
  assert.equal(dealSlugs.includes('discounted-desktop'), true);
  assert.ok(
    buildUseCaseCollections(products).every((collection) =>
      collection.products.every((product) => product.images?.length || product.image_overrides?.length)
    )
  );
});
