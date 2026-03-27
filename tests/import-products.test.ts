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
    ['scripts/import_products_csv.py', '--input', inputPath, '--output-dir', outputDir],
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
