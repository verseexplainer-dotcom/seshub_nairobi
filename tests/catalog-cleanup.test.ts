import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const fieldnames = [
  'slug',
  'title',
  'category',
  'condition',
  'refurb_grade',
  'short_specs',
  'description',
  'warranty_months',
  'ram_gb',
  'storage_gb',
  'in_stock',
  'stock_qty',
  'brand',
  'seo_title',
  'screen_in'
];

function buildCsv(rows: Array<Record<string, string>>) {
  const lines = [
    fieldnames.join(','),
    ...rows.map((row) => fieldnames.map((field) => row[field] ?? '').join(','))
  ];
  return `${lines.join('\n')}\n`;
}

function parseCsv(content: string) {
  const [headerLine, ...rowLines] = content.trim().split('\n');
  assert.ok(headerLine, 'CSV content must include a header row');
  const headers = headerLine.split(',');
  return rowLines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

test('clean_catalog_data normalizes laptop grades and reports invalid laptop rows', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'catalog-cleanup-'));
  const inputPath = join(workdir, 'products.csv');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    buildCsv([
      {
        slug: 'laptop-grade-b',
        title: 'HP EliteBook 840 G5',
        category: 'Laptops',
        condition: 'refurbished',
        refurb_grade: 'grade_b',
        in_stock: 'true',
        brand: 'HP'
      },
      {
        slug: 'laptop-brand-new',
        title: 'Dell Latitude 5400',
        category: 'Laptops',
        condition: 'brand_new',
        refurb_grade: 'grade_a',
        in_stock: 'true',
        brand: 'Dell'
      },
      {
        slug: 'laptop-invalid-condition',
        title: 'Mystery Laptop',
        category: 'Laptops',
        condition: 'unknown',
        refurb_grade: 'grade_c',
        in_stock: 'true',
        brand: 'Lenovo'
      }
    ]),
    'utf8'
  );

  const result = spawnSync('python3', ['scripts/clean_catalog_data.py', '--input', inputPath, '--output-dir', outputDir], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Rejected rows: 1/);

  const cleanedCsv = parseCsv(readFileSync(join(outputDir, 'products_rows.cleaned.csv'), 'utf8'));
  const report = JSON.parse(readFileSync(join(outputDir, 'catalog_cleanup_report.json'), 'utf8')) as {
    changed_rows: Array<{ slug: string; changes: Record<string, string> }>;
    rejected_rows: Array<{ slug: string; errors: string[] }>;
  };

  const refurbishedLaptop = cleanedCsv.find((row) => row.slug === 'laptop-grade-b');
  const brandNewLaptop = cleanedCsv.find((row) => row.slug === 'laptop-brand-new');
  assert.equal(refurbishedLaptop?.refurb_grade, 'grade_a');
  assert.equal(brandNewLaptop?.refurb_grade, '');

  assert.deepEqual(
    report.changed_rows.find((row) => row.slug === 'laptop-grade-b')?.changes.refurb_grade,
    'grade_a'
  );
  assert.deepEqual(
    report.changed_rows.find((row) => row.slug === 'laptop-brand-new')?.changes.refurb_grade,
    ''
  );
  assert.equal(report.rejected_rows.length, 1);
  assert.equal(report.rejected_rows[0]?.slug, 'laptop-invalid-condition');
});

test('clean_catalog_data refuses live apply when invalid laptop rows remain', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'catalog-cleanup-apply-'));
  const inputPath = join(workdir, 'products.csv');
  const outputDir = join(workdir, 'output');

  writeFileSync(
    inputPath,
    buildCsv([
      {
        slug: 'laptop-invalid-condition',
        title: 'Mystery Laptop',
        category: 'Laptops',
        condition: 'unknown',
        refurb_grade: 'grade_c',
        in_stock: 'true',
        brand: 'Lenovo'
      }
    ]),
    'utf8'
  );

  const result = spawnSync(
    'python3',
    ['scripts/clean_catalog_data.py', '--input', inputPath, '--output-dir', outputDir, '--apply-supabase'],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /manual review first/i);
});
