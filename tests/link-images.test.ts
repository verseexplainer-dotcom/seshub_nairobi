import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('link_images matches Epson L8050 assets without confusing them with L18050', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'epson-ecotank-l8050-photo-printer-color-ink-tank-wi-fi-connectivity1yr-wrty.webp',
    'epson-l8050-3-in-1-wireless-photo-printer-high-volume-low-cost-1yr-wrty.webp',
    'epson-ecotank-l14150-a3-printscancopyfax-wi-fi-business-tank-printer.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

results = {
    'l8050': mod.match_images_smart(
        'epson-l8050-a4-6-colour-photo-printer-ecotank-brand-new',
        'Epson L8050 A4 6-Colour Photo Printer EcoTank Brand New',
        files,
        norm_filenames,
        file_model_keys,
        file_model_signatures,
    ),
    'l18050': mod.match_images_smart(
        'epson-l18050-a3-6-colour-photo-printer-ecotank-brand-new',
        'Epson L18050 A3+ 6-Colour Photo Printer EcoTank Brand New',
        files,
        norm_filenames,
        file_model_keys,
        file_model_signatures,
    ),
}

print(json.dumps(results))
`;

  const result = spawnSync('python3', ['-c', python], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as Record<string, [string[], number, string]>;
  const l8050 = payload.l8050;
  const l18050 = payload.l18050;

  assert.ok(l8050, 'Expected payload.l8050 result to exist.');
  assert.ok(l18050, 'Expected payload.l18050 result to exist.');

  assert.deepEqual(l8050[0], [
    'epson-ecotank-l8050-photo-printer-color-ink-tank-wi-fi-connectivity1yr-wrty.webp',
    'epson-l8050-3-in-1-wireless-photo-printer-high-volume-low-cost-1yr-wrty.webp'
  ]);
  assert.equal(l8050[2], 'model_signature_exact');

  assert.deepEqual(l18050[0], []);
  assert.equal(l18050[2], 'no_match');
});
