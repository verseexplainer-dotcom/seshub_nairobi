---
name: frontend-skill
description: Project-specific companion guidance for the official frontend-skill when working in the SES ICT HUB Astro storefront. Use when homepage, category, product-page, or mobile UX changes need to stay inside the existing Supabase product schema and Astro performance model.
---

# Frontend Skill

Use this skill as the storefront-specific overlay on top of the official `frontend-skill`.

## Workflow

1. Re-read `AGENTS.md` before editing. That file defines the allowed schema, category set, image fallback rules, and conversion behavior.
2. Start from the route entry file, then inspect the supporting components:
   - `src/pages/index.astro`
   - `src/pages/shop.astro`
   - `src/pages/category/[slug].astro`
   - `src/pages/product/[slug].astro`
   - `src/components/`
3. Keep catalog logic centralized. Reuse helpers from:
   - `src/lib/productPresentation.ts`
   - `src/lib/storefront.ts`
   - `src/lib/siteAssets.ts`
4. Prefer markup and CSS changes over extra client-side JavaScript. Preserve Astro SSR, lazy-loading, and lightweight page behavior.
5. Verify the changed route on desktop and mobile widths, then run the relevant project checks.

## Storefront priorities

- Strengthen homepage hierarchy, trust cues, featured-product presentation, and category discovery.
- Keep category pages grounded in valid breadcrumb, product-count, sort, and filter behavior only.
- Keep product pages grounded in real fields for savings, stock, warranty, specs, and related products.
- Preserve the mobile 2-column catalog grid, readable titles, and large tap targets.

## Guardrails

- Hide missing specs instead of fabricating them.
- Do not invent review data, ratings, marketing copy fields, or accessory compatibility fields.
- Keep out-of-stock behavior aligned with `in_stock` and `stock_qty`.
- Do not add heavy UI libraries without approval.
- Do not duplicate category or pricing logic inside page files just to style a section.

## Verification

- Run `npm run lint`.
- Run `npm run test` when presentation helpers or catalog rendering changed.
- Manually check the changed routes locally when layout or interaction changed.

## Reference

- Read `references/storefront-ui-checklist.md` for route-by-route checks.
