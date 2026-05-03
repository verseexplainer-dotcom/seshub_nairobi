#!/usr/bin/env python3
"""
Import product rows from generated catalog CSV or JSON into Supabase.

The source CSV is not aligned to the live products schema:
- the first 6 columns are stable
- `short_specs` may be split into multiple comma-separated cells
- the last 9 product-detail columns are stable again
- some exports append blank helper columns and/or a trailing `images` column

This script reconstructs each row, maps it to the existing `products`
table shape, writes normalized JSON and CSV artifacts for review, and can optionally
apply inserts/updates to Supabase using `.env.local` credentials.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local dependency
    load_dotenv = None


FIXED_PREFIX_COLUMNS = 6
MIN_SCREEN_INCHES = 3.5
MAX_SCREEN_INCHES = 40.0
TB_IN_GB = 1024
DEFAULT_TIMEOUT_SECONDS = 30

SOURCE_FIELDNAMES = [
    "title",
    "slug",
    "source_category",
    "brand",
    "price_kes",
    "compare_at_price",
    "short_specs",
    "short_description",
    "description_html",
    "meta_title",
    "meta_description",
    "focus_keyword",
    "search_keywords",
    "condition",
    "warranty",
    "stock_status",
    "primary_image",
    "images",
]

REQUIRED_SUFFIX_FIELDS = [
    "short_description",
    "description_html",
    "meta_title",
    "meta_description",
    "focus_keyword",
    "search_keywords",
    "condition",
    "warranty",
    "stock_status",
]
OPTIONAL_SUFFIX_FIELDS = [
    "primary_image",
    "images",
]

NORMALIZED_FIELDNAMES = [
    "slug",
    "title",
    "category",
    "price_kes",
    "compare_at_kes",
    "in_stock",
    "stock_qty",
    "brand",
    "condition",
    "refurb_grade",
    "short_specs",
    "description",
    "warranty_months",
    "images",
    "cpu",
    "ram_gb",
    "storage_gb",
    "storage_type",
    "screen_in",
    "seo_title",
    "meta_description",
]

CATEGORY_MAP = {
    "laptop": "laptops",
    "laptops": "laptops",
    "smartphone": "smartphones",
    "smartphones": "smartphones",
    "printer": "printers",
    "printers": "printers",
    "desktop": "desktops",
    "desktops": "desktops",
    "accessory": "accessories",
    "accessories": "accessories",
    "storage": "accessories",
}

CONDITION_MAP = {
    "brand new": "brand_new",
    "brand_new": "brand_new",
    "refurbished": "refurbished",
    "refurb": "refurbished",
    "unknown": "unknown",
}

STOCK_STATUS_MAP = {
    "in_stock": (True, None),
    "in stock": (True, None),
    "true": (True, None),
    "available": (True, None),
    "out_of_stock": (False, 0),
    "out-of-stock": (False, 0),
    "out of stock": (False, 0),
    "sold_out": (False, 0),
    "sold-out": (False, 0),
    "false": (False, 0),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import products CSV or JSON into Supabase.")
    parser.add_argument("--input", required=True, help="Path to the source CSV or JSON file.")
    parser.add_argument(
        "--output-dir",
        default="output/import",
        help="Directory where normalized artifacts should be written.",
    )
    parser.add_argument(
        "--apply-supabase",
        action="store_true",
        help="Insert/update normalized rows into the live Supabase products table.",
    )
    parser.add_argument(
        "--delete-missing",
        action="store_true",
        help="Delete live products whose slugs are not present in the imported CSV. Requires --apply-supabase.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional number of source rows to process for a small test run.",
    )
    return parser.parse_args()


def trim_trailing_blanks(row: list[str]) -> list[str]:
    trimmed = list(row)
    while trimmed and not str(trimmed[-1]).strip():
        trimmed.pop()
    return trimmed


def looks_like_images_cell(value: str) -> bool:
    text = str(value or "").strip().lower()
    if not text:
        return False

    image_markers = (".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", "review_needed:")
    return any(marker in text for marker in image_markers)


def infer_trailing_image_fields(header: list[str]) -> list[str]:
    normalized_header = [as_text(value).lower() for value in header]
    return [field for field in OPTIONAL_SUFFIX_FIELDS if field in normalized_header]


def reconstruct_source_row(row: list[str], row_number: int, trailing_image_fields: list[str]) -> dict[str, str]:
    trimmed = trim_trailing_blanks(row)
    minimum_length = FIXED_PREFIX_COLUMNS + 1 + len(REQUIRED_SUFFIX_FIELDS)
    if len(trimmed) < minimum_length:
        raise RuntimeError(
            f"Row {row_number} is too short to reconstruct safely: expected at least "
            f"{minimum_length} columns after trimming, got {len(trimmed)}."
        )

    working = list(trimmed)
    reconstructed = {field: "" for field in SOURCE_FIELDNAMES}

    for field in reversed(trailing_image_fields):
        if working and looks_like_images_cell(working[-1]):
            reconstructed[field] = working.pop().strip()

    while len(working) > minimum_length and not str(working[-1]).strip():
        working.pop()

    if len(working) < minimum_length:
        raise RuntimeError(
            f"Row {row_number} does not include the required stable suffix after cleanup: "
            f"expected at least {minimum_length} columns, got {len(working)}."
        )

    spec_parts = [
        part.strip()
        for part in working[FIXED_PREFIX_COLUMNS : len(working) - len(REQUIRED_SUFFIX_FIELDS)]
        if part.strip()
    ]
    reconstructed.update({
        "title": working[0].strip(),
        "slug": working[1].strip(),
        "source_category": working[2].strip(),
        "brand": working[3].strip(),
        "price_kes": working[4].strip(),
        "compare_at_price": working[5].strip(),
        "short_specs": ", ".join(spec_parts),
    })

    suffix_start = len(working) - len(REQUIRED_SUFFIX_FIELDS)
    for index, field in enumerate(REQUIRED_SUFFIX_FIELDS, start=suffix_start):
        reconstructed[field] = working[index].strip()

    return reconstructed


def read_source_rows(path: Path, limit: int = 0) -> list[dict[str, str]]:
    if path.suffix.lower() == ".json":
        return read_json_source_rows(path, limit=limit)

    rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, None) or []
        trailing_image_fields = infer_trailing_image_fields(header)
        for index, row in enumerate(reader, start=2):
            rows.append(reconstruct_source_row(row, index, trailing_image_fields))
            if limit and len(rows) >= limit:
                break
    return rows


def pick_json_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return ""


def json_images_value(value: Any) -> str:
    if isinstance(value, list):
        return ",".join(as_text(entry) for entry in value if as_text(entry))
    return as_text(value)


def json_text_value(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(as_text(entry) for entry in value if as_text(entry))
    return as_text(value)


def normalize_json_source_row(row: dict[str, Any]) -> dict[str, str]:
    images = pick_json_value(row, "images", "Images", "image_overrides")
    stock_status = pick_json_value(row, "stock_status", "in_stock")
    return {
        "title": as_text(pick_json_value(row, "title", "name", "Product Name")),
        "slug": as_text(pick_json_value(row, "slug", "URL Slug")),
        "source_category": as_text(pick_json_value(row, "source_category", "category", "Category")),
        "brand": as_text(pick_json_value(row, "brand", "Brand")),
        "price_kes": as_text(pick_json_value(row, "price_kes", "price", "Price (KES)")),
        "compare_at_price": as_text(pick_json_value(row, "compare_at_price", "compare_at_kes", "compare_at", "Regular Price (KES)")),
        "short_specs": json_text_value(pick_json_value(row, "short_specs", "specs", "Short Specs")),
        "short_description": as_text(pick_json_value(row, "short_description", "summary", "Short Description")),
        "description_html": as_text(pick_json_value(row, "description_html", "description", "Long Description")),
        "meta_title": as_text(pick_json_value(row, "meta_title", "seo_title", "Meta Title")),
        "meta_description": as_text(pick_json_value(row, "meta_description", "Meta Description")),
        "focus_keyword": as_text(pick_json_value(row, "focus_keyword", "Keywords Primary")),
        "search_keywords": as_text(pick_json_value(row, "search_keywords", "Keywords Secondary", "Tags")),
        "condition": as_text(pick_json_value(row, "condition", "Condition")),
        "warranty": as_text(pick_json_value(row, "warranty", "warranty_months", "Warranty")),
        "stock_status": as_text(stock_status) or "available",
        "primary_image": json_images_value(pick_json_value(row, "primary_image")),
        "images": json_images_value(images),
    }


def read_json_source_rows(path: Path, limit: int = 0) -> list[dict[str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        for key in ("products", "rows", "data"):
            if isinstance(raw.get(key), list):
                raw = raw[key]
                break

    if not isinstance(raw, list):
        raise RuntimeError("JSON input must be an array, or an object with a products, rows, or data array.")

    rows: list[dict[str, str]] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise RuntimeError(f"JSON row {index} must be an object.")
        rows.append(normalize_json_source_row(item))
        if limit and len(rows) >= limit:
            break
    return rows


def as_text(value: Any) -> str:
    return str(value or "").strip()


def parse_numeric(value: str) -> float | None:
    text = as_text(value).replace(",", "")
    if not text:
        return None
    try:
        parsed = float(text)
    except ValueError:
        return None
    return parsed


def csv_number(value: float | int | None) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def normalize_category(value: str) -> str | None:
    normalized = as_text(value).lower()
    return CATEGORY_MAP.get(normalized)


def normalize_condition(value: str) -> str | None:
    normalized = as_text(value).lower()
    return CONDITION_MAP.get(normalized)


def parse_warranty_months(value: str) -> float | None:
    text = as_text(value).lower()
    if not text:
        return None

    if re.fullmatch(r"\d+(?:\.\d+)?", text):
        return float(text)

    match = re.search(r"\b(\d{1,2})\s*(?:yr|year)\b", text)
    if match:
        return float(int(match.group(1)) * 12)

    match = re.search(r"\b(\d{1,2})\s*month", text)
    if match:
        return float(int(match.group(1)))

    return None


def parse_stock_status(value: str) -> tuple[bool | None, float | None]:
    normalized = as_text(value).lower()
    if normalized in STOCK_STATUS_MAP:
        return STOCK_STATUS_MAP[normalized]
    return None, None


def extract_cpu(text: str, brand: str) -> str | None:
    match = re.search(r"\bintel\s+core\s+ultra\s*([3579])\b", text, re.IGNORECASE)
    if match:
        return f"Intel Core Ultra {match.group(1)}"

    match = re.search(r"\bintel\s+core\s+(i[3579])\b", text, re.IGNORECASE)
    if match:
        return f"Intel Core {match.group(1).lower()}"

    match = re.search(r"\bci([3579])\b", text, re.IGNORECASE)
    if match:
        return f"Intel Core i{match.group(1)}"

    match = re.search(r"\bamd\s+ryzen\s+([3579])\b", text, re.IGNORECASE)
    if match:
        return f"AMD Ryzen {match.group(1)}"

    match = re.search(r"\bapple\s+m([1-4])\b", text, re.IGNORECASE)
    if match:
        return f"Apple M{match.group(1)}"

    if brand.lower() == "apple":
        match = re.search(r"\bm([1-4])\b", text, re.IGNORECASE)
        if match:
            return f"Apple M{match.group(1)}"

    if re.search(r"\bceleron\b", text, re.IGNORECASE):
        return "Intel Celeron"

    if re.search(r"\bpentium\b", text, re.IGNORECASE):
        return "Intel Pentium"

    return None


def extract_ram_gb(text: str) -> float | None:
    match = re.search(r"\b(\d{1,3})\s*GB\s*RAM\b", text, re.IGNORECASE)
    if not match:
        return None
    return float(int(match.group(1)))


def extract_storage(text: str) -> tuple[float | None, str | None]:
    tb_match = re.search(r"\b(\d+(?:\.\d+)?)\s*TB\s*(SSD|HDD|NVME|STORAGE)\b", text, re.IGNORECASE)
    if tb_match:
        storage_gb = float(tb_match.group(1)) * TB_IN_GB
        storage_type = tb_match.group(2).upper()
        return storage_gb, None if storage_type == "STORAGE" else storage_type.lower()

    gb_match = re.search(r"\b(\d{2,4})\s*GB\s*(SSD|HDD|NVME|STORAGE)\b", text, re.IGNORECASE)
    if gb_match:
        storage_gb = float(int(gb_match.group(1)))
        storage_type = gb_match.group(2).upper()
        return storage_gb, None if storage_type == "STORAGE" else storage_type.lower()

    return None, None


def extract_screen_in(text: str) -> float | None:
    match = re.search(r"\b(\d{1,2}(?:\.\d)?)\s*[- ]?inch(?:es)?\b", text, re.IGNORECASE)
    if not match:
        return None

    screen_in = float(match.group(1))
    if screen_in < MIN_SCREEN_INCHES or screen_in > MAX_SCREEN_INCHES:
        return None
    return screen_in


def infer_refurb_grade(category: str, condition: str, description_html: str) -> str | None:
    if category != "laptops":
        return None
    if condition == "brand_new":
        return None
    if condition != "refurbished":
        return None
    if re.search(r"\bgrade\s*a\b", description_html, re.IGNORECASE):
        return "grade_a"
    return "grade_a"


def parse_images(primary_image: str, images: str) -> list[str]:
    values: list[str] = []

    for raw in [primary_image, images]:
        if not as_text(raw):
            continue

        parts = [part.strip() for part in str(raw).split(",") if part.strip()]
        values.extend(parts)

    unique_values: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = value.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_values.append(value)

    return unique_values


def build_text_blob(source: dict[str, str]) -> str:
    return " ".join(
        part
        for part in [
            source["title"],
            source["short_specs"],
            source["short_description"],
            source["description_html"],
            source["meta_description"],
            source["search_keywords"],
        ]
        if part
    )


def map_source_row(source: dict[str, str]) -> tuple[dict[str, Any] | None, list[str], list[str]]:
    warnings: list[str] = []
    errors: list[str] = []

    slug = as_text(source["slug"])
    title = as_text(source["title"])
    if not slug:
        errors.append("Missing slug.")
    if not title:
        errors.append("Missing title.")

    category = normalize_category(source["source_category"])
    if not category:
        errors.append(f"Unsupported category '{source['source_category']}'.")

    condition = normalize_condition(source["condition"])
    if not condition:
        errors.append(f"Unsupported condition '{source['condition']}'.")

    price_kes = parse_numeric(source["price_kes"])
    if price_kes is None or price_kes <= 0:
        errors.append(f"Invalid price_kes '{source['price_kes']}'.")

    compare_at_kes = parse_numeric(source["compare_at_price"])
    if compare_at_kes is not None and price_kes is not None and compare_at_kes <= price_kes:
        warnings.append(
            f"compare_at_price {csv_number(compare_at_kes)} is not greater than price_kes {csv_number(price_kes)}; cleared."
        )
        compare_at_kes = None

    warranty_months = parse_warranty_months(source["warranty"])
    if source["warranty"] and warranty_months is None:
        warnings.append(f"Could not map warranty '{source['warranty']}' into warranty_months.")

    in_stock, stock_qty = parse_stock_status(source["stock_status"])
    if source["stock_status"] and in_stock is None:
        warnings.append(f"Could not map stock_status '{source['stock_status']}'.")

    if category == "accessories" and as_text(source["source_category"]).lower() == "storage":
        warnings.append("Mapped source category 'storage' to schema category 'accessories'.")

    text_blob = build_text_blob(source)
    cpu = extract_cpu(text_blob, source["brand"])
    ram_gb = extract_ram_gb(text_blob)
    storage_gb, storage_type = extract_storage(text_blob)
    screen_in = extract_screen_in(text_blob)
    refurb_grade = infer_refurb_grade(category or "", condition or "", source["description_html"])
    images = parse_images(source.get("primary_image", ""), source.get("images", ""))

    payload: dict[str, Any] = {
        "slug": slug,
        "title": title,
        "category": category,
        "price_kes": price_kes,
        "compare_at_kes": compare_at_kes,
        "brand": as_text(source["brand"]) or None,
        "short_specs": as_text(source["short_specs"]) or None,
        "description": as_text(source["description_html"]) or as_text(source["short_description"]) or None,
        "seo_title": as_text(source["meta_title"]) or None,
        "meta_description": as_text(source["meta_description"]) or None,
        "condition": condition,
        "warranty_months": warranty_months,
        "images": images or [],
        "in_stock": in_stock,
        "stock_qty": stock_qty,
        "refurb_grade": refurb_grade,
    }

    if cpu:
        payload["cpu"] = cpu
    if ram_gb is not None:
        payload["ram_gb"] = ram_gb
    if storage_gb is not None:
        payload["storage_gb"] = storage_gb
    if storage_type:
        payload["storage_type"] = storage_type
    if screen_in is not None:
        payload["screen_in"] = screen_in

    if errors:
        return None, warnings, errors

    return payload, warnings, errors


def payload_to_csv_row(payload: dict[str, Any]) -> dict[str, str]:
    row: dict[str, str] = {}
    for field in NORMALIZED_FIELDNAMES:
        value = payload.get(field)
        if isinstance(value, bool):
            row[field] = "true" if value else "false"
        elif value is None:
            row[field] = ""
        elif isinstance(value, (int, float)):
            row[field] = csv_number(value)
        elif isinstance(value, (list, dict)):
            row[field] = json.dumps(value, ensure_ascii=False)
        else:
            row[field] = str(value)
    return row


def write_csv_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=NORMALIZED_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_json_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")


def http_json_request(
    method: str,
    url: str,
    headers: dict[str, str],
    payload: Any | None = None,
) -> Any:
    data = None
    request_headers = dict(headers)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with {error.code}: {details}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"{method} {url} failed: {error}") from error

    if not body:
        return None
    return json.loads(body.decode("utf-8"))


def load_supabase_env() -> tuple[str, str]:
    if load_dotenv:
        load_dotenv(".env.local")
        load_dotenv(".env")

    supabase_url = as_text(os.getenv("PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")).rstrip("/")
    service_role_key = as_text(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local.")

    return supabase_url, service_role_key


def fetch_existing_products(supabase_url: str, service_role_key: str) -> dict[str, dict[str, Any]]:
    url = f"{supabase_url}/rest/v1/products?select=id,slug,images&limit=5000"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }
    response = http_json_request("GET", url, headers)
    existing: dict[str, dict[str, Any]] = {}
    for row in response or []:
        slug = as_text(row.get("slug")).lower()
        product_id = as_text(row.get("id"))
        if slug and product_id:
            existing[slug] = {
                "id": product_id,
                "images": row.get("images"),
            }
    return existing


def delete_missing_products(
    endpoint: str,
    headers: dict[str, str],
    existing: dict[str, dict[str, Any]],
    keep_slugs: set[str],
) -> int:
    deleted = 0
    for slug, product in existing.items():
        if slug in keep_slugs:
            continue
        product_id = as_text(product.get("id"))
        if not product_id:
            continue
        query = urllib.parse.urlencode({"id": f"eq.{product_id}"})
        http_json_request("DELETE", f"{endpoint}?{query}", headers)
        deleted += 1
    return deleted


def normalize_existing_images(value: Any) -> list[str]:
    if isinstance(value, list):
        return [as_text(entry) for entry in value if as_text(entry)]

    if isinstance(value, str):
        text = as_text(value)
        if not text:
            return []
        if text.startswith("["):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                return []
            return [as_text(entry) for entry in parsed if as_text(entry)] if isinstance(parsed, list) else []
        return [text]

    return []


def merge_existing_images(payload: dict[str, Any], existing_product: dict[str, Any] | None) -> dict[str, Any]:
    next_payload = dict(payload)
    incoming_images = payload.get("images")
    if isinstance(incoming_images, list) and incoming_images:
        return next_payload

    preserved_images = normalize_existing_images((existing_product or {}).get("images"))
    next_payload["images"] = preserved_images if preserved_images else []
    return next_payload


def apply_to_supabase(payloads: list[dict[str, Any]], delete_missing: bool = False) -> tuple[int, int, int]:
    supabase_url, service_role_key = load_supabase_env()
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Prefer": "return=minimal",
    }
    endpoint = f"{supabase_url}/rest/v1/products"
    existing = fetch_existing_products(supabase_url, service_role_key)
    keep_slugs = {as_text(payload.get("slug")).lower() for payload in payloads if as_text(payload.get("slug"))}

    inserted = 0
    updated = 0
    for payload in payloads:
        existing_product = existing.get(as_text(payload.get("slug")).lower())
        next_payload = merge_existing_images(payload, existing_product)
        existing_id = as_text((existing_product or {}).get("id"))
        if existing_id:
            query = urllib.parse.urlencode({"id": f"eq.{existing_id}"})
            http_json_request("PATCH", f"{endpoint}?{query}", headers, next_payload)
            updated += 1
        else:
            http_json_request("POST", endpoint, headers, next_payload)
            inserted += 1

    deleted = delete_missing_products(endpoint, headers, existing, keep_slugs) if delete_missing else 0
    return inserted, updated, deleted


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser()
    output_dir = Path(args.output_dir)

    if args.delete_missing and not args.apply_supabase:
        raise RuntimeError("--delete-missing requires --apply-supabase.")

    source_rows = read_source_rows(input_path, limit=args.limit)

    normalized_rows: list[dict[str, Any]] = []
    normalized_csv_rows: list[dict[str, str]] = []
    rejected_rows: list[dict[str, Any]] = []
    warning_rows: list[dict[str, Any]] = []
    category_counts: Counter[str] = Counter()

    for source in source_rows:
        payload, warnings, errors = map_source_row(source)
        if payload:
            normalized_rows.append(payload)
            normalized_csv_rows.append(payload_to_csv_row(payload))
            category_counts[str(payload["category"])] += 1
        if warnings:
            warning_rows.append({"slug": source.get("slug", ""), "warnings": warnings})
        if errors:
            rejected_rows.append(
                {
                    "slug": source.get("slug", ""),
                    "title": source.get("title", ""),
                    "errors": errors,
                }
            )

    normalized_csv_path = output_dir / "products.normalized.csv"
    normalized_json_path = output_dir / "products.normalized.json"
    report_path = output_dir / "products_import_report.json"
    write_csv_rows(normalized_csv_path, normalized_csv_rows)
    write_json_rows(normalized_json_path, normalized_rows)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(
            {
                "source_input": str(input_path),
                "normalized_csv": str(normalized_csv_path),
                "normalized_json": str(normalized_json_path),
                "total_source_rows": len(source_rows),
                "prepared_rows": len(normalized_rows),
                "rejected_rows": rejected_rows,
                "warning_rows": warning_rows,
                "category_counts": dict(category_counts),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    inserted = 0
    updated = 0
    deleted = 0
    if args.apply_supabase:
        if rejected_rows:
            raise RuntimeError(
                f"Refusing to apply Supabase changes: {len(rejected_rows)} rows need manual review first."
            )
        inserted, updated, deleted = apply_to_supabase(normalized_rows, delete_missing=args.delete_missing)

    print(f"Source rows: {len(source_rows)}")
    print(f"Prepared rows: {len(normalized_rows)}")
    print(f"Rejected rows: {len(rejected_rows)}")
    print(f"Warning rows: {len(warning_rows)}")
    for category, count in sorted(category_counts.items()):
        print(f"  {category}: {count}")
    print(f"Normalized CSV: {normalized_csv_path}")
    print(f"Normalized JSON: {normalized_json_path}")
    print(f"Report: {report_path}")
    if args.apply_supabase:
        print(f"Supabase inserts: {inserted}")
        print(f"Supabase updates: {updated}")
        print(f"Supabase deletes: {deleted}")


if __name__ == "__main__":
    main()
