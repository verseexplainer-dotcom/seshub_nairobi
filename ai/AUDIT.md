# Audit Checklist

Use this before merging larger storefront changes.

## Local Checks

```bash
npm run lint
npm run test
npm run build
npm run copy:check
npm run routes:check
npm run repo:audit
```

Run `npm run env:check` before local deploy or when setting up a new machine.

## Storefront Review

- Product cards show only real schema fields.
- Missing specs are hidden gracefully.
- Out-of-stock products do not show active Add to Cart actions.
- Product images fall back cleanly.
- Mobile product grids remain readable.
- Customer-facing text sounds like a real shop assistant.

## Data Review

- Categories match the allowed catalog values.
- Source category `storage` is treated as Accessories.
- Prices are in KES and compare-at prices are greater than selling prices.
- Warranty values come from `warranty_months`.
- Stock text comes from `in_stock` and `stock_qty`.

## Security Review

- API writes stay under `src/pages/api/*`.
- Service-role Supabase calls stay server-side.
- RLS policies remain enabled.
- Admin routes require staff/admin checks.
- API responses do not leak secrets or raw upstream errors.

