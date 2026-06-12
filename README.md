# SES ICT HUB Storefront

Astro + Supabase storefront for **SES ICT HUB**, deployed exclusively as a **Cloudflare Worker**.

This repository powers the SES ICT HUB ecommerce storefront, product catalog, checkout routes, customer account callbacks, newsletter capture, and server-side event tracking.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Requirements](#requirements)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Supabase Setup](#supabase-setup)
7. [Local Development](#local-development)
8. [Docker Development](#docker-development)
9. [Quality Gates](#quality-gates)
10. [Catalog Data Tools](#catalog-data-tools)
11. [Deployment](#deployment)
12. [API Routes](#api-routes)
13. [Codex / AI Workflow Notes](#codex--ai-workflow-notes)
14. [Operational Guardrails](#operational-guardrails)

---

## Tech Stack

* **Astro** with `output: server`
* **Cloudflare Workers** via `@astrojs/cloudflare`
* **Supabase Postgres** with RLS enabled
* **Supabase Storage** for product and site assets
* **Wrangler** for Worker deployment
* **TypeScript**
* **Vanilla CSS**
* **Python** helper scripts for catalog and image data tasks

---

## Project Structure

```text
/
├── src/
│   ├── pages/              # Storefront pages and Astro API routes
│   ├── components/         # Reusable UI components
│   ├── lib/                # Supabase clients, helpers, utilities
│   └── content/            # Reserved for Astro content collections
│
├── docs/                   # Architecture, design, API, content, and data notes
├── supabase/               # Schema, sync, verification, policies, migrations
├── scripts/                # Deployment and automation scripts
├── tools/
│   ├── node/               # Node-based validation/upload tools
│   └── python/             # Catalog audit and image matching tools
│
├── ai/                     # Agent guardrails, prompts, skills, and design notes
├── wrangler.jsonc          # Cloudflare Worker runtime config
├── package.json
└── README.md
```

### Guardrail and Copy-Control Files

```text
ai/
├── AGENTS.md
├── GUARDRAILS.md
├── BRAND.md
├── PROMPTS.md
├── SKILLS.md
├── agents/
├── codex/
├── codex-skills/
├── design/
└── prompts/
```

Important docs:

| File                         | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `docs/design.md`             | Dark-first storefront visual design system  |
| `docs/homepage-spec.md`      | Homepage structure and content expectations |
| `docs/product-page-spec.md`  | Product detail page requirements            |
| `docs/data-quality-rules.md` | Catalog rules and product data expectations |
| `docs/api-map.md`            | API route reference                         |
| `supabase/schema.sql`        | Canonical database schema                   |
| `supabase/policies.sql`      | RLS policy reference                        |
| `scripts/deploy-worker.sh`   | Locked Cloudflare Worker deployment script  |

---

## Requirements

* Node.js **20+**
* npm **10+**
* Python 3
* Python packages from:

```bash
tools/python/requirements.txt
```

* Supabase project with these public Storage buckets:

  * `product-images`
  * `site-assets`
* Cloudflare account with Worker deployment access
* Wrangler-compatible Cloudflare API token

---

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local site:

```text
http://localhost:4321/
```

Before pushing or deploying:

```bash
npm run validate
```

Deploy only after validation passes:

```bash
npm run deploy
```

---

## Environment Variables

Create `.env.local` for local development.

Use `.env` only when your local workflow requires it. Do **not** commit real secrets.

```env
PUBLIC_SUPABASE_URL=https://<project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

PUBLIC_FALLBACK_IMAGE_URL=https://<project>.supabase.co/storage/v1/object/public/site-assets/product-placeholder.webp

PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>

PUBLIC_META_PIXEL_ID=<meta-pixel-id>
META_PIXEL_ID=<meta-pixel-id>
META_CAPI_TOKEN=<meta-conversions-api-token>

MESSENGER_VERIFY_TOKEN=<messenger-webhook-verify-token>
MESSENGER_PAGE_ACCESS_TOKEN=<messenger-page-access-token>
FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>

WHATSAPP_TOKEN=<whatsapp-cloud-api-token>
WHATSAPP_PHONE_NUMBER_ID=<whatsapp-phone-number-id>
WHATSAPP_NOTIFY_TO=<internal-alert-recipient-phone>

CLOUDFLARE_API_TOKEN=<deploy-token>
```

You may also export the Cloudflare token from your shell or CI environment:

```bash
export CLOUDFLARE_API_TOKEN='<your-token>'
```

### Environment Variable Groups

| Group                          | Variables                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Supabase public client         | `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`                                                 |
| Supabase trusted server routes | `SUPABASE_SERVICE_ROLE_KEY`                                                                       |
| Product fallback assets        | `PUBLIC_FALLBACK_IMAGE_URL`                                                                       |
| Turnstile protection           | `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                               |
| Meta tracking                  | `PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`                                        |
| Messenger integration          | `MESSENGER_VERIFY_TOKEN`, `MESSENGER_PAGE_ACCESS_TOKEN`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| WhatsApp integration           | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_TO`                                |
| Cloudflare deploy              | `CLOUDFLARE_API_TOKEN`                                                                            |

### Supabase Auth Redirects

Add these redirect URLs in Supabase Auth settings:

```text
https://<your-domain>/api/auth/callback
http://127.0.0.1:<port>/api/auth/callback
```

Customer account login currently uses email/password. Keep the callback URLs above enabled for email confirmation and password reset flows.

---

## Supabase Setup

### Recommended Setup for New Projects

Run the following SQL files in the Supabase SQL Editor:

```text
supabase/schema.sql
supabase/schema_sync_2026_03_08.sql
supabase/schema_verify_2026_03_09.sql
```

Expected result from the verification script:

```text
OK
```

Then:

1. Import your product CSV into `public.products`.
2. Optional: run `supabase/seed_testimonials.sql`.

### Existing or Legacy Projects

For older databases, run:

```text
supabase/alter_existing_schema.sql
supabase/schema_sync_2026_03_08.sql
supabase/schema_verify_2026_03_09.sql
```

Expected result from the verification script:

```text
OK
```

Optional:

```text
supabase/seed_testimonials.sql
```

### Schema Compatibility Notes

* `supabase/schema.sql` is the canonical schema source.
* `supabase/production_schema.sql` is still supported for compatibility.
* Older projects must rerun the sync and verify scripts to restore locked-down RPC grants.
* Public direct inserts are intentionally blocked on:

  * `order_intents`
  * `events`
  * `newsletter_signups`
* Writes to those tables should go through trusted Astro API routes under `src/pages/api/*` using `SUPABASE_SERVICE_ROLE_KEY`.

---

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run checks before committing:

```bash
npm run validate
```

---

## Docker Development

Docker is for local development and validation only.

Production deployment must remain the Cloudflare Worker flow.

Start the local Docker environment:

```bash
docker compose up --build
```

Open:

```text
http://localhost:4321/
```

Run validation inside Docker:

```bash
docker compose run --rm app npm run validate
```

Secrets should stay in `.env.local`. The Docker image ignores `.env` files so credentials are not baked into the image. During Docker runs, the project folder is mounted into the container and Astro reads `.env.local` from the mounted project directory.

---

## Quality Gates

Run individual checks:

```bash
npm run lint
npm run test
npm run build
npm run routes:check
npm run content:check
npm run repo:audit
```

Run the full validation suite:

```bash
npm run validate
```

Use `npm run validate` before every deployment.

---

## Catalog Data Tools

### Verify Live Schema and RLS Hardening

Run in Supabase SQL Editor:

```text
supabase/schema_verify_2026_03_09.sql
```

### Audit Live Catalog Data

```bash
python3 tools/python/audit_catalog.py
```

### Audit Built Snapshot

```bash
python3 tools/python/audit_catalog.py --source dist
```

### Link Product Images

Dry run with confidence threshold and manual overrides:

```bash
python3 tools/python/link_images.py \
  --dry-run \
  --min-confidence 0.80 \
  --overrides-file tools/python/image_overrides.json
```

Use this template for manual image mapping:

```text
tools/python/image_overrides.example.json
```

### Sync Matched Images from CSV

```bash
python3 tools/python/sync_images_from_csv.py \
  --input /path/to/products_with_matched_images.csv
```

### Upload Missing Local Images to Supabase Storage

```bash
node tools/node/upload-supabase-assets.mjs \
  --bucket product-images \
  --missing-only \
  --dry-run
```

---

## Deployment

Production deployment is **Cloudflare Worker only**.

```bash
npm run deploy
```

The deploy command uses:

```text
scripts/deploy-worker.sh
```

The deploy script enforces:

* `CLOUDFLARE_API_TOKEN` must be set.
* `wrangler.jsonc` account id must match:

```text
e1d8076a3dc603837814ca828736561f
```

Recommended deployment flow:

```bash
npm run validate
npm run deploy
```

Do not deploy if validation fails.

---

## API Routes

| Method | Route                       | Purpose                       |
| ------ | --------------------------- | ----------------------------- |
| `GET`  | `/api/search/suggest?q=...` | Product search suggestions    |
| `POST` | `/api/checkout/whatsapp`    | WhatsApp checkout intent flow |
| `POST` | `/api/newsletter`           | Newsletter signup             |
| `GET`  | `/api/auth/callback`        | Supabase auth callback        |
| `GET`  | `/api/auth/logout`          | Customer logout               |

---

## Codex / AI Workflow Notes

Globally available skills:

* `cloudflare-deploy`
* `spreadsheet`
* `figma`
* `figma-implement-design`
* `notion-spec-to-implementation`

Project review skills installed on March 27, 2026:

* `frontend-skill`
* `playwright`
* `security-best-practices`
* `sentry`

Repo-specific companion notes live in:

```text
ai/codex-skills/
```

Restart Codex after installing new global skills so future sessions can discover them.

---

## Operational Guardrails

* Deploy only to Cloudflare Workers.
* Do not introduce Supabase Edge Functions unless the architecture is intentionally changed.
* Astro API routes under `src/pages/api/*` are the only API runtime path.
* Do not allow public `anon` or `authenticated` direct inserts into protected write tables.
* Use `SUPABASE_SERVICE_ROLE_KEY` only in trusted server-side API routes.
* Keep real secrets out of Git.
* Run `npm run validate` before deployment.
* Browser analytics should not write directly to `/api/events`.
* Trusted server routes are responsible for allowed event writes.

---

## Troubleshooting

### Supabase verification does not return `OK`

Rerun the sync script, then rerun verification:

```text
supabase/schema_sync_2026_03_08.sql
supabase/schema_verify_2026_03_09.sql
```

### Deploy fails because `CLOUDFLARE_API_TOKEN` is missing

Set the token in `.env.local`, `.env`, shell, or CI:

```bash
export CLOUDFLARE_API_TOKEN='<your-token>'
```

### Local auth callback fails

Confirm this URL is present in Supabase Auth redirect allowlists:

```text
http://127.0.0.1:<port>/api/auth/callback
```

### Docker starts but environment values are missing

Check that `.env.local` exists in the project root. The Docker image does not bake `.env` files into the image.

