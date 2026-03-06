#!/usr/bin/env python3
"""
link_images.py – Connect products in Supabase with images in Storage.

Workflow:
  1. Lists every file in the `product-images` bucket.
  2. Fetches every product (id, slug, title, images).
  3. For each product, finds the best matching storage files using
     model-keyword extraction (e.g. "dell-latitude-5411" from slug
     matches "dell-latitude-5411-core-i5-..." from image filename).
  4. Builds public URLs and updates the `images` JSONB column.

Usage:
  python3 scripts/link_images.py              # live run – writes to DB
  python3 scripts/link_images.py --dry-run    # preview only – no writes
"""

import os
import sys
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# ── Config ──────────────────────────────────────────────────────
load_dotenv(dotenv_path=".env.local") # reads project .env.local

URL  = os.getenv("PUBLIC_SUPABASE_URL")
KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")   # service-role for writes
BUCKET = "product-images"

DRY_RUN = "--dry-run" in sys.argv

if not URL or not KEY:
    print("❌  Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase: Client = create_client(URL, KEY)


# ── Helpers ─────────────────────────────────────────────────────
def normalize(text: str) -> str:
    """Lower-case, strip extension, replace non-alphanum with hyphens."""
    text = text.lower()
    text = re.sub(r"\.\w{3,4}$", "", text)          # remove .webp / .jpg etc.
    text = re.sub(r"\s*\(\d+\)$", "", text)          # remove " (2)" suffixes
    text = re.sub(r"[^a-z0-9]+", "-", text)          # non-alphanum → hyphen
    return text.strip("-")


def public_url(filename: str) -> str:
    return f"{URL}/storage/v1/object/public/{BUCKET}/{filename}"


def list_bucket_files() -> list[str]:
    """Return every filename in the product-images bucket."""
    all_files = []
    offset = 0
    limit = 1000

    while True:
        res = supabase.storage.from_(BUCKET).list(
            path="",
            options={"limit": limit, "offset": offset}
        )
        if not res:
            break

        filenames = [f["name"] for f in res if f.get("name") and f.get("id")]
        all_files.extend(filenames)

        if len(res) < limit:
            break
        offset += limit

    return all_files


def extract_model_key(text: str) -> str:
    """
    Extract a "model key" from a slug or image filename.
    
    Examples:
      "dell-latitude-5411-core-i5-10th-gen-16gb-512gb-ssd"    → "dell-latitude-5411"
      "hp-elitebook-840-g5-intel-core-i5-8th-gen-..."         → "hp-elitebook-840-g5"
      "lenovo-thinkpad-t450-core-i5-hdd-500gb-..."            → "lenovo-thinkpad-t450"
      "epson-lq-690ii-24-pin-dot-matrix-printer"              → "epson-lq-690ii"
      "hp-laserjet-mfp-m141w-printer"                         → "hp-laserjet-mfp-m141w"
      "dell-5400-core-i5-8gb-..."                             → "dell-5400"
      "hp-pro-x2-612-g2"                                      → "hp-pro-x2-612-g2"
    """
    norm = normalize(text)
    
    # Common patterns for model identifiers:
    # Brand + Series + ModelNumber (+ optional generation suffix like g3, g5)
    patterns = [
        # HP/Dell/Lenovo laptop model patterns (brand-series-model-gen)
        r'^((?:hp|dell|lenovo|onn|thinkpad|latitude|probook|elitebook|zbook)[\w-]*?-(?:[a-z]*\d+[\w]*(?:-g\d+)?))',
        # With brand prefix duplicated (dell-dell-refurbished-latitude-7350 → dell-latitude-7350)
        r'^(?:dell-dell-\w+-)(latitude-\d+)',
        # Epson printer models
        r'^(epson-[\w-]*?-[a-z]*\d+[\w]*)',
        # Canon printer models 
        r'^(canon-[\w-]*?-[a-z]*\d+[\w]*)',
        # Transcend models
        r'^(transcend-[\w-]*?-\d+\w*)',
    ]
    
    for pat in patterns:
        m = re.match(pat, norm)
        if m:
            return m.group(1)
    
    return norm


def match_images_smart(slug: str, title: str, filenames: list[str], norm_filenames: list[str]) -> list[str]:
    """
    Match product to images using multiple strategies:
    
    1. Exact slug containment (slug found in filename or vice versa)
    2. Model key matching (extract model identifiers and compare)
    3. Significant keyword overlap (for products with no model number)
    """
    norm_slug = normalize(slug)
    matches = []

    # Strategy 1: Direct containment (either direction)
    for i, norm_fn in enumerate(norm_filenames):
        if norm_slug in norm_fn or norm_fn in norm_slug:
            matches.append(filenames[i])

    if matches:
        return sorted(set(matches))

    # Strategy 2: Match on significant shared segments
    # Split slug into segments and find images sharing the longest prefix
    slug_parts = norm_slug.split("-")
    best_matches = []
    best_score = 0

    for i, norm_fn in enumerate(norm_filenames):
        fn_parts = norm_fn.split("-")
        
        # Count matching prefix length
        prefix_len = 0
        for sp, fp in zip(slug_parts, fn_parts):
            if sp == fp:
                prefix_len += 1
            else:
                break
        
        # Also try matching without the first word if it's a common modifier
        # e.g., slug="refurbished-hp-elitebook-..." vs file="hp-elitebook-..."
        skip_words = {"refurbished", "renewed", "refurb", "ex", "uk", "brand", "new", "dell", "hp"}
        
        # Try skipping leading modifiers in slug
        slug_offset = 0
        while slug_offset < len(slug_parts) - 1 and slug_parts[slug_offset] in skip_words:
            slug_offset += 1
        
        fn_offset = 0
        while fn_offset < len(fn_parts) - 1 and fn_parts[fn_offset] in skip_words:
            fn_offset += 1
        
        alt_prefix_len = 0
        for sp, fp in zip(slug_parts[slug_offset:], fn_parts[fn_offset:]):
            if sp == fp:
                alt_prefix_len += 1
            else:
                break
        
        score = max(prefix_len, alt_prefix_len)
        
        # Require at least 4 matching segments for a match
        # (brand + series + model# + one more distinguishing segment)
        if score >= 4:
            if score > best_score:
                best_score = score
                best_matches = [filenames[i]]
            elif score == best_score:
                best_matches.append(filenames[i])

    if best_matches:
        return sorted(set(best_matches))

    return []


# ── Main ────────────────────────────────────────────────────────
def link_images():
    if DRY_RUN:
        print("🔍  DRY RUN – no database writes will be made.\n")

    # 0. Check buckets
    print("🪣  Checking available buckets...")
    try:
        buckets = supabase.storage.list_buckets()
        print(f"   Available buckets: {[b.name for b in buckets]}")
        if BUCKET not in [b.name for b in buckets]:
            print(f"❌  Error: Bucket '{BUCKET}' not found!")
            return
    except Exception as e:
        print(f"❌  Error listing buckets: {e}")
        return

    # 1. List all storage files
    print("📂  Listing files in storage bucket…")
    filenames = list_bucket_files()
    print(f"   Found {len(filenames)} files in '{BUCKET}'.\n")

    if not filenames:
        print("⚠️  Bucket is empty. Upload images first.")
        return

    # Pre-normalize all filenames once
    norm_filenames = [normalize(fn) for fn in filenames]

    # 2. Fetch all products
    print("📦  Fetching products…")
    response = supabase.table("products").select("id, slug, title, images").execute()
    products = response.data

    if not products:
        print("⚠️  No products found in the table.")
        return

    print(f"   Found {len(products)} products.\n")

    # 3. Match & update
    updated   = 0
    skipped   = 0
    no_match  = []

    for p in products:
        slug  = p["slug"]
        title = p.get("title", "")
        pid   = p["id"]

        matched = match_images_smart(slug, title, filenames, norm_filenames)

        if not matched:
            no_match.append(slug)
            skipped += 1
            continue

        urls = [public_url(fn) for fn in matched]

        print(f"  ✅  {slug[:80]}")
        for fn in matched:
            print(f"       ↳ {fn}")

        if not DRY_RUN:
            supabase.table("products").update({"images": urls}).eq("id", pid).execute()

        updated += 1

    # 4. Summary
    print("\n" + "─" * 50)
    print(f"✅  Matched & {'would update' if DRY_RUN else 'updated'}: {updated}")
    print(f"⏭️   Skipped (no matching images):  {skipped}")

    if no_match:
        print(f"\n⚠️  Products with NO images found ({len(no_match)}):")
        for s in no_match:
            print(f"     • {s[:80]}")

    if DRY_RUN:
        print("\n💡  Run without --dry-run to apply changes:")
        print("    python3 scripts/link_images.py")


if __name__ == "__main__":
    link_images()
