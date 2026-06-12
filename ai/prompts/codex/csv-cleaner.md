# CSV Cleaner Prompt

Use this for catalog CSV cleanup or import preparation.

## Prompt

Clean or review a SES ICT HUB product CSV for import.

Rules:

- Use existing schema fields only.
- Treat source category `storage` as Accessories.
- Do not invent CPU, RAM, storage, screen size, warranty, stock, or condition.
- Normalize KES prices as numbers.
- Keep `compare_at_kes` empty unless it is greater than `price_kes`.
- Keep missing optional specs empty.
- Preserve source traceability where available.

Useful scripts:

```bash
python3 tools/python/clean_catalog_data.py
python3 tools/python/import_products_csv.py
python3 tools/python/audit_catalog.py
```

Before writing changes, explain what will be normalized.

