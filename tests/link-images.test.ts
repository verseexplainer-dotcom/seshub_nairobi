import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function runPython(code: string) {
  return spawnSync('python3', ['-c', code], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy-service-role-key',
    },
  });
}

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
        product_context=mod.build_product_profile({
            'slug': 'epson-l8050-a4-6-colour-photo-printer-ecotank-brand-new',
            'title': 'Epson L8050 A4 6-Colour Photo Printer EcoTank Brand New',
            'brand': 'Epson',
            'category': 'printers',
        }, None),
    ),
    'l18050': mod.match_images_smart(
        'epson-l18050-a3-6-colour-photo-printer-ecotank-brand-new',
        'Epson L18050 A3+ 6-Colour Photo Printer EcoTank Brand New',
        files,
        norm_filenames,
        file_model_keys,
        file_model_signatures,
        product_context=mod.build_product_profile({
            'slug': 'epson-l18050-a3-6-colour-photo-printer-ecotank-brand-new',
            'title': 'Epson L18050 A3+ 6-Colour Photo Printer EcoTank Brand New',
            'brand': 'Epson',
            'category': 'printers',
        }, None),
    ),
}

print(json.dumps(results))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout) as Record<string, [string[], number, string] | undefined>;
  const l8050 = payload.l8050;
  const l18050 = payload.l18050;

  assert.ok(l8050);
  assert.ok(l18050);

  assert.deepEqual(l8050[0], [
    'epson-ecotank-l8050-photo-printer-color-ink-tank-wi-fi-connectivity1yr-wrty.webp',
    'epson-l8050-3-in-1-wireless-photo-printer-high-volume-low-cost-1yr-wrty.webp',
  ]);
  assert.equal(l18050[0].length, 0);
  assert.equal(l18050[2], 'no_match');
});

test('link_images rejects iPhone 13 base products against Pro and Pro Max images', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'apple-iphone-13-pro-256gb.webp',
    'apple-iphone-13-pro-max-256gb.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'apple-iphone-13-256gb-refurbished',
    'Apple iPhone 13 256GB Storage Refurbished',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'apple-iphone-13-256gb-refurbished',
        'title': 'Apple iPhone 13 256GB Storage Refurbished',
        'brand': 'Apple',
        'category': 'smartphones',
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], []);
  assert.equal(payload[2], 'no_match');
});

test('link_images keeps a validated existing 2TB image instead of downgrading to 1TB storejet files', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'Transcend2TBUSB3.1PortableExternalHardDrive25M3Store.webp',
    'transcend-storejet-25m3-1tb-external-hard-drive-usb-3.1-greengrey.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'transcend-storejet-25m3-portable-external-hard-drive-2tb-usb-brand-new',
    'Transcend StoreJet 25M3 Portable External Hard Drive 2TB Storage Brand New',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'transcend-storejet-25m3-portable-external-hard-drive-2tb-usb-brand-new',
        'title': 'Transcend StoreJet 25M3 Portable External Hard Drive 2TB Storage Brand New',
        'brand': 'Transcend',
        'category': 'accessories',
        'storage_gb': 2048,
        'images': ['Transcend2TBUSB3.1PortableExternalHardDrive25M3Store.webp'],
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], ['Transcend2TBUSB3.1PortableExternalHardDrive25M3Store.webp']);
  assert.equal(payload[2], 'existing_ref');
});

test('link_images keeps Tecno Camon 40 Premier separate from Camon 40 Pro', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'tecno-camon-40-premier-256gb12gb-ram-6.67-144hz-ltpo-amoled-mtk-dimensity-8350-45w-5100mah-50mp-dual-speaker-android-15-ip68ip69-dust-water-resistance-dual-sim.webp',
    'tecno-camon-40-pro-6.78-120hz-amoled-256gb-rom-8gb-ram-8gb-extended-dual-sim-5200mah-45w-galaxy-black.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'tecno-camon-40-premier-12-256gb-5g-brand-new',
    'Tecno Camon 40 Premier 12GB 256GB 5G Brand New',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'tecno-camon-40-premier-12-256gb-5g-brand-new',
        'title': 'Tecno Camon 40 Premier 12GB 256GB 5G Brand New',
        'brand': 'Tecno',
        'category': 'smartphones',
        'storage_gb': 256,
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], [
    'tecno-camon-40-premier-256gb12gb-ram-6.67-144hz-ltpo-amoled-mtk-dimensity-8350-45w-5100mah-50mp-dual-speaker-android-15-ip68ip69-dust-water-resistance-dual-sim.webp',
  ]);
});

test('link_images accepts Apple-prefixed iPhone files for live slugs that omit the brand token', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'apple-iphone-11-128gb.webp',
    'apple-iphone-11-pro-256gb.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'iphone-11-128gb-refurbished',
    'Apple iPhone 11 128GB Refurbished',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'iphone-11-128gb-refurbished',
        'title': 'Apple iPhone 11 128GB Refurbished',
        'brand': 'Apple',
        'category': 'smartphones',
        'storage_gb': 128,
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], ['apple-iphone-11-128gb.webp']);
});

test('link_images rejects Lenovo T450 images for T440s products', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'lenovo-thinkpad-t450-core-i5-hdd-500gb-ram-8gb-14-inches-refurbished.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'lenovo-thinkpad-t440s-core-i5-8gb-500gb-ssd-refurbished',
    'Lenovo ThinkPad T440s Intel Core i5 8GB RAM 500GB SSD Refurbished',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'lenovo-thinkpad-t440s-core-i5-8gb-500gb-ssd-refurbished',
        'title': 'Lenovo ThinkPad T440s Intel Core i5 8GB RAM 500GB SSD Refurbished',
        'brand': 'Lenovo',
        'category': 'laptops',
        'storage_gb': 500,
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], []);
  assert.equal(payload[2], 'no_match');
});

test('link_images accepts same-model laptop images across trim differences', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'hp-refurbished-elitebook-840-g8-intel-core-i5-1135g7-11th-gen-quad-core-4-core-2.40-ghz-16-gb-ram-256-gb-ssd-windows-11.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'hp-elitebook-840-g8-core-i7-16gb-512gb-ssd-refurbished',
    'HP EliteBook 840 G8 Intel Core i7 16GB RAM 512GB SSD Refurbished',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'hp-elitebook-840-g8-core-i7-16gb-512gb-ssd-refurbished',
        'title': 'HP EliteBook 840 G8 Intel Core i7 16GB RAM 512GB SSD Refurbished',
        'brand': 'HP',
        'category': 'laptops',
        'storage_gb': 512,
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], [
    'hp-refurbished-elitebook-840-g8-intel-core-i5-1135g7-11th-gen-quad-core-4-core-2.40-ghz-16-gb-ram-256-gb-ssd-windows-11.webp',
  ]);
  assert.equal(payload[2], 'model_identity_match');
});

test('link_images accepts same-model Galaxy files when the product slug omits the Samsung prefix', () => {
  const python = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location('link_images', 'scripts/link_images.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = [
    'samsung-galaxy-z-flip-4-5g-8gb-ram-128gb-rom-storage-duos-one-physical-one-e-sim-phantom-black.webp',
]

norm_filenames = [mod.normalize(name) for name in files]
file_model_keys = [mod.extract_model_key(name) for name in files]
file_model_signatures = [mod.extract_model_signature(name) for name in files]

result = mod.match_images_smart(
    'galaxy-z-flip-4-8-ex-us-grade-a-512gb-refurbished',
    'Galaxy Z Flip 4 8GB 512GB Refurbished',
    files,
    norm_filenames,
    file_model_keys,
    file_model_signatures,
    product_context=mod.build_product_profile({
        'slug': 'galaxy-z-flip-4-8-ex-us-grade-a-512gb-refurbished',
        'title': 'Galaxy Z Flip 4 8GB 512GB Refurbished',
        'brand': 'Galaxy',
        'category': 'smartphones',
        'storage_gb': 512,
    }, None),
)

print(json.dumps(result))
`;

  const result = runPython(python);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as [string[], number, string];
  assert.deepEqual(payload[0], [
    'samsung-galaxy-z-flip-4-5g-8gb-ram-128gb-rom-storage-duos-one-physical-one-e-sim-phantom-black.webp',
  ]);
  assert.equal(payload[2], 'model_identity_match');
});
