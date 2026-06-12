# SES ICT HUB Agent Instructions

Use this file as the detailed working guide for agents in this repository. Shorter summaries live in `AGENTS.md` and `ai/GUARDRAILS.md`.

## Project Context

This is the SES ICT HUB Astro storefront for a Nairobi electronics shop. The app runs on Cloudflare Workers, uses Supabase for product data, auth, and storage, and keeps API routes under `src/pages/api/*`.

Primary storefront priorities:

1. Homepage
2. Shop page
3. Product cards
4. Single product page

Before changing storefront UI, read the relevant docs:

- `docs/ses-ecommerce-design-guidelines.md`
- `docs/design.md`
- `docs/homepage-spec.md`
- `docs/product-page-spec.md`
- `docs/content-rules.md`
- `docs/data-quality-rules.md`

## Design Direction

- Build mobile-first.
- Keep the SES brand style: white and light grey backgrounds, dark navy text, SES blue buttons, rounded cards, and clean spacing.
- Product images should be large, clean, and consistent in square cards.
- Product images are usually 1000 x 1000 px. Avoid layouts that crop the product awkwardly.
- Keep Add to Cart buttons clear and easy to tap.
- Keep WhatsApp/contact access available without covering product actions.
- Use the existing Astro, TypeScript, and vanilla CSS patterns.
- Do not introduce a new UI framework or major dependency without approval.

## Product Copy

Customer-facing text should sound like a practical shop assistant, not SaaS marketing.

Use:

- "Refurbished" instead of "Refurb"
- "In Stock" instead of "Stock"
- "If you need help, message us on WhatsApp"
- "One of our team will assist you"
- "We can help you confirm before you buy"

Avoid:

- hype
- fake urgency
- "journey"
- "flow"
- "seamless"
- "optimize"
- "shortlist"
- "switch to WhatsApp"

Do not duplicate savings or discount messages. Only show savings when `compare_at_kes` is present and greater than `price_kes`.

## Product Data Rules

Use the current product schema as the source of truth. Important fields include:

- `slug`
- `title`
- `category`
- `price_kes`
- `compare_at_kes`
- `in_stock`
- `stock_qty`
- `brand`
- `condition`
- `refurb_grade`
- `short_specs`
- `description`
- `warranty_months`
- `images`
- `image_overrides`
- `featured_home`
- `featured_rank`
- `sku`
- `status`
- `cpu`
- `ram_gb`
- `storage_gb`
- `storage_type`
- `screen_in`
- `collections`
- `tags`
- `seo_title`
- `meta_description`

Show clean product specs such as processor, RAM, storage, and display where available. If a field is empty, hide it. Do not fabricate specs, warranty, stock, condition, reviews, ratings, or popularity claims.

Allowed storefront categories:

- Laptops
- Smartphones
- Printers
- Desktops
- Accessories

Source rows tagged as `storage` should be treated as Accessories.

## Image Rules

Product image priority:

1. `image_overrides`
2. `images`
3. fallback image

Products should never render with broken images.

For image matching work:

- Use exact object names from the Supabase Storage `product-images` bucket.
- Keep database values as storage filenames/object paths, not rewritten public URLs.
- Run dry runs before applying image updates.
- Prefer leaving a product unmatched over assigning a weak or misleading image.
- Use manual overrides for ambiguous products instead of loosening match rules broadly.

Useful tools:

```bash
python3 tools/python/link_images.py --dry-run
python3 tools/python/link_images.py --dry-run --only-missing-images
python3 tools/python/link_images.py --dry-run --overrides-file tools/python/image_overrides.json
python3 tools/python/sync_images_from_csv.py --input /path/to/products.csv
```

Apply live Supabase image updates only when the user has asked for that change.

## Platform Guardrails

- Keep Astro configured for Cloudflare Workers.
- Keep API routes under `src/pages/api/*`.
- Do not introduce Supabase Edge Functions.
- Do not move writes to the browser.
- Do not expose service-role keys to client code.
- Do not weaken RLS assumptions.
- Keep TypeScript and vanilla CSS unless a change is explicitly approved.
- Do not change checkout, payment, cart, order, webhook, or API logic unless the requested UI change directly requires it.

Ask before:

- changing database schema
- deleting files
- refactoring large areas of code
- adding major dependencies
- modifying production data
- deploying to production

## Verification

Use checks that match the change size. For larger storefront changes, run:

```bash
npm run lint
npm run test
npm run build
npm run copy:check
npm run routes:check
npm run repo:audit
```

Run `npm run env:check` before local deploys or machine setup work.
