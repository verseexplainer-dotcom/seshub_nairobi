import { readFileSync, writeFileSync } from 'node:fs';

const payloadPath = 'output/import-products-final-dry-run/products.normalized.json';
const reportPath = 'output/import-products-final-dry-run/live-products-replacement-preview.json';
const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
const supabaseUrl = (process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase env');
}

const response = await fetch(`${supabaseUrl}/rest/v1/products?select=id,slug,title,price_kes&limit=5000`, {
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`
  }
});

if (!response.ok) {
  throw new Error(`Fetch failed ${response.status}: ${await response.text()}`);
}

const existing = await response.json();
const payloadBySlug = new Map(payload.map((row) => [row.slug, row]));
const existingBySlug = new Map(existing.map((row) => [row.slug, row]));
const insert = [...payloadBySlug.keys()].filter((slug) => !existingBySlug.has(slug)).sort();
const update = [...payloadBySlug.keys()].filter((slug) => existingBySlug.has(slug)).sort();
const remove = [...existingBySlug.keys()].filter((slug) => !payloadBySlug.has(slug)).sort();

const report = {
  writes_performed: false,
  delete_missing_performed: false,
  payload_count: payload.length,
  existing_count: existing.length,
  insert_count: insert.length,
  update_count: update.length,
  remove_count: remove.length,
  insert_slugs: insert,
  update_slugs: update,
  remove_slugs: remove,
  insert_preview: insert.slice(0, 25).map((slug) => payloadBySlug.get(slug)),
  update_preview: update.slice(0, 25).map((slug) => payloadBySlug.get(slug)),
  remove_preview: remove.slice(0, 50).map((slug) => existingBySlug.get(slug))
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  payload_count: report.payload_count,
  existing_count: report.existing_count,
  insert_count: report.insert_count,
  update_count: report.update_count,
  remove_count: report.remove_count,
  report: reportPath
}, null, 2));
