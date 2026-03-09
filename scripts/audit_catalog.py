#!/usr/bin/env python3
"""
Audit catalog quality for duplicates and suspicious specs.

Sources:
  --source supabase  (default; requires env + supabase package)
  --source dist      (parses dist/product/*/index.html)

Usage:
  python3 scripts/audit_catalog.py
  python3 scripts/audit_catalog.py --source dist
  python3 scripts/audit_catalog.py --near-threshold 0.9
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import defaultdict
from difflib import SequenceMatcher
from typing import Any

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional local helper
    load_dotenv = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit product catalog quality.")
    parser.add_argument("--source", choices=["supabase", "dist"], default="supabase")
    parser.add_argument("--near-threshold", type=float, default=0.9)
    parser.add_argument("--json-out", default="", help="Optional output file for JSON report")
    return parser.parse_args()


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def extract_generation(text: str) -> str | None:
    match = re.search(r"(\d{1,2})(?:st|nd|rd|th)\s*-?\s*gen", text.lower())
    return f"{match.group(1)}th-gen" if match else None


def model_key_from_slug(slug: str) -> str:
    parts = [p for p in normalize_text(slug).split() if p]
    if not parts:
        return slug
    generic = {"refurbished", "laptop", "brand", "new", "intel", "core", "ssd", "ram"}
    filtered = [p for p in parts if p not in generic]
    if not filtered:
        filtered = parts
    return " ".join(filtered[:4])


def load_products_from_supabase() -> list[dict[str, Any]]:
    if load_dotenv:
        load_dotenv(".env.local")

    supabase_url = (os.getenv("PUBLIC_SUPABASE_URL") or "").strip()
    service_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise RuntimeError("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.")

    try:
        from supabase import create_client
    except Exception as exc:
        raise RuntimeError(f"supabase package unavailable: {exc}") from exc

    client = create_client(supabase_url, service_key)
    response = (
        client.table("products")
        .select("id,slug,title,price_kes,compare_at_kes,images,category,cpu,ram_gb,storage_gb")
        .execute()
    )
    rows = response.data or []
    products: list[dict[str, Any]] = []

    for row in rows:
        images = row.get("images") if isinstance(row.get("images"), list) else []
        primary_image = images[0] if images else None
        slug = str(row.get("slug") or "").strip()
        title = str(row.get("title") or "").strip()
        products.append(
            {
                "id": row.get("id"),
                "slug": slug,
                "title": title,
                "price_kes": float(row.get("price_kes") or 0),
                "compare_at_kes": float(row.get("compare_at_kes") or 0) if row.get("compare_at_kes") is not None else None,
                "category": str(row.get("category") or "").strip().lower(),
                "image": primary_image,
                "generation": extract_generation(f"{slug} {title}"),
                "model_key": model_key_from_slug(slug),
            }
        )

    return products


def load_products_from_dist() -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    for path in glob.glob("dist/product/*/index.html"):
        slug = path.split("/")[-2]
        html = open(path, "r", encoding="utf-8").read()
        h1_match = re.search(r'<h1 class="product-title"[^>]*>(.*?)</h1>', html, re.S)
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1_match.group(1))).strip() if h1_match else slug
        price_match = re.search(r'data-price="(\d+(?:\.\d+)?)"', html)
        image_match = re.search(r'data-image="([^"]+)"', html)
        category_match = re.search(r'<a href="/category/([^"]+)">', html)
        products.append(
            {
                "id": slug,
                "slug": slug,
                "title": title,
                "price_kes": float(price_match.group(1)) if price_match else 0.0,
                "compare_at_kes": None,
                "category": category_match.group(1).lower() if category_match else "",
                "image": image_match.group(1) if image_match else None,
                "generation": extract_generation(f"{slug} {title}"),
                "model_key": model_key_from_slug(slug),
            }
        )
    return products


def run_audit(products: list[dict[str, Any]], near_threshold: float) -> dict[str, Any]:
    report: dict[str, Any] = {
        "total_products": len(products),
        "exact_title_duplicates": [],
        "near_duplicates": [],
        "generation_conflicts": [],
        "image_reuse_groups": [],
    }

    by_norm_title: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_model_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_image: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for product in products:
        norm = normalize_text(product["title"])
        by_norm_title[norm].append(product)
        by_model_key[product["model_key"]].append(product)
        if product.get("image"):
            by_image[str(product["image"])].append(product)

    for _, group in by_norm_title.items():
        if len(group) > 1:
            report["exact_title_duplicates"].append(
                [
                    {
                        "slug": item["slug"],
                        "title": item["title"],
                        "price_kes": item["price_kes"],
                    }
                    for item in group
                ]
            )

    for _, group in by_model_key.items():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a = group[i]
                b = group[j]
                ratio = SequenceMatcher(None, normalize_text(a["title"]), normalize_text(b["title"])).ratio()
                if ratio >= near_threshold and a["slug"] != b["slug"]:
                    report["near_duplicates"].append(
                        {
                            "similarity": round(ratio, 3),
                            "slug_a": a["slug"],
                            "slug_b": b["slug"],
                            "title_a": a["title"],
                            "title_b": b["title"],
                        }
                    )

    for model_key, group in by_model_key.items():
        gens = sorted({g for item in group if (g := item.get("generation"))})
        if len(gens) > 1:
            report["generation_conflicts"].append(
                {
                    "model_key": model_key,
                    "generations": gens,
                    "products": [item["slug"] for item in group],
                }
            )

    for image, group in by_image.items():
        model_keys = {item["model_key"] for item in group}
        if len(group) > 1 and len(model_keys) > 1:
            report["image_reuse_groups"].append(
                {
                    "image": image,
                    "products": [
                        {
                            "slug": item["slug"],
                            "title": item["title"],
                            "price_kes": item["price_kes"],
                        }
                        for item in group
                    ],
                }
            )

    report["near_duplicates"] = sorted(report["near_duplicates"], key=lambda x: x["similarity"], reverse=True)
    return report


def print_summary(report: dict[str, Any]) -> None:
    print("Catalog Audit")
    print("-" * 40)
    print(f"Total products:                {report['total_products']}")
    print(f"Exact title duplicate groups:  {len(report['exact_title_duplicates'])}")
    print(f"Near-duplicate pairs:          {len(report['near_duplicates'])}")
    print(f"Generation conflicts:          {len(report['generation_conflicts'])}")
    print(f"Cross-model image reuses:      {len(report['image_reuse_groups'])}")

    if report["exact_title_duplicates"]:
        print("\nTop exact duplicate group:")
        for item in report["exact_title_duplicates"][0]:
            print(f"  - {item['slug']} | KES {int(item['price_kes'])}")

    if report["generation_conflicts"]:
        sample = report["generation_conflicts"][0]
        print("\nSample generation conflict:")
        print(f"  model_key: {sample['model_key']}")
        print(f"  generations: {sample['generations']}")
        print(f"  products: {sample['products']}")


def main() -> None:
    args = parse_args()

    if args.source == "supabase":
        products = load_products_from_supabase()
    else:
        products = load_products_from_dist()

    report = run_audit(products, near_threshold=args.near_threshold)
    print_summary(report)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\nJSON report written to {args.json_out}")


if __name__ == "__main__":
    main()
