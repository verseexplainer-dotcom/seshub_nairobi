# Data Quality Rules

Catalog quality affects trust directly. Keep data plain and consistent.

## Product Fields

Use the current schema as the source of truth. Important fields include:

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

## Category Rules

Allowed storefront categories:

- Laptops
- Smartphones
- Printers
- Desktops
- Accessories

Source rows tagged as `storage` should be treated as Accessories.

## Price Rules

- `price_kes` must be greater than zero.
- `compare_at_kes` should be empty or greater than `price_kes`.
- Do not show a savings badge unless the comparison is valid.

## Image Rules

Priority:

1. `image_overrides`
2. `images`
3. fallback image

Run image matching and sync tools carefully:

```bash
python3 tools/python/link_images.py --dry-run
python3 tools/python/sync_images_from_csv.py --input /path/to/products.csv
```

