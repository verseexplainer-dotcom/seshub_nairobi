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
  python3 scripts/link_images.py --min-confidence 0.80
  python3 scripts/link_images.py --overrides-file scripts/image_overrides.json
  python3 scripts/link_images.py --allow-low-confidence
"""

import os
import sys
import re
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# ── Config ──────────────────────────────────────────────────────
load_dotenv(dotenv_path=".env.local") # reads project .env.local

URL  = os.getenv("PUBLIC_SUPABASE_URL")
KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")   # service-role for writes
BUCKET = "product-images"

DRY_RUN = "--dry-run" in sys.argv
ALLOW_LOW_CONFIDENCE = "--allow-low-confidence" in sys.argv

def parse_arg_value(flag: str, default: str) -> str:
    for i, arg in enumerate(sys.argv):
        if arg == flag and i + 1 < len(sys.argv):
            return sys.argv[i + 1].strip()
    return default

OVERRIDES_FILE = parse_arg_value("--overrides-file", "scripts/image_overrides.json")
MIN_CONFIDENCE = float(os.getenv("IMAGE_LINK_MIN_CONFIDENCE", parse_arg_value("--min-confidence", "0.72")))

def parse_category_filter(argv: list[str]) -> set[str]:
    """
    Parse --categories laptops,smartphones into a normalized set.
    Supports values separated by comma and/or spaces.
    """
    categories: set[str] = set()
    for i, arg in enumerate(argv):
        if arg == "--categories" and i + 1 < len(argv):
            raw = argv[i + 1]
            parts = [p.strip().lower() for p in raw.replace(" ", ",").split(",")]
            categories = {p for p in parts if p}
            break
    return categories

CATEGORY_FILTER = parse_category_filter(sys.argv)

if not URL or not KEY:
    print("❌  Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

supabase: Client = create_client(URL, KEY)

def load_overrides(path: str) -> dict[str, list[str]]:
    """
    Load manual image overrides from JSON object:
      {
        "product-slug": ["filename-1.webp", "filename-2.webp"]
      }
    """
    if not path:
        return {}

    if not os.path.exists(path):
        return {}

    try:
        raw = json.loads(open(path, "r", encoding="utf-8").read())
    except Exception as exc:
        print(f"⚠️  Could not parse overrides file '{path}': {exc}")
        return {}

    if not isinstance(raw, dict):
        print(f"⚠️  Overrides file '{path}' must contain a JSON object.")
        return {}

    cleaned: dict[str, list[str]] = {}
    for slug, files in raw.items():
        if not isinstance(slug, str) or not isinstance(files, list):
            continue
        valid_files = [f.strip() for f in files if isinstance(f, str) and f.strip()]
        if valid_files:
            cleaned[slug.strip()] = valid_files
    return cleaned


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
    parts = [part for part in norm.split("-") if part]
    if not parts:
        return norm

    stop_words = {
        "core",
        "intel",
        "amd",
        "ryzen",
        "ram",
        "ssd",
        "hdd",
        "storage",
        "touch",
        "touchscreen",
        "wireless",
        "wifi",
        "brand",
        "new",
        "refurbished",
        "refurbish",
        "refurb",
        "renewed",
        "ex",
        "grade",
        "laptop",
        "desktop",
        "printer",
        "phone",
        "smartphone",
        "nairobi",
        "business",
        "portable",
        "external",
        "usb",
        "detachable",
        "display",
        "screen",
        "windows",
        "bluetooth",
        "camera",
        "stylus",
        "network",
        "multifunction",
        "scanner",
        "copier",
        "office",
        "dot",
        "matrix",
        "all",
        "one",
        "monochrome",
        "duplex",
        "fax",
        "print",
        "copy",
        "rom",
        "lte",
        "mah",
        "android",
        "battery",
        "speaker",
        "speakers",
    }

    result = []
    seen_model_marker = False

    for index, part in enumerate(parts):
        next_part = parts[index + 1] if index + 1 < len(parts) else ""

        if result and seen_model_marker:
            if part in stop_words:
                break
            if re.fullmatch(r"\d+(?:gb|tb)", part):
                break
            if part in {"5g", "4g", "3g"}:
                break
            if re.fullmatch(r"\d+(?:st|nd|rd|th)", part) and next_part in {"gen", "generation"}:
                break
            if part.isdigit() and next_part in {"pin", "inch", "inches", "ppm", "mp"}:
                break

        result.append(part)
        if re.search(r"\d", part):
            seen_model_marker = True

    if len(result) >= 2 and result[0] == result[1]:
        result.pop(1)

    return "-".join(result) if result else norm


def is_generic_model_token(part: str) -> bool:
    return part in {
        "brand",
        "new",
        "refurbished",
        "refurbish",
        "refurb",
        "renewed",
        "printer",
        "laptop",
        "desktop",
        "smartphone",
        "phone",
        "wireless",
        "wifi",
        "ecotank",
        "photo",
        "color",
        "colour",
        "ink",
        "tank",
        "connectivity",
        "high",
        "volume",
        "low",
        "cost",
        "wide",
        "format",
        "business",
        "office",
        "portable",
        "external",
        "all",
        "one",
        "duplex",
        "touch",
        "touchscreen",
        "display",
        "screen",
        "with",
        "without",
        "and",
        "the",
    }


def is_obvious_spec_token(part: str, next_part: str = "") -> bool:
    if not part:
        return False
    if re.fullmatch(r"a\d{1,2}", part):
        return True
    if re.fullmatch(r"\d+(?:gb|tb|mah|hz|w|wh|yr|yrs)", part):
        return True
    if part in {"5g", "4g", "3g"}:
        return True
    if re.fullmatch(r"\d+(?:st|nd|rd|th)", part) and next_part in {"gen", "generation"}:
        return True
    if part.isdigit() and next_part in {"pin", "inch", "inches", "ppm", "mp", "yr", "yrs", "year", "years", "month", "months", "in"}:
        return True
    return False


def is_model_suffix_token(part: str) -> bool:
    return bool(re.fullmatch(r"[ivx]{1,4}", part))


def extract_model_signature(text: str) -> str:
    """
    Build a more stable model signature than `extract_model_key`.

    This focuses on the brand, the nearest product-line token before the
    first meaningful model token, and the compact model suffix after it.
    It is intended to handle cases where filenames and slugs use different
    descriptor orderings, such as:
      "epson-l8050-a4-6-colour-photo-printer-ecotank-brand-new"
      "epson-ecotank-l8050-photo-printer-color-ink-tank-..."
    """
    parts = [part for part in normalize(text).split("-") if part]
    if not parts:
        return ""

    if len(parts) == 1:
        return parts[0]

    brand = parts[0]
    model_index = None
    for index in range(1, len(parts)):
        part = parts[index]
        next_part = parts[index + 1] if index + 1 < len(parts) else ""
        if re.search(r"\d", part) and not is_obvious_spec_token(part, next_part):
            model_index = index
            break

    if model_index is None:
        return extract_model_key(text)

    prefix_tokens = [
        part
        for part in parts[1:model_index]
        if not is_generic_model_token(part) and not is_obvious_spec_token(part)
    ]

    signature = [brand, *prefix_tokens[-2:]]
    for index in range(model_index, len(parts)):
        part = parts[index]
        next_part = parts[index + 1] if index + 1 < len(parts) else ""

        if index != model_index and is_obvious_spec_token(part, next_part):
            break

        if index != model_index and is_generic_model_token(part):
            break

        if index != model_index and not re.search(r"\d", part) and not is_model_suffix_token(part):
            break

        signature.append(part)

    deduped: list[str] = []
    for part in signature:
        if deduped and deduped[-1] == part:
            continue
        deduped.append(part)

    return "-".join(deduped)


def match_images_smart(
    slug: str,
    title: str,
    filenames: list[str],
    norm_filenames: list[str],
    file_model_keys: list[str],
    file_model_signatures: list[str],
) -> tuple[list[str], float, str]:
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
        return sorted(set(matches)), 0.92, "slug_containment"

    # Strategy 2: Match on extracted model keys.
    candidate_model_keys = []
    for raw in [slug, title]:
        model_key = extract_model_key(raw)
        if not model_key:
            continue
        if not re.search(r"\d", model_key):
            continue
        if model_key not in candidate_model_keys:
            candidate_model_keys.append(model_key)

    exact_model_matches = []
    contained_model_matches = []
    for i, file_model_key in enumerate(file_model_keys):
        for candidate_model_key in candidate_model_keys:
            if candidate_model_key == file_model_key:
                exact_model_matches.append(filenames[i])
                break
            if candidate_model_key in file_model_key or file_model_key in candidate_model_key:
                contained_model_matches.append(filenames[i])
                break

    if exact_model_matches:
        return sorted(set(exact_model_matches)), 0.88, "model_key_exact"

    if contained_model_matches:
        return sorted(set(contained_model_matches)), 0.84, "model_key_containment"

    # Strategy 2b: Match on compact model signatures.
    candidate_signatures = []
    for raw in [slug, title]:
        signature = extract_model_signature(raw)
        if not signature:
            continue
        if not re.search(r"\d", signature):
            continue
        if signature not in candidate_signatures:
            candidate_signatures.append(signature)

    exact_signature_matches = []
    contained_signature_matches = []
    for i, file_model_signature in enumerate(file_model_signatures):
        for candidate_signature in candidate_signatures:
            if candidate_signature == file_model_signature:
                exact_signature_matches.append(filenames[i])
                break
            if candidate_signature in file_model_signature or file_model_signature in candidate_signature:
                contained_signature_matches.append(filenames[i])
                break

    if exact_signature_matches:
        return sorted(set(exact_signature_matches)), 0.87, "model_signature_exact"

    if contained_signature_matches:
        return sorted(set(contained_signature_matches)), 0.83, "model_signature_containment"

    # Strategy 3: Match on significant shared segments.
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
        skip_words = {
            "refurbished",
            "refurbish",
            "renewed",
            "refurb",
            "ex",
            "uk",
            "brand",
            "new",
            "dell",
            "hp",
            "lenovo",
            "apple",
            "samsung",
            "infinix",
            "tecno",
            "redmi",
            "canon",
            "epson",
            "transcend",
            "laptop",
            "printer",
            "desktop",
            "smartphone",
            "phone",
            "touch",
            "touchscreen",
            "nairobi",
        }
        
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
        # Normalize confidence from prefix score.
        # score=4 ~ 0.72, score>=6 ~ 0.88
        confidence = min(0.88, 0.4 + (best_score * 0.08))
        return sorted(set(best_matches)), confidence, "prefix_match"

    return [], 0.0, "no_match"


# ── Main ────────────────────────────────────────────────────────
def link_images():
    if DRY_RUN:
        print("🔍  DRY RUN – no database writes will be made.\n")
    if CATEGORY_FILTER:
        print(f"🎯  Category filter: {sorted(CATEGORY_FILTER)}\n")
    print(f"🎚️  Minimum confidence: {MIN_CONFIDENCE:.2f}")
    if ALLOW_LOW_CONFIDENCE:
        print("⚠️  Low confidence updates enabled via --allow-low-confidence")
    overrides = load_overrides(OVERRIDES_FILE)
    if overrides:
        print(f"🛠️  Loaded {len(overrides)} manual overrides from {OVERRIDES_FILE}")
    else:
        print(f"🛠️  No manual overrides loaded ({OVERRIDES_FILE})")
    print("")

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
    file_model_keys = [extract_model_key(fn) for fn in filenames]
    file_model_signatures = [extract_model_signature(fn) for fn in filenames]

    # 2. Fetch all products
    print("📦  Fetching products…")
    response = supabase.table("products").select("id, slug, title, images, category").execute()
    products = response.data

    if not products:
        print("⚠️  No products found in the table.")
        return

    if CATEGORY_FILTER:
        products = [
            p for p in products
            if str(p.get("category", "")).strip().lower() in CATEGORY_FILTER
        ]

        if not products:
            print("⚠️  No products found for the requested categories.")
            return

    print(f"   Found {len(products)} products.\n")

    # 3. Match & update
    updated = 0
    skipped = 0
    no_match = []
    low_confidence = []
    overridden = 0

    for p in products:
        slug  = p["slug"]
        title = p.get("title", "")
        pid   = p["id"]

        override_files = overrides.get(slug) or overrides.get(str(slug).strip().lower())
        strategy = "manual_override" if override_files else "no_match"
        confidence = 1.0 if override_files else 0.0
        if override_files:
            matched = [fn for fn in override_files if fn in filenames]
            missing_override_files = [fn for fn in override_files if fn not in filenames]
            if missing_override_files:
                print(f"  ⚠️  {slug[:80]} override references missing files: {missing_override_files}")
            if matched:
                overridden += 1
            else:
                matched = []
        else:
            matched, confidence, strategy = match_images_smart(
                slug,
                title,
                filenames,
                norm_filenames,
                file_model_keys,
                file_model_signatures,
            )

        if not matched:
            no_match.append(slug)
            skipped += 1
            continue

        if confidence < MIN_CONFIDENCE and not ALLOW_LOW_CONFIDENCE:
            low_confidence.append((slug, confidence, strategy, matched))
            skipped += 1
            continue

        urls = [public_url(fn) for fn in matched]

        print(f"  ✅  {slug[:80]}  ({strategy}, confidence={confidence:.2f})")
        for fn in matched:
            print(f"       ↳ {fn}")

        if not DRY_RUN:
            update_payload = {"images": urls}
            if strategy == "manual_override":
                update_payload["image_overrides"] = matched
            supabase.table("products").update(update_payload).eq("id", pid).execute()

        updated += 1

    # 4. Summary
    print("\n" + "─" * 50)
    print(f"✅  Matched & {'would update' if DRY_RUN else 'updated'}: {updated}")
    print(f"🛠️   Updated via manual overrides:   {overridden}")
    print(f"⏭️   Skipped (no matching images):  {skipped}")

    if low_confidence:
        print(f"\n⚠️  Skipped low-confidence matches ({len(low_confidence)}):")
        for slug, conf, strategy, matched in low_confidence:
            print(f"     • {slug[:80]} ({strategy}, confidence={conf:.2f}) -> {matched[:3]}")

    if no_match:
        print(f"\n⚠️  Products with NO images found ({len(no_match)}):")
        for s in no_match:
            print(f"     • {s[:80]}")

    if DRY_RUN:
        print("\n💡  Run without --dry-run to apply changes:")
        print("    python3 scripts/link_images.py")


if __name__ == "__main__":
    link_images()
