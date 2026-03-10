#!/usr/bin/env python3
"""
Create a cleaned catalog CSV and optionally apply safe updates to Supabase.

The cleanup rules are intentionally conservative:
- normalize brand casing where the value is obviously inconsistent
- clear impossible screen sizes instead of guessing the real number
- remove impossible display list items from descriptions
- disambiguate a known duplicate title variant from existing row text
- backfill only structured values that are explicitly present in the source text
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
from collections import Counter
from copy import deepcopy
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local dependency
    load_dotenv = None


MIN_SCREEN_INCHES = 3.5
MAX_SCREEN_INCHES = 20.0
DEFAULT_IN_STOCK_QTY = 5

BRAND_FIXES = {
    "Hp": "HP",
}

DUPLICATE_TITLE_FIXES = {
    "hp-elitebook-850-g3-refurbished-laptop-ci5-6th-gen-8gb-ram-256gb-ssd-1gb-graphic": (
        "HP EliteBook 850 G3 Refurbished Laptop Intel Core i5 8GB RAM 256GB SSD 1GB Graphics"
    )
}

DISPLAY_LINE_RE = re.compile(r"<li><b>Display:</b>\s*([0-9.]+)\"</li>", re.IGNORECASE)
MONTH_WARRANTY_RE = re.compile(r"\b(\d{1,2})\s*[- ]?month(?:s)?\s+warranty\b", re.IGNORECASE)
YEAR_WARRANTY_RE = re.compile(r"\b(\d{1,2})\s*[- ]?year\s+warranty\b", re.IGNORECASE)
RAM_RE = re.compile(r"\b(\d{1,2})\s*GB\s*RAM\b", re.IGNORECASE)
PHONE_STORAGE_RE = re.compile(r"\b(64|128|256|512|1024)\s*GB\b", re.IGNORECASE)
SCREEN_RE = re.compile(r"\b(\d{1,2}(?:\.\d)?)\s*(?:\"|”|inch(?:es)?)", re.IGNORECASE)
CONDITION_REMAP = {
    "brand new": "brand_new",
    "refurbished": "refurbished",
}
LAPTOP_CATEGORY = "laptops"
LAPTOP_ALLOWED_CONDITIONS = {"brand_new", "refurbished"}
LAPTOP_ALLOWED_RENEWED_GRADE = "grade_a"
LAPTOP_BLOCKED_RENEWED_GRADES = {"grade_b", "grade_c"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean the SES ICT HUB catalog CSV.")
    parser.add_argument(
        "--input",
        default="/home/paulaflare/Downloads/products_rows.csv",
        help="Path to the source CSV export.",
    )
    parser.add_argument(
        "--output-dir",
        default="output/spreadsheet",
        help="Directory where cleaned artifacts should be written.",
    )
    parser.add_argument(
        "--apply-supabase",
        action="store_true",
        help="Patch changed rows into the live Supabase products table using .env.local credentials.",
    )
    return parser.parse_args()


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise RuntimeError(f"No headers found in {path}")
        return reader.fieldnames, list(reader)


def write_csv_rows(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def parse_float(value: str) -> float | None:
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if parsed == parsed else None


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def is_laptop_row(row: dict[str, str]) -> bool:
    return normalize_text(row.get("category")).lower() == LAPTOP_CATEGORY


def as_csv_number(value: int | float) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def unique_matches(pattern: re.Pattern[str], text: str, *, transform=lambda match: match.group(1)) -> list[Any]:
    matches: list[Any] = []
    for match in pattern.finditer(text):
        value = transform(match)
        if value not in matches:
            matches.append(value)
    return matches


def clean_display_lines(description: str) -> tuple[str, list[str]]:
    removed_values: list[str] = []

    def replace(match: re.Match[str]) -> str:
        value = parse_float(match.group(1))
        if value is not None and not (MIN_SCREEN_INCHES <= value <= MAX_SCREEN_INCHES):
            removed_values.append(match.group(1))
            return ""
        return match.group(0)

    cleaned = DISPLAY_LINE_RE.sub(replace, description)
    cleaned = re.sub(r"<ul>\s*</ul>", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned, removed_values


def build_text_blob(row: dict[str, str]) -> str:
    parts = [row.get("title", ""), row.get("short_specs", ""), re.sub(r"<[^>]+>", " ", row.get("description", ""))]
    return " ".join(part for part in parts if part).strip()


def clean_row(row: dict[str, str]) -> tuple[dict[str, str], dict[str, Any], list[str]]:
    updated = deepcopy(row)
    changes: dict[str, Any] = {}
    errors: list[str] = []

    brand = updated.get("brand", "")
    if brand in BRAND_FIXES:
        updated["brand"] = BRAND_FIXES[brand]
        changes["brand"] = updated["brand"]

    forced_title = DUPLICATE_TITLE_FIXES.get(updated.get("slug", ""))
    if forced_title and updated.get("title") != forced_title:
        previous_title = updated.get("title", "")
        updated["title"] = forced_title
        changes["title"] = forced_title
        if updated.get("seo_title", "").strip() in {"", previous_title}:
            updated["seo_title"] = forced_title
            changes["seo_title"] = forced_title

    screen_value = parse_float(updated.get("screen_in", ""))
    if screen_value is not None and not (MIN_SCREEN_INCHES <= screen_value <= MAX_SCREEN_INCHES):
        updated["screen_in"] = ""
        changes["screen_in"] = ""

    description = updated.get("description", "")
    cleaned_description, removed_display_values = clean_display_lines(description)
    if cleaned_description != description:
        updated["description"] = cleaned_description
        changes["description"] = cleaned_description
        changes["removed_display_values"] = removed_display_values

    text_blob = build_text_blob(updated)

    if not updated.get("warranty_months", "").strip():
        month_matches = unique_matches(MONTH_WARRANTY_RE, text_blob)
        year_matches = unique_matches(YEAR_WARRANTY_RE, text_blob, transform=lambda match: str(int(match.group(1)) * 12))
        warranty_values = month_matches + [value for value in year_matches if value not in month_matches]
        if len(warranty_values) == 1:
            updated["warranty_months"] = warranty_values[0]
            changes["warranty_months"] = warranty_values[0]

    if not updated.get("ram_gb", "").strip():
        ram_values = unique_matches(RAM_RE, text_blob)
        if len(ram_values) == 1:
            updated["ram_gb"] = ram_values[0]
            changes["ram_gb"] = ram_values[0]

    if updated.get("category", "") == "Smartphones" and not updated.get("storage_gb", "").strip():
        storage_values = unique_matches(PHONE_STORAGE_RE, text_blob)
        if len(storage_values) == 1:
            updated["storage_gb"] = storage_values[0]
            changes["storage_gb"] = storage_values[0]

    if updated.get("in_stock", "").strip().lower() == "true" and not updated.get("stock_qty", "").strip():
        updated["stock_qty"] = str(DEFAULT_IN_STOCK_QTY)
        changes["stock_qty"] = str(DEFAULT_IN_STOCK_QTY)

    if not updated.get("screen_in", "").strip():
        screen_matches = unique_matches(
            SCREEN_RE,
            text_blob,
            transform=lambda match: as_csv_number(float(match.group(1))),
        )
        valid_screens = []
        for value in screen_matches:
            parsed = parse_float(value)
            if parsed is not None and MIN_SCREEN_INCHES <= parsed <= MAX_SCREEN_INCHES and value not in valid_screens:
                valid_screens.append(value)
        if len(valid_screens) == 1:
            updated["screen_in"] = valid_screens[0]
            changes["screen_in"] = valid_screens[0]

    if updated.get("condition", "").strip().lower() == "unknown":
        lowered_text = text_blob.lower()
        inferred_conditions = [mapped for phrase, mapped in CONDITION_REMAP.items() if phrase in lowered_text]
        inferred_conditions = list(dict.fromkeys(inferred_conditions))
        if len(inferred_conditions) == 1:
            updated["condition"] = inferred_conditions[0]
            changes["condition"] = inferred_conditions[0]

    if is_laptop_row(updated):
        normalized_condition = normalize_text(updated.get("condition")).lower()
        normalized_grade = normalize_text(updated.get("refurb_grade")).lower()

        if normalized_condition == "brand_new":
            if normalize_text(updated.get("refurb_grade")):
                updated["refurb_grade"] = ""
                changes["refurb_grade"] = ""
        elif normalized_condition == "refurbished":
            if normalized_grade in LAPTOP_BLOCKED_RENEWED_GRADES:
                updated["refurb_grade"] = LAPTOP_ALLOWED_RENEWED_GRADE
                changes["refurb_grade"] = LAPTOP_ALLOWED_RENEWED_GRADE
                normalized_grade = LAPTOP_ALLOWED_RENEWED_GRADE

            if normalized_grade != LAPTOP_ALLOWED_RENEWED_GRADE:
                errors.append("Laptop refurbished products must use refurb_grade=grade_a.")
        elif normalized_condition not in LAPTOP_ALLOWED_CONDITIONS:
            errors.append("Laptop products must use condition=brand_new or condition=refurbished.")

    return updated, changes, errors


def to_supabase_payload(changes: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key, value in changes.items():
        if key == "removed_display_values":
            continue
        if key in {"screen_in", "ram_gb", "storage_gb", "warranty_months", "stock_qty"}:
            payload[key] = None if value == "" else float(value)
        else:
            payload[key] = value
    return payload


def apply_updates_to_supabase(changed_rows: list[dict[str, Any]], rejected_rows: list[dict[str, Any]]) -> None:
    if rejected_rows:
        raise RuntimeError(
            f"Refusing to apply Supabase updates: {len(rejected_rows)} laptop rows require manual review first."
        )

    if load_dotenv:
        load_dotenv(".env.local")

    import requests

    supabase_url = (os.getenv("PUBLIC_SUPABASE_URL") or "").rstrip("/")
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")

    endpoint = f"{supabase_url}/rest/v1/products"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    for row in changed_rows:
        payload = to_supabase_payload(row["changes"])
        if not payload:
            continue
        response = requests.patch(
            endpoint,
            headers=headers,
            params={"slug": f"eq.{row['slug']}"},
            json=payload,
            timeout=30,
        )
        response.raise_for_status()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser()
    output_dir = Path(args.output_dir)
    fieldnames, rows = read_csv_rows(input_path)

    cleaned_rows: list[dict[str, str]] = []
    changed_rows: list[dict[str, Any]] = []
    rejected_rows: list[dict[str, Any]] = []
    field_change_counts: Counter[str] = Counter()

    for row in rows:
        cleaned_row, changes, errors = clean_row(row)
        cleaned_rows.append(cleaned_row)
        if changes:
            changed_rows.append({"slug": row["slug"], "changes": changes})
            for key in changes:
                if key != "removed_display_values":
                    field_change_counts[key] += 1
        if errors:
            rejected_rows.append(
                {
                    "slug": row.get("slug", ""),
                    "category": row.get("category", ""),
                    "condition": cleaned_row.get("condition", ""),
                    "refurb_grade": cleaned_row.get("refurb_grade", ""),
                    "errors": errors,
                }
            )

    cleaned_csv_path = output_dir / "products_rows.cleaned.csv"
    report_path = output_dir / "catalog_cleanup_report.json"
    write_csv_rows(cleaned_csv_path, fieldnames, cleaned_rows)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(
            {
                "source_csv": str(input_path),
                "cleaned_csv": str(cleaned_csv_path),
                "changed_rows": changed_rows,
                "rejected_rows": rejected_rows,
                "field_change_counts": dict(field_change_counts),
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    if args.apply_supabase:
        apply_updates_to_supabase(changed_rows, rejected_rows)

    print(f"Source rows: {len(rows)}")
    print(f"Changed rows: {len(changed_rows)}")
    print(f"Rejected rows: {len(rejected_rows)}")
    for field, count in sorted(field_change_counts.items()):
        print(f"  {field}: {count}")
    print(f"Cleaned CSV: {cleaned_csv_path}")
    print(f"Report: {report_path}")
    if args.apply_supabase:
        print("Supabase updates: applied")


if __name__ == "__main__":
    main()
