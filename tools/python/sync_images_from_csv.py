#!/usr/bin/env python3
"""
Sync product images from a CSV export that already contains matched filenames.

The CSV can provide image arrays in `matched_images`, `image_overrides`, or
`images`. This script normalizes those cells into filename arrays, previews the
updates in dry-run mode by default, and can optionally push the changes to the
live Supabase `products` table.

Usage:
  python3 tools/python/sync_images_from_csv.py --input /path/to/products.csv
  python3 tools/python/sync_images_from_csv.py --input /path/to/products.csv --apply-supabase
"""

from __future__ import annotations

import argparse
import ast
import csv
import json
import os
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local dependency
    load_dotenv = None


DEFAULT_SOURCE_COLUMNS = ("matched_images", "image_overrides", "images")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync product images from a CSV export.")
    parser.add_argument("--input", required=True, help="Path to the source CSV file.")
    parser.add_argument(
        "--source-column",
        default="matched_images",
        help="Preferred CSV column to read image matches from. Falls back to image_overrides/images.",
    )
    parser.add_argument(
        "--apply-supabase",
        action="store_true",
        help="Write the normalized image arrays to Supabase after previewing them.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional row limit for a smaller test run.",
    )
    parser.add_argument(
        "--preview-limit",
        type=int,
        default=10,
        help="How many row mappings to print in preview output.",
    )
    return parser.parse_args()


def as_text(value: Any) -> str:
    return str(value or "").strip()


def read_csv_rows(path: Path, limit: int = 0) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, str]] = []
        for row in reader:
            rows.append({key: as_text(value) for key, value in row.items()})
            if limit and len(rows) >= limit:
                break
        return rows


def parse_image_list(value: str) -> list[str]:
    text = as_text(value)
    if not text:
        return []

    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(text)
        except Exception:
            continue

        if isinstance(parsed, list):
            return [as_text(item) for item in parsed if as_text(item)]
        if isinstance(parsed, str):
            return [as_text(parsed)] if as_text(parsed) else []

    return [text]


def normalize_image_filename(value: str) -> str:
    text = as_text(value)
    if not text:
        return ""

    parsed = urlparse(text)
    if parsed.scheme and parsed.netloc:
        product_images_marker = "/storage/v1/object/public/product-images/"
        if product_images_marker in parsed.path:
            text = parsed.path.split(product_images_marker, 1)[1]
        else:
            text = parsed.path.rsplit("/", 1)[-1]

    text = text.lstrip("/").replace("\\", "/")
    if text.startswith("product-images/"):
        text = text[len("product-images/") :]
    return text.strip()


def dedupe_preserving_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        output.append(item)
    return output


def get_source_columns(preferred_column: str) -> list[str]:
    columns = [preferred_column] if preferred_column else []
    for fallback in DEFAULT_SOURCE_COLUMNS:
        if fallback not in columns:
            columns.append(fallback)
    return columns


def extract_image_filenames(row: dict[str, str], preferred_column: str = "matched_images") -> tuple[list[str], str | None]:
    for column in get_source_columns(preferred_column):
        filenames = [
            normalize_image_filename(item)
            for item in parse_image_list(row.get(column, ""))
        ]
        cleaned = dedupe_preserving_order([item for item in filenames if item])
        if cleaned:
            return cleaned, column
    return [], None


def build_updates(rows: list[dict[str, str]], preferred_column: str = "matched_images") -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    updates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for row in rows:
        product_id = as_text(row.get("id"))
        slug = as_text(row.get("slug"))
        filenames, source_column = extract_image_filenames(row, preferred_column=preferred_column)

        if not filenames:
            skipped.append({"id": product_id, "slug": slug, "reason": "no_images"})
            continue

        if not product_id and not slug:
            skipped.append({"id": product_id, "slug": slug, "reason": "missing_identifier"})
            continue

        updates.append(
            {
                "id": product_id,
                "slug": slug,
                "source_column": source_column or preferred_column,
                "images": filenames,
                "image_overrides": filenames,
            }
        )

    return updates, skipped


def print_preview(updates: list[dict[str, Any]], skipped: list[dict[str, str]], preview_limit: int) -> None:
    multi_image_rows = sum(1 for update in updates if len(update["images"]) > 1)
    print(f"Rows ready to update: {len(updates)}")
    print(f"Rows skipped: {len(skipped)}")
    print(f"Rows with multiple images: {multi_image_rows}")

    if updates:
        print("")
        print("Preview:")
        for update in updates[:preview_limit]:
            identifier = update["slug"] or update["id"]
            print(f"  - {identifier} ({update['source_column']}): {update['images']}")

    if skipped:
        print("")
        print("Skipped rows:")
        for row in skipped[:preview_limit]:
            identifier = row["slug"] or row["id"] or "<missing-id-and-slug>"
            print(f"  - {identifier}: {row['reason']}")


def load_supabase_credentials() -> tuple[str, str]:
    if load_dotenv:
        load_dotenv(dotenv_path=".env.local")

    supabase_url = as_text(os.getenv("PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL"))
    service_role_key = as_text(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.")
    return supabase_url.rstrip("/"), service_role_key


def apply_updates(updates: list[dict[str, Any]]) -> None:
    if not updates:
        print("No updates to apply.")
        return

    supabase_url, service_role_key = load_supabase_credentials()

    try:
        from supabase import create_client
    except ImportError as exc:  # pragma: no cover - depends on local environment
        raise RuntimeError("Missing `supabase` Python package. Install project dependencies before applying updates.") from exc

    client = create_client(supabase_url, service_role_key)

    for update in updates:
        query = client.table("products").update(
            {
                "images": update["images"],
                "image_overrides": update["image_overrides"],
            }
        )

        if update["id"]:
            query = query.eq("id", update["id"])
        else:
            query = query.eq("slug", update["slug"])

        query.execute()

    print(f"Applied image updates to {len(updates)} products.")


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    rows = read_csv_rows(input_path, limit=args.limit)
    updates, skipped = build_updates(rows, preferred_column=args.source_column)
    print_preview(updates, skipped, preview_limit=args.preview_limit)

    if not args.apply_supabase:
        print("")
        print("Dry run only. Re-run with --apply-supabase to write these image arrays to Supabase.")
        return

    print("")
    apply_updates(updates)


if __name__ == "__main__":
    main()
