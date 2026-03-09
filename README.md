# SES ICT HUB Storefront

Astro + Supabase storefront for SES ICT HUB, deployed only as a **Cloudflare Worker**.

## Stack
- Astro (`output: server`) with `@astrojs/cloudflare`
- Supabase Postgres + Storage (RLS enabled)
- Cloudflare Workers + Wrangler
- TypeScript + vanilla CSS

## Project Layout
- `src/pages` storefront pages and API routes (`/api/*`)
- `src/components` UI components
- `src/lib` shared clients/utilities
- `supabase/*.sql` schema + migration scripts
- `wrangler.jsonc` Worker runtime config
- `scripts/deploy-worker.sh` locked deploy script

## Requirements
- Node.js 20+
- npm 10+
- Supabase project with Storage buckets:
  - `product-images` (public)
  - `site-assets` (public)

## Supabase Setup
Canonical path (recommended):
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Run `supabase/schema_sync_2026_03_08.sql`.
3. Run `supabase/schema_verify_2026_03_09.sql` (must return `OK`).
4. Import your products CSV into `public.products`.
5. Optional: run `supabase/seed_testimonials.sql`.

Existing/legacy projects:
1. Run `supabase/alter_existing_schema.sql`.
2. Run `supabase/schema_sync_2026_03_08.sql`.
3. Run `supabase/schema_verify_2026_03_09.sql` (must return `OK`).
4. Optional: run `supabase/seed_testimonials.sql`.

Compatibility note:
- `supabase/production_schema.sql` is still supported, but `schema.sql` is the canonical source.
- Public (`anon/authenticated`) direct inserts are intentionally blocked on `order_intents`, `events`, and `newsletter_signups`.
  All writes should go through `src/pages/api/*` routes using `SUPABASE_SERVICE_ROLE_KEY`.

## Environment Variables
Create `.env.local`:

```env
PUBLIC_SUPABASE_URL=https://<project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PUBLIC_FALLBACK_IMAGE_URL=https://<project>.supabase.co/storage/v1/object/public/site-assets/product-placeholder.webp
```

Set Cloudflare deploy token in shell/CI (do not commit):

```bash
export CLOUDFLARE_API_TOKEN='<your-token>'
```

Locked deploy account id is set in `wrangler.jsonc`:
- `e1d8076a3dc603837814ca828736561f`

## Local Development
```bash
npm install
npm run dev
```

## Quality Gates
```bash
npm run lint
npm run test
npm run build
npm run validate
```

## Catalog Data Quality Tools
```bash
# Verify live schema parity and RLS hardening
# (Run in Supabase SQL Editor)
# supabase/schema_verify_2026_03_09.sql

# Audit duplicates / suspicious specs (live DB)
python3 scripts/audit_catalog.py

# Audit built snapshot instead of DB
python3 scripts/audit_catalog.py --source dist

# Link product images with confidence threshold + optional manual overrides
python3 scripts/link_images.py --dry-run --min-confidence 0.80 --overrides-file scripts/image_overrides.json
```

Use `scripts/image_overrides.example.json` as a template for manual image mapping overrides.

## Deploy (Cloudflare Worker Only)
```bash
npm run deploy
```

`npm run deploy` uses `scripts/deploy-worker.sh`, which enforces:
- `CLOUDFLARE_API_TOKEN` is set
- `wrangler.jsonc` account id matches `e1d8076a3dc603837814ca828736561f`

## API Endpoints
- `GET /api/search/suggest?q=...`
- `POST /api/checkout/whatsapp`
- `POST /api/events`
- `POST /api/newsletter`

## Notes
- Supabase Edge Functions are **not required**.
- Astro API routes under `src/pages/api/*` are the only API runtime path.
