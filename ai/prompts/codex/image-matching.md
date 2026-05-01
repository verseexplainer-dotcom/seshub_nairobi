# Image Matching Prompt

Use this for product image matching and Supabase Storage image work.

## Prompt

Match product images for the SES ICT HUB catalog.

Rules:

- Product image priority is `image_overrides`, then `images`, then fallback.
- Never leave a product with a broken image.
- Use dry runs before writing changes.
- Do not modify production Storage or database records without explicit approval.
- Do not guess a match when confidence is low.

Useful commands:

```bash
python3 tools/python/link_images.py --dry-run --min-confidence 0.80
python3 tools/python/sync_images_from_csv.py --input /path/to/products_with_matched_images.csv
node tools/node/upload-supabase-assets.mjs --bucket product-images --missing-only --dry-run
```

Report uncertain matches separately.

