# Storefront UI Checklist

Use this checklist after homepage, category, product-page, or shared catalog UI changes.

## Route map

- `/` uses `src/pages/index.astro` and the homepage components.
- `/shop` uses `src/pages/shop.astro` and `src/components/CatalogListing.astro`.
- `/category/[slug]` delegates to `CatalogListing` through `src/pages/category/[slug].astro`.
- `/product/[slug]` uses the gallery, trust chips, and sticky add-to-cart flow in `src/pages/product/[slug].astro`.

## Acceptance checks

- Product cards never show broken images.
- Specs render only when the matching DB field exists.
- Savings render only when `compare_at_kes` is higher than `price_kes`.
- Warranty badges render only when `warranty_months` exists.
- Out-of-stock items disable add-to-cart and still provide the WhatsApp path.
- Category and product titles remain readable on a narrow mobile viewport.
- Catalog grids stay at two columns on mobile unless a route already proves that is unsafe.
- New decorative UI does not require extra marketing fields or extra client-side state.

## Quick verification

- Run `npm run lint`.
- Run `npm run test` when shared catalog logic changed.
- Manually check `/`, `/shop`, one category route, and one product route on desktop and mobile widths.
