import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('import_products_csv reconstructs rows with trailing helper and images columns', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'import-products-'));
  const inputPath = join(workdir, 'products-final.csv');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    [
      'title,slug,category,brand,price_kes,compare_at_price,short_specs,short_description,description_html,meta_title,meta_description,focus_keyword,search_keywords,condition,warranty,stock_status,Unnamed: 16,Unnamed: 17,Unnamed: 18,Unnamed: 19,images',
      [
        'HP 15s-fq5015nia Intel Core i5 8GB RAM 512GB SSD Brand New',
        'hp-15s-fq5015nia-core-i5-8gb-512gb-ssd-brand-new',
        'laptop',
        'HP',
        '66000',
        '74000',
        'Intel Core i5',
        '8GB RAM',
        '512GB SSD',
        '15.6-inch display',
        'Short description',
        '<p>Description HTML</p>',
        'SEO title',
        'Meta description',
        'Focus keyword',
        'Search keywords',
        'Brand New',
        '1yr warranty',
        'in_stock',
        '',
        'hp-15s-fq5015nia.webp'
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(',')
    ].join('\n'),
    'utf8'
  );

  const result = spawnSync(
    'python3',
    ['tools/python/import_products_csv.py', '--input', inputPath, '--output-dir', outputDir],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prepared rows: 1/);
  assert.match(result.stdout, /Rejected rows: 0/);

  const normalizedCsv = readFileSync(join(outputDir, 'products.normalized.csv'), 'utf8');
  assert.match(normalizedCsv, /hp-15s-fq5015nia-core-i5-8gb-512gb-ssd-brand-new/);
  assert.match(normalizedCsv, /brand_new/);
  assert.match(normalizedCsv, /Intel Core i5, 8GB RAM, 512GB SSD, 15.6-inch display/);
});

test('import_products_csv supports stable primary_image and images suffix columns', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'import-products-stable-'));
  const inputPath = join(workdir, 'products-clean.csv');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    [
      'title,slug,category,brand,price_kes,compare_at_price,short_specs,short_description,description_html,meta_title,meta_description,focus_keyword,search_keywords,condition,warranty,stock_status,primary_image,images',
      [
        'HP EliteBook 830 G8 Intel Core i7 16GB RAM Touchscreen Refurbished',
        'hp-elitebook-830-g8-core-i7-16gb-touchscreen-refurbished',
        'laptop',
        'HP',
        '58000',
        '65000',
        'Intel Core i7',
        '16GB RAM',
        'Windows 11 Pro',
        'Touchscreen',
        'Short summary',
        '<p>Description HTML</p>',
        'SEO title',
        'Meta description',
        'Refurbished',
        '6 months warranty',
        'in_stock',
        'hero-image.webp',
        'hero-image.webp,detail-image.webp'
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(',')
    ].join('\n'),
    'utf8'
  );

  const result = spawnSync(
    'python3',
    ['tools/python/import_products_csv.py', '--input', inputPath, '--output-dir', outputDir],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prepared rows: 1/);
  assert.match(result.stdout, /Rejected rows: 0/);

  const normalizedCsv = readFileSync(join(outputDir, 'products.normalized.csv'), 'utf8');
  assert.match(normalizedCsv, /refurbished/);
  assert.match(normalizedCsv, /hero-image\.webp/);
  assert.match(normalizedCsv, /detail-image\.webp/);
});

test('import_products_csv normalizes missing images to an empty array', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'import-products-no-images-'));
  const inputPath = join(workdir, 'products-clean.csv');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    [
      'title,slug,category,brand,price_kes,compare_at_price,short_specs,short_description,description_html,meta_title,meta_description,focus_keyword,search_keywords,condition,warranty,stock_status,primary_image,images',
      [
        'Samsung Galaxy Note 20 5G 256GB Storage 8GB RAM Refurbished',
        'samsung-galaxy-note-20-5g-256gb-8gb-refurbished',
        'smartphone',
        'Samsung',
        '32000',
        '35900',
        '8GB RAM',
        '256GB Storage',
        'Short description',
        '<p>Description HTML</p>',
        'SEO title',
        'Meta description',
        'Focus keyword',
        'Search keywords',
        'Refurbished',
        '6 months warranty',
        'in_stock',
        '',
        ''
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(',')
    ].join('\n'),
    'utf8'
  );

  const result = spawnSync(
    'python3',
    ['tools/python/import_products_csv.py', '--input', inputPath, '--output-dir', outputDir],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prepared rows: 1/);

  const normalizedCsv = readFileSync(join(outputDir, 'products.normalized.csv'), 'utf8');
  assert.match(normalizedCsv, /\[\]/);
});

test('import_products_csv accepts JSON product rows and writes normalized JSON', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'import-products-json-'));
  const inputPath = join(workdir, 'products.json');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    JSON.stringify(
      {
        products: [
          {
            title: 'Dell Latitude 5420 Intel Core i5 16GB RAM 512GB SSD Refurbished',
            slug: 'dell-latitude-5420-core-i5-16gb-512gb-refurbished',
            category: 'laptops',
            brand: 'Dell',
            price_kes: 42500,
            compare_at_kes: 48000,
            short_specs: ['Intel Core i5', '16GB RAM', '512GB SSD', '14-inch display'],
            description: '<p>Grade A refurbished laptop.</p>',
            seo_title: 'Dell Latitude 5420 laptop',
            meta_description: 'Dell Latitude 5420 refurbished laptop in Kenya.',
            condition: 'refurbished',
            warranty_months: 6,
            in_stock: true,
            images: ['latitude-5420.webp', 'latitude-5420-side.webp']
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );

  const result = spawnSync(
    'python3',
    ['tools/python/import_products_csv.py', '--input', inputPath, '--output-dir', outputDir],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prepared rows: 1/);
  assert.match(result.stdout, /Normalized JSON:/);

  const normalized = JSON.parse(readFileSync(join(outputDir, 'products.normalized.json'), 'utf8'));
  assert.equal(normalized[0].slug, 'dell-latitude-5420-core-i5-16gb-512gb-refurbished');
  assert.equal(normalized[0].category, 'laptops');
  assert.equal(normalized[0].condition, 'refurbished');
  assert.equal(normalized[0].warranty_months, 6);
  assert.deepEqual(normalized[0].images, ['latitude-5420.webp', 'latitude-5420-side.webp']);
});
