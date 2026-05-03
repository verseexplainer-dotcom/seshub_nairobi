import { readFileSync, writeFileSync } from 'node:fs';

const payloadPath = process.argv[2] || 'output/import-products-final-dry-run/products.normalized.json';
const reportPath = process.argv[3] || 'output/import-products-final-dry-run/supabase_dry_run_preview.json';
const payloads = JSON.parse(readFileSync(payloadPath, 'utf8'));

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function basenameFromUrl(value) {
  try {
    const url = new URL(value);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(pathParts[pathParts.length - 1] || '');
  } catch {
    return '';
  }
}

async function checkImage(image) {
  const item = {
    filename: basenameFromUrl(image),
    image,
    ok: false,
    status: null,
    error: null
  };

  try {
    let response = await fetch(image, { method: 'HEAD' });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(image, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    }
    item.status = response.status;
    item.ok = response.ok || response.status === 206;
  } catch (error) {
    item.error = error instanceof Error ? error.message : String(error);
  }

  return item;
}

async function fetchExistingProducts() {
  const supabaseUrl = asText(process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).replace(/\/$/, '');
  const serviceKey = asText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceKey) {
    return {
      rows: [],
      error: 'Missing PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/products?select=id,slug,title,price_kes,updated_at&limit=5000`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });

    if (!response.ok) {
      return {
        rows: [],
        error: `Supabase products fetch failed with ${response.status}: ${await response.text()}`
      };
    }

    const rows = await response.json();
    return { rows: Array.isArray(rows) ? rows : [], error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const slugCounts = new Map();
for (const payload of payloads) {
  const slug = asText(payload.slug);
  if (!slug) continue;
  slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
}
const duplicateSlugs = [...slugCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([slug]) => slug)
  .sort();

const imageChecks = [];
for (const payload of payloads) {
  for (const image of Array.isArray(payload.images) ? payload.images : []) {
    const check = await checkImage(image);
    imageChecks.push({ slug: payload.slug, ...check });
  }
}
const missingImages = imageChecks.filter((item) => !item.ok);

const { rows: existingRows, error: supabaseError } = await fetchExistingProducts();
const existingBySlug = new Map(existingRows.map((row) => [asText(row.slug), row]).filter(([slug]) => slug));
const payloadBySlug = new Map(payloads.map((row) => [asText(row.slug), row]).filter(([slug]) => slug));

const payloadSlugs = new Set(payloadBySlug.keys());
const existingSlugs = new Set(existingBySlug.keys());
const insertSlugs = [...payloadSlugs].filter((slug) => !existingSlugs.has(slug)).sort();
const updateSlugs = [...payloadSlugs].filter((slug) => existingSlugs.has(slug)).sort();
const possibleRemoveSlugs = [...existingSlugs].filter((slug) => !payloadSlugs.has(slug)).sort();

const report = {
  mode: 'dry-run',
  writes_performed: false,
  delete_missing_performed: false,
  normalized_payload: payloadPath,
  payload_count: payloads.length,
  duplicate_slugs: duplicateSlugs,
  image_validation: {
    checked: imageChecks.length,
    missing_or_unreachable: missingImages.length,
    missing_or_unreachable_examples: missingImages.slice(0, 50)
  },
  supabase_preview: {
    error: supabaseError,
    existing_count: existingRows.length,
    insert_count: insertSlugs.length,
    update_count: updateSlugs.length,
    possible_remove_count: possibleRemoveSlugs.length,
    insert_slugs: insertSlugs,
    update_slugs: updateSlugs,
    possible_remove_slugs: possibleRemoveSlugs,
    insert_preview: insertSlugs.slice(0, 50).map((slug) => payloadBySlug.get(slug)),
    update_preview: updateSlugs.slice(0, 50).map((slug) => payloadBySlug.get(slug)),
    possible_remove_preview: possibleRemoveSlugs.slice(0, 50).map((slug) => existingBySlug.get(slug))
  }
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  payload_count: report.payload_count,
  duplicate_slugs: report.duplicate_slugs.length,
  images_checked: report.image_validation.checked,
  missing_or_unreachable_images: report.image_validation.missing_or_unreachable,
  supabase_error: report.supabase_preview.error,
  existing_count: report.supabase_preview.existing_count,
  insert_count: report.supabase_preview.insert_count,
  update_count: report.supabase_preview.update_count,
  possible_remove_count: report.supabase_preview.possible_remove_count,
  report: reportPath
}, null, 2));
