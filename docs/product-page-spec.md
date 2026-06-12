# Product Page Spec

Product pages should show only facts available from the database.

## Main Content

- Product image gallery
- Title
- Price
- Savings if `compare_at_kes > price_kes`
- Stock state
- Warranty
- Key specs summary
- Product description
- Related products

## Specs Table

Use these fields:

- `cpu`
- `ram_gb`
- `storage_gb`
- `storage_type`
- `screen_in`
- `condition`
- `refurb_grade`

Hide missing values. Do not invent specs.

## Description

Use:

- `short_specs`
- `description`

Do not generate replacement product claims that contradict the catalog.

## Related Products

Use:

- `category`
- `brand`

Related products should remain useful even if the brand is missing.

