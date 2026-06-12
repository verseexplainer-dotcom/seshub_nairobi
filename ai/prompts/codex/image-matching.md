# Image Matching Prompt

Use this for matching SES ICT HUB products to files in Supabase Storage.

## Prompt

You are working in the SES ICT HUB Astro storefront.

Task:

- Match product records to the correct images in the Supabase Storage `product-images` bucket.
- Keep product image data accurate, conservative, and traceable.
- Use exact storage object names or paths returned by Supabase.
- Preserve the storefront image priority: `image_overrides`, then `images`, then fallback image.

Before editing or applying updates:

- Read `ai/AGENTS.md`, `ai/GUARDRAILS.md`, and `docs/data-quality-rules.md`.
- Inspect the product rows involved: `slug`, `title`, `category`, `brand`, `cpu`, `ram_gb`, `storage_gb`, `screen_in`, `condition`, `images`, and `image_overrides`.
- Inspect the candidate image filenames and paths.
- Run a dry run first.

Useful commands:

```bash
python3 tools/python/link_images.py --dry-run
python3 tools/python/link_images.py --dry-run --only-missing-images
python3 tools/python/link_images.py --dry-run --min-confidence 0.80
python3 tools/python/link_images.py --dry-run --categories laptops,smartphones
python3 tools/python/link_images.py --dry-run --overrides-file tools/python/image_overrides.json
python3 tools/python/sync_images_from_csv.py --input /path/to/products.csv
```

Rules:

- Do not invent image filenames.
- Do not rewrite stored image values into public URLs.
- Do not rename bucket files as part of matching.
- Do not assign a generic or nearby model image when the product identity is unclear.
- Do not use a low-confidence match unless the user explicitly approves it.
- Do not modify checkout, cart, order, payment, webhook, or unrelated API logic.
- Do not change schema or RLS policies for image matching work.

Match quality:

- Strong matches should agree on product family and model, such as brand plus model number.
- For laptops and desktops, treat CPU, RAM, storage, and screen size as conflict signals when the filename includes those values.
- For phones, treat model, generation, storage, and color as conflict signals when present.
- For printers and accessories, prefer exact series/model matches over broad brand matches.
- If multiple products share one model image legitimately, keep the shared filename only when the title/model alignment is clear.
- When uncertain, leave the product unmatched and report the slug.

Manual overrides:

- Use `tools/python/image_overrides.json` for explicit slug-to-filename mappings.
- Keep overrides small and reviewable.
- Verify every override filename exists in the `product-images` bucket before applying.

Apply workflow:

1. Run a dry run and review no-match and low-confidence output.
2. Add or adjust manual overrides for clear misses.
3. Run the dry run again.
4. Apply live updates only after the user asks for database changes.
5. Recheck affected product cards and product pages for broken images or awkward cropping.

Expected output:

- Summarize matched, skipped, low-confidence, and no-match counts.
- List any manual overrides added or changed.
- Call out products that still need human review.
- Mention whether changes were dry-run only or applied to Supabase.
