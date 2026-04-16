import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('sync_images_from_csv normalizes matched image lists into updates', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'ses-images-'));
  const csvPath = join(tempDir, 'products.csv');
  writeFileSync(
    csvPath,
    [
      'id,slug,matched_images',
      'prod-1,test-product,"[""folder/image one (2).webp"", ""product-images/folder/image one (2).webp""]"',
      'prod-2,second-product,"https://project.supabase.co/storage/v1/object/public/product-images/folder/second-image.webp"',
      'prod-3,missing-images,""'
    ].join('\n'),
    'utf8'
  );

  const python = `
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync_images_from_csv', 'scripts/sync_images_from_csv.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

rows = mod.read_csv_rows(Path(${JSON.stringify(csvPath)}))
updates, skipped = mod.build_updates(rows)

print(json.dumps({'updates': updates, 'skipped': skipped}))
`;

  const result = spawnSync('python3', ['-c', python], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as {
    updates: Array<{ slug: string; images: string[]; image_overrides: string[]; source_column: string }>;
    skipped: Array<{ slug: string; reason: string }>;
  };

  assert.equal(payload.updates.length, 2);
  assert.deepEqual(payload.updates[0], {
    id: 'prod-1',
    slug: 'test-product',
    source_column: 'matched_images',
    images: ['folder/image one (2).webp'],
    image_overrides: ['folder/image one (2).webp']
  });
  assert.deepEqual(payload.updates[1], {
    id: 'prod-2',
    slug: 'second-product',
    source_column: 'matched_images',
    images: ['folder/second-image.webp'],
    image_overrides: ['folder/second-image.webp']
  });
  assert.deepEqual(payload.skipped, [{ id: 'prod-3', slug: 'missing-images', reason: 'no_images' }]);
});
