import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllProducts } from '../src/lib/products';
import { buildProductJsonLd, buildProductsItemCollectionJsonLd } from '../src/lib/structuredData';
import { GET as getProductsJsonLd } from '../src/pages/products-jsonld-schema.json';
import type { CatalogProduct } from '../src/types/catalog';

function createProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'prod-1',
    slug: 'hp-elitebook-840-g5',
    title: 'HP EliteBook 840 G5',
    category: 'Laptops',
    price_kes: 42000,
    compare_at_kes: null,
    in_stock: true,
    stock_qty: 3,
    brand: 'HP',
    condition: 'refurbished',
    refurb_grade: 'grade_a',
    short_specs: 'Intel Core i5, 8GB RAM, 256GB SSD',
    description: '<p>Clean laptop for school and office work.</p>',
    warranty_months: 6,
    images: ['folder/sample product.webp'],
    image_overrides: [],
    sku: 'SES-HP-840-G5',
    ...overrides
  };
}

test('product JSON-LD maps Ex-uk Grade A refurb products without fake ratings', () => {
  const jsonLd = buildProductJsonLd(createProduct(), {
    siteBase: 'https://sesicthub.co.ke',
    publicSupabaseUrl: 'https://project.supabase.co'
  });

  assert.equal(jsonLd.itemCondition, 'https://schema.org/RefurbishedCondition');
  assert.match(jsonLd.description, /Ex-uk Grade A refurb/);
  assert.equal(jsonLd.offers.url, 'https://sesicthub.co.ke/product/hp-elitebook-840-g5');
  assert.equal(jsonLd.offers.price, '42000');
  assert.deepEqual(jsonLd.image, [
    'https://project.supabase.co/storage/v1/object/public/product-images/folder/sample%20product.webp'
  ]);
  assert.equal('aggregateRating' in jsonLd, false);
});

test('product JSON-LD leaves brand-new products as brand new', () => {
  const jsonLd = buildProductJsonLd(
    createProduct({
      condition: 'brand_new',
      refurb_grade: null,
      title: 'HP Victus Brand New',
      description: ''
    })
  );

  assert.equal(jsonLd.itemCondition, 'https://schema.org/NewCondition');
  assert.match(jsonLd.description, /Brand New/);
  assert.doesNotMatch(jsonLd.description, /Ex-uk Grade A refurb/);
});

test('product collection JSON-LD wraps products as positioned list items', () => {
  const products = [
    createProduct({ slug: 'first-product', title: 'First product' }),
    createProduct({ slug: 'second-product', title: 'Second product' })
  ];
  const collection = buildProductsItemCollectionJsonLd(products);

  assert.equal(collection['@type'], 'ItemCollection');
  assert.equal(collection.itemListElement.length, 2);
  assert.equal(collection.itemListElement[0]?.position, 1);
  assert.equal(collection.itemListElement[0]?.item['@type'], 'Product');
  assert.equal(collection.itemListElement[1]?.item.offers.url, 'https://sesicthub.co.ke/product/second-product');
});

test('products JSON-LD endpoint returns current catalog collection', async () => {
  const response = await getProductsJsonLd();
  const payload = await response.json() as ReturnType<typeof buildProductsItemCollectionJsonLd>;

  assert.equal(response.headers.get('Content-Type'), 'application/ld+json; charset=utf-8');
  assert.equal(payload['@type'], 'ItemCollection');
  assert.equal(payload.itemListElement.length, getAllProducts().length);
  assert.equal(payload.itemListElement.some((entry) => 'aggregateRating' in entry.item), false);
});
