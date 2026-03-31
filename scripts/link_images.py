#!/usr/bin/env python3
"""
link_images.py – Connect products in Supabase with images in Storage.

Workflow:
  1. Lists every file in the `product-images` bucket.
  2. Fetches every product (id, slug, title, images).
  3. For each product, finds the best matching storage files using
     model-keyword extraction (e.g. "dell-latitude-5411" from slug
     matches "dell-latitude-5411-core-i5-..." from image filename).
  4. Updates `images` with exact storage filenames only.

Important:
  - This script does not rename files.
  - This script does not rewrite image references into public URLs.
  - The database keeps the exact storage object names returned by Supabase.

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
import csv
from pathlib import Path
from urllib.parse import urlparse, unquote
from supabase import create_client, Client
from dotenv import load_dotenv

# ── Config ──────────────────────────────────────────────────────
load_dotenv(dotenv_path=".env.local") # reads project .env.local

URL  = os.getenv("PUBLIC_SUPABASE_URL")
KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")   # service-role for writes
BUCKET = "product-images"

DRY_RUN = "--dry-run" in sys.argv
ALLOW_LOW_CONFIDENCE = "--allow-low-confidence" in sys.argv
ONLY_MISSING_IMAGES = "--only-missing-images" in sys.argv
ALLOW_LOOSE_MATCH = "--allow-loose-match" in sys.argv

def parse_arg_value(flag: str, default: str) -> str:
    for i, arg in enumerate(sys.argv):
        if arg == flag and i + 1 < len(sys.argv):
            return sys.argv[i + 1].strip()
    return default

OVERRIDES_FILE = parse_arg_value("--overrides-file", "scripts/image_overrides.json")
PRODUCTS_CSV = parse_arg_value("--products-csv", "public/products_clean.csv")
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

supabase: Client | None = None


def get_supabase() -> Client:
    global supabase

    if supabase is not None:
        return supabase

    if not URL or not KEY:
        print("❌  Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    supabase = create_client(URL, KEY)
    return supabase

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


def load_products_csv(path: str) -> dict[str, dict[str, str]]:
    if not path:
        return {}

    csv_path = Path(path)
    if not csv_path.exists():
        return {}

    try:
        with csv_path.open("r", newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
    except Exception as exc:
        print(f"⚠️  Could not read products CSV '{path}': {exc}")
        return {}

    by_slug: dict[str, dict[str, str]] = {}
    for row in rows:
        slug = str(row.get("slug", "")).strip().lower()
        if slug:
            by_slug[slug] = row
    return by_slug


# ── Helpers ─────────────────────────────────────────────────────
def normalize(text: str) -> str:
    """Lower-case, strip extension, replace non-alphanum with hyphens."""
    text = text.lower()
    text = re.sub(r"([a-z]\d+)\+", r"\1-plus", text)
    text = re.sub(r"\.\w{3,4}$", "", text)          # remove .webp / .jpg etc.
    text = re.sub(r"\s*\(\d+\)$", "", text)          # remove " (2)" suffixes
    text = re.sub(r"[^a-z0-9]+", "-", text)          # non-alphanum → hyphen
    parts = [part for part in text.strip("-").split("-") if part]
    normalized_map = {
        "hinkpad": "thinkpad",
        "m0nths": "months",
        "moths": "months",
        "precission": "precision",
        "reburbished": "refurbished",
        "wrty": "warranty",
    }
    return "-".join(normalized_map.get(part, part) for part in parts)


GENERIC_MATCH_TOKENS = {
    "and",
    "brand",
    "business",
    "copy",
    "desktop",
    "display",
    "dual",
    "ex",
    "for",
    "grade",
    "graphics",
    "inch",
    "inches",
    "installed",
    "intel",
    "laptop",
    "months",
    "nairobi",
    "new",
    "office",
    "phone",
    "portable",
    "printer",
    "professional",
    "ram",
    "refurb",
    "refurbish",
    "refurbished",
    "renewed",
    "screen",
    "sim",
    "smartphone",
    "ssd",
    "storage",
    "touch",
    "touchscreen",
    "uk",
    "warranty",
    "webcam",
    "wifi",
    "wireless",
    "windows",
}

VARIANT_CONFLICT_TOKENS = {
    "air",
    "carbon",
    "fe",
    "flip",
    "fold",
    "max",
    "mini",
    "note",
    "plus",
    "premier",
    "pro",
    "ultra",
    "x360",
    "yoga",
}

MODEL_HINT_TOKENS = {
    "camon",
    "ecotank",
    "elitebook",
    "galaxy",
    "ideapad",
    "iphone",
    "laserjet",
    "latitude",
    "macbook",
    "note",
    "omnibook",
    "optiplex",
    "pixma",
    "pop",
    "probook",
    "redmi",
    "spark",
    "storejet",
    "taskalfa",
    "thinkbook",
    "thinkcentre",
    "thinkpad",
    "xps",
    "zbook",
}

MODEL_LEADING_TOKENS = {
    "apple",
    "canon",
    "dell",
    "epson",
    "galaxy",
    "generic",
    "hp",
    "huawei",
    "infinix",
    "iphone",
    "lenovo",
    "onn",
    "redmi",
    "refurb",
    "refurbished",
    "renewed",
    "samsung",
    "tecno",
    "transcend",
    "xiaomi",
}


def normalized_parts(text: str) -> list[str]:
    return [part for part in normalize(text).split("-") if part]


def trim_image_sequence(parts: list[str]) -> list[str]:
    if len(parts) > 2 and parts[-1].isdigit():
        return parts[:-1]
    return parts


def filename_from_ref(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""

    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                for entry in parsed:
                    filename = filename_from_ref(entry)
                    if filename:
                        return filename
        except Exception:
            pass

    if "/storage/v1/object/public/" in raw:
        raw = raw.split("/storage/v1/object/public/", 1)[1]
        raw = raw.split("/", 1)[1] if "/" in raw else raw

    parsed_path = urlparse(raw).path
    if parsed_path:
        raw = parsed_path

    return unquote(raw.rsplit("/", 1)[-1]).strip()


def split_image_refs(value: object) -> list[str]:
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("[") and raw.endswith("]"):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    items = parsed
                else:
                    items = [raw]
            except Exception:
                items = re.split(r"[\n,]+", raw)
        else:
            items = re.split(r"[\n,]+", raw)
    else:
        return []

    filenames: list[str] = []
    for item in items:
        filename = filename_from_ref(str(item))
        if filename:
            filenames.append(filename)
    return filenames


def extract_capacity_values(text: str) -> set[int]:
    values: set[int] = set()
    for amount, unit in re.findall(r"(\d+)\s*(gb|tb)", normalize(text)):
        numeric = int(amount)
        values.add(numeric * 1024 if unit == "tb" else numeric)
    return values


def capacity_values_from_product(product: dict, csv_row: dict[str, str] | None) -> tuple[set[int], set[int]]:
    storage_values: set[int] = set()
    ram_values: set[int] = set()

    for source in (product, csv_row or {}):
        raw_storage = source.get("storage_gb") if isinstance(source, dict) else None
        raw_ram = source.get("ram_gb") if isinstance(source, dict) else None

        try:
            if raw_storage not in (None, ""):
                storage_values.add(int(float(raw_storage)))
        except Exception:
            pass

        try:
            if raw_ram not in (None, ""):
                ram_values.add(int(float(raw_ram)))
        except Exception:
            pass

    texts = [
        product.get("slug", ""),
        product.get("title", ""),
        product.get("short_specs", ""),
        product.get("cpu", ""),
        (csv_row or {}).get("title", ""),
        (csv_row or {}).get("short_specs", ""),
        (csv_row or {}).get("short_description", ""),
        (csv_row or {}).get("search_keywords", ""),
    ]
    inferred = sorted({value for text in texts for value in extract_capacity_values(str(text))})

    if not storage_values:
        large_values = [value for value in inferred if value >= 64]
        if large_values:
            storage_values.add(max(large_values))

    if not ram_values:
        small_values = [value for value in inferred if value < 64]
        if small_values:
            ram_values.add(min(small_values))

    return storage_values, ram_values


def extract_cpu_tokens(text: str) -> set[str]:
    parts = normalized_parts(text)
    tokens: set[str] = set()

    for index, part in enumerate(parts):
        normalized_part = part[1:] if re.fullmatch(r"ci[3579]", part) else part
        if normalized_part in {"i3", "i5", "i7", "i9", "m3", "m5", "m7", "n100", "celeron", "pentium", "xeon"}:
            tokens.add(normalized_part)
            continue

        if part == "ryzen" and index + 1 < len(parts) and parts[index + 1] in {"3", "5", "7", "9"}:
            tokens.add(f"ryzen-{parts[index + 1]}")
            continue

        if part == "core" and index + 2 < len(parts) and parts[index + 1] == "ultra" and parts[index + 2].isdigit():
            tokens.add(f"core-ultra-{parts[index + 2]}")

    return tokens


def expand_alias_tokens(tokens: set[str], brand: str, category: str) -> set[str]:
    expanded = set(tokens)
    expanded.update(normalized_parts(brand))
    expanded.update(normalized_parts(category))

    if "iphone" in expanded:
        expanded.add("apple")

    if "galaxy" in expanded:
        expanded.add("samsung")

    if "redmi" in expanded:
        expanded.add("xiaomi")

    if "laserjet" in expanded:
        expanded.update({"jet", "laser"})

    if "jet" in expanded and ("hp" in expanded or "printer" in expanded or "printers" in expanded):
        expanded.add("laserjet")

    if "touchscreen" in expanded:
        expanded.add("touch")

    if "touch" in expanded:
        expanded.add("touchscreen")

    return expanded


def extract_required_model_tokens(texts: list[str], brand: str, category: str) -> set[str]:
    tokens: set[str] = set()
    for text in texts:
        for part in expand_alias_tokens(set(normalized_parts(text)), brand, category):
            if part in MODEL_HINT_TOKENS or part in VARIANT_CONFLICT_TOKENS or re.search(r"\d", part):
                tokens.add(part)
    return {token for token in tokens if token not in GENERIC_MATCH_TOKENS}


def build_file_profile(filename: str, norm_filename: str, model_key: str, model_signature: str) -> dict:
    parts = trim_image_sequence(normalized_parts(filename))
    tokens = expand_alias_tokens(set(parts), parts[0] if parts else "", "")
    model_sources = [source for source in [model_key, model_signature] if source]
    return {
        "filename": filename,
        "norm": norm_filename,
        "parts": parts,
        "tokens": tokens,
        "model_key": model_key,
        "model_signature": model_signature,
        "required_model_tokens": extract_required_model_tokens([filename], parts[0] if parts else "", ""),
        "model_id_tokens": extract_model_id_tokens(
            {
                token
                for source in model_sources
                for token in normalized_parts(source)
            }
        ),
        "variant_tokens": tokens & VARIANT_CONFLICT_TOKENS,
        "cpu_tokens": extract_cpu_tokens(filename),
        "capacity_values": extract_capacity_values(filename),
    }


def build_product_profile(product: dict, csv_row: dict[str, str] | None) -> dict:
    slug = str(product.get("slug", "")).strip()
    title = str(product.get("title", "")).strip()
    brand = str(product.get("brand") or (csv_row or {}).get("brand") or "").strip()
    category = str(product.get("category") or (csv_row or {}).get("category") or "").strip()

    text_sources = [
        slug,
        title,
        str(product.get("cpu", "")).strip(),
        str(product.get("short_specs", "")).strip(),
        str((csv_row or {}).get("title", "")).strip(),
        str((csv_row or {}).get("short_specs", "")).strip(),
        str((csv_row or {}).get("short_description", "")).strip(),
        str((csv_row or {}).get("search_keywords", "")).strip(),
        str((csv_row or {}).get("meta_title", "")).strip(),
    ]
    filtered_texts = [text for text in text_sources if text]

    model_keys: list[str] = []
    model_signatures: list[str] = []
    for text in filtered_texts[:4]:
        key = extract_model_key(text)
        signature = extract_model_signature(text)
        if key and key not in model_keys:
            model_keys.append(key)
        if signature and signature not in model_signatures:
            model_signatures.append(signature)

    base_tokens = set()
    for text in filtered_texts:
        base_tokens.update(normalized_parts(text))
    expanded_tokens = expand_alias_tokens(base_tokens, brand, category)
    variant_source_tokens = expand_alias_tokens(
        {
            token
            for text in [slug, title, str((csv_row or {}).get("title", ""))]
            for token in normalized_parts(text)
        },
        brand,
        category,
    )

    storage_values, ram_values = capacity_values_from_product(product, csv_row)
    cpu_tokens = set()
    for text in filtered_texts:
        cpu_tokens.update(extract_cpu_tokens(text))

    existing_refs: list[str] = []
    for source in (
        product.get("image_overrides"),
        product.get("images"),
        (csv_row or {}).get("primary_image", ""),
        (csv_row or {}).get("images", ""),
    ):
        for filename in split_image_refs(source):
            if filename not in existing_refs:
                existing_refs.append(filename)

    return {
        "slug": slug,
        "title": title,
        "brand": brand,
        "category": category,
        "norm_slug": normalize(slug),
        "tokens": expanded_tokens,
        "required_model_tokens": extract_required_model_tokens(filtered_texts[:4], brand, category),
        "model_id_tokens": extract_model_id_tokens(
            {
                token
                for source in [*model_keys, *model_signatures]
                for token in normalized_parts(source)
            }
        ),
        "variant_tokens": variant_source_tokens & VARIANT_CONFLICT_TOKENS,
        "model_keys": model_keys,
        "model_signatures": model_signatures,
        "storage_values": storage_values,
        "ram_values": ram_values,
        "cpu_tokens": cpu_tokens,
        "existing_refs": existing_refs,
    }


def has_variant_conflict(product_profile: dict, file_profile: dict) -> bool:
    category = product_profile.get("category", "")
    product_variants = normalized_variant_tokens(product_profile["variant_tokens"], category)
    file_variants = normalized_variant_tokens(file_profile["variant_tokens"], category)
    return bool((product_variants - file_variants) or (file_variants - product_variants))


def has_cpu_conflict(product_profile: dict, file_profile: dict) -> bool:
    product_cpu = product_profile["cpu_tokens"]
    file_cpu = file_profile["cpu_tokens"]
    return bool(product_cpu and file_cpu and product_cpu.isdisjoint(file_cpu))


def extract_model_id_tokens(parts_or_tokens: list[str] | set[str]) -> set[str]:
    tokens = parts_or_tokens if isinstance(parts_or_tokens, set) else set(parts_or_tokens)
    model_ids: set[str] = set()
    for token in tokens:
        if token in {"3g", "4g", "5g"}:
            continue
        if re.fullmatch(r"\d+(?:gb|tb|mah|hz|w|mp|yr)", token):
            continue
        if re.fullmatch(r"\d+(?:st|nd|rd|th)", token):
            continue
        if token.isdigit():
            model_ids.add(token)
            continue
        if re.search(r"\d", token):
            model_ids.add(token)
    return model_ids


def token_series_key(token: str) -> str:
    token = normalize(token)
    if not token:
        return ""

    leading_match = re.fullmatch(r"([a-z]+)\d+[a-z]*", token)
    if leading_match:
        return leading_match.group(1)

    trailing_match = re.fullmatch(r"\d+([a-z]+)", token)
    if trailing_match:
        return trailing_match.group(1)

    return re.sub(r"\d+", "", token)


def model_identity_forms(value: str) -> set[str]:
    parts = normalized_parts(value)
    if not parts:
        return set()

    forms: set[str] = set()
    current = parts[:]
    while current:
        forms.add("-".join(current))
        if len(current) <= 1 or current[0] not in MODEL_LEADING_TOKENS:
            break
        current = current[1:]
    return forms


def is_specific_model_form(form: str) -> bool:
    tokens = [token for token in normalized_parts(form) if token]
    if not tokens:
        return False

    model_tokens = {
        token
        for token in tokens
        if token not in {"i3", "i5", "i7", "i9", "m3", "m5", "m7"}
        and (
            token in MODEL_HINT_TOKENS
            or token in VARIANT_CONFLICT_TOKENS
            or re.fullmatch(r"[a-z]+\d+[a-z]*", token)
            or re.fullmatch(r"\d+[a-z]+", token)
        )
    }
    return bool(model_tokens)


def normalized_variant_tokens(tokens: set[str], category: str) -> set[str]:
    category = normalize(category)
    if category in {"smartphone", "smartphones"}:
        return tokens & {"fe", "flip", "fold", "max", "mini", "note", "plus", "premier", "pro", "ultra"}

    if category in {"laptop", "laptops", "desktop", "desktops"}:
        relevant = tokens & {"air", "carbon", "flip", "x360", "yoga"}
        if relevant & {"flip", "x360", "yoga"}:
            relevant = (relevant - {"flip", "x360", "yoga"}) | {"convertible"}
        return relevant

    return set()


def has_strong_model_match(product_profile: dict, file_profile: dict) -> bool:
    file_forms = set()
    product_forms = set()

    for value in [file_profile["model_key"], file_profile["model_signature"]]:
        file_forms.update({form for form in model_identity_forms(value) if is_specific_model_form(form)})

    for value in [*product_profile["model_keys"], *product_profile["model_signatures"]]:
        product_forms.update({form for form in model_identity_forms(value) if is_specific_model_form(form)})

    return bool(file_forms & product_forms)


def has_model_conflict(product_profile: dict, file_profile: dict) -> bool:
    product_ids = product_profile["model_id_tokens"]
    file_ids = file_profile["model_id_tokens"]

    if not product_ids or not file_ids:
        return False

    product_by_series: dict[str, str] = {}
    file_by_series: dict[str, str] = {}
    for token in product_ids:
        key = token_series_key(token)
        if key:
            product_by_series[key] = token
    for token in file_ids:
        key = token_series_key(token)
        if key:
            file_by_series[key] = token

    for series_key in product_by_series.keys() & file_by_series.keys():
        if product_by_series[series_key] != file_by_series[series_key]:
            return True

    if product_ids.isdisjoint(file_ids) and product_profile["required_model_tokens"] & file_profile["tokens"]:
        return True

    return False


def has_capacity_conflict(product_profile: dict, file_profile: dict) -> bool:
    file_values = file_profile["capacity_values"]
    if not file_values:
        return False

    storage_values = product_profile["storage_values"]
    ram_values = product_profile["ram_values"]

    if storage_values and storage_values.isdisjoint(file_values) and any(value >= 64 for value in file_values):
        return True

    if ram_values and len(file_values) >= 2 and ram_values.isdisjoint(file_values):
        return True

    return False


def is_capacity_sensitive_product(product_profile: dict) -> bool:
    category = normalize(product_profile.get("category", ""))
    return category in {"accessory", "accessories", "storage"}


def score_candidate(product_profile: dict, file_profile: dict, prefer_existing: bool = False) -> tuple[float, str] | None:
    strong_model_match = has_strong_model_match(product_profile, file_profile)

    if has_variant_conflict(product_profile, file_profile):
        return None

    if has_model_conflict(product_profile, file_profile):
        return None

    if not strong_model_match and has_cpu_conflict(product_profile, file_profile):
        return None

    if (not strong_model_match or is_capacity_sensitive_product(product_profile)) and has_capacity_conflict(product_profile, file_profile):
        return None

    score = 0.0
    reasons: list[str] = []
    filename = file_profile["filename"]

    if prefer_existing:
        score += 160.0
        reasons.append("existing_ref")

    if strong_model_match:
        score += 76.0
        reasons.append("model_identity_match")

    if product_profile["norm_slug"] == file_profile["norm"]:
        score += 120.0
        reasons.append("slug_exact")
    elif product_profile["norm_slug"] in file_profile["norm"] or file_profile["norm"] in product_profile["norm_slug"]:
        score += 96.0
        reasons.append("slug_containment")

    if file_profile["model_key"] in product_profile["model_keys"]:
        score += 88.0
        reasons.append("model_key_exact")

    if file_profile["model_signature"] in product_profile["model_signatures"]:
        score += 92.0
        reasons.append("model_signature_exact")

    required_tokens = product_profile["required_model_tokens"]
    file_tokens = file_profile["tokens"]
    shared_required = required_tokens & file_tokens
    if required_tokens:
        coverage = len(shared_required) / max(len(required_tokens), 1)
        if coverage < 0.6 and not reasons and not prefer_existing:
            return None
        score += coverage * 36.0
        if coverage >= 0.99:
            reasons.append("required_tokens_full")

    shared_tokens = (product_profile["tokens"] & file_tokens) - GENERIC_MATCH_TOKENS
    score += min(len(shared_tokens), 12) * 2.5

    if product_profile["storage_values"] & file_profile["capacity_values"]:
        score += 8.0
        reasons.append("storage_match")

    if product_profile["ram_values"] & file_profile["capacity_values"]:
        score += 6.0
        reasons.append("ram_match")

    if product_profile["cpu_tokens"] & file_profile["cpu_tokens"]:
        score += 6.0
        reasons.append("cpu_match")

    if score < (64.0 if strong_model_match else 72.0):
        return None

    return score, reasons[0] if reasons else "token_overlap"


def fetch_products() -> list[dict]:
    client = get_supabase()
    base_fields = "id, slug, title, images, category, brand, cpu, ram_gb, storage_gb, storage_type, screen_in, condition, short_specs"
    try:
        return client.table("products").select(f"{base_fields}, image_overrides").execute().data or []
    except Exception as exc:
        if "image_overrides" not in str(exc):
            raise
        print("ℹ️  products.image_overrides not present; checking existing `images` only.")
        return client.table("products").select(base_fields).execute().data or []


def has_existing_images(product: dict) -> bool:
    for field in ("image_overrides", "images"):
        value = product.get(field)
        if isinstance(value, list):
            if any(isinstance(entry, str) and entry.strip() for entry in value):
                return True
        elif isinstance(value, str) and value.strip():
            return True
    return False


def list_bucket_files() -> list[str]:
    """Return every filename in the product-images bucket."""
    client = get_supabase()
    all_files = []
    offset = 0
    limit = 1000

    while True:
        res = client.storage.from_(BUCKET).list(
            path="",
            options={"limit": limit, "offset": offset}
        )
        if not res:
            break

        filenames = [f["name"] for f in res if f.get("name") and f.get("id") and not str(f["name"]).startswith(".")]
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

    while len(parts) > 1 and is_generic_model_token(parts[0]):
        parts.pop(0)

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
        prev_part = parts[index - 1] if index > 0 else ""

        if result and seen_model_marker:
            if part in stop_words:
                break
            if re.fullmatch(r"\d+(?:gb|tb)", part):
                break
            if part in {"5g", "4g", "3g"}:
                break
            if part.isdigit() and prev_part not in {"gen", "generation"}:
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

    while len(parts) > 1 and is_generic_model_token(parts[0]):
        parts.pop(0)

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
        prev_part = parts[index - 1] if index > 0 else ""

        if index != model_index and is_obvious_spec_token(part, next_part):
            break

        if index != model_index and is_generic_model_token(part):
            break

        if index != model_index and part.isdigit() and prev_part not in {"gen", "generation"}:
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
    product_context: dict | None = None,
    file_profiles: list[dict] | None = None,
) -> tuple[list[str], float, str]:
    if product_context is None:
        product_context = build_product_profile({"slug": slug, "title": title}, None)

    if file_profiles is None:
        file_profiles = [
            build_file_profile(
                filename,
                norm_filenames[index],
                file_model_keys[index],
                file_model_signatures[index],
            )
            for index, filename in enumerate(filenames)
        ]

    candidates: list[tuple[float, str, str]] = []
    filename_to_profile = {profile["filename"]: profile for profile in file_profiles}

    for existing_filename in product_context["existing_refs"]:
        profile = filename_to_profile.get(existing_filename)
        if not profile:
            continue
        scored = score_candidate(product_context, profile, prefer_existing=True)
        if scored is not None:
            score, strategy = scored
            candidates.append((score, strategy, existing_filename))

    for profile in file_profiles:
        scored = score_candidate(product_context, profile)
        if scored is None:
            continue
        score, strategy = scored
        candidates.append((score, strategy, profile["filename"]))

    if not candidates:
        return [], 0.0, "no_match"

    candidates.sort(key=lambda item: (-item[0], item[2]))
    top_score = candidates[0][0]
    top_strategy = candidates[0][1]
    top_profile = filename_to_profile.get(candidates[0][2])
    selected: list[str] = []
    for score, _, filename in candidates:
        profile = filename_to_profile.get(filename)
        if profile is None:
            continue

        same_family_as_top = False
        if top_profile is not None:
            same_family_as_top = bool(
                (top_profile["model_signature"] and profile["model_signature"] == top_profile["model_signature"])
                or (top_profile["model_key"] and profile["model_key"] == top_profile["model_key"])
            )

        if score >= top_score - 6.0 or (same_family_as_top and score >= top_score - 16.0):
            selected.append(filename)

    # If the best candidates split into multiple model signatures, treat it as unsafe.
    selected_profiles = [filename_to_profile[name] for name in selected if name in filename_to_profile]
    selected_signatures = {profile["model_signature"] or profile["model_key"] for profile in selected_profiles}
    if len(selected_signatures) > 1 and top_score < 140.0:
        return [], 0.0, "no_match"

    confidence = min(0.98, top_score / 160.0)
    return sorted(set(selected)), confidence, top_strategy


# ── Main ────────────────────────────────────────────────────────
def link_images():
    if DRY_RUN:
        print("🔍  DRY RUN – no database writes will be made.\n")
    if CATEGORY_FILTER:
        print(f"🎯  Category filter: {sorted(CATEGORY_FILTER)}\n")
    print(f"🎚️  Minimum confidence: {MIN_CONFIDENCE:.2f}")
    if ALLOW_LOW_CONFIDENCE:
        print("⚠️  Low confidence updates enabled via --allow-low-confidence")
    if ALLOW_LOOSE_MATCH:
        print("⚠️  Loose containment/prefix matching enabled via --allow-loose-match")
    if ONLY_MISSING_IMAGES:
        print("🧼  Only products without existing images/image_overrides will be updated")
    overrides = load_overrides(OVERRIDES_FILE)
    products_csv = load_products_csv(PRODUCTS_CSV)
    if overrides:
        print(f"🛠️  Loaded {len(overrides)} manual overrides from {OVERRIDES_FILE}")
    else:
        print(f"🛠️  No manual overrides loaded ({OVERRIDES_FILE})")
    if products_csv:
        print(f"🧾  Loaded {len(products_csv)} product rows from {PRODUCTS_CSV}")
    else:
        print(f"🧾  No product CSV loaded ({PRODUCTS_CSV})")
    print("")

    # 0. Check buckets
    print("🪣  Checking available buckets...")
    try:
        buckets = get_supabase().storage.list_buckets()
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
    file_profiles = [
        build_file_profile(filename, norm_filenames[index], file_model_keys[index], file_model_signatures[index])
        for index, filename in enumerate(filenames)
    ]

    # 2. Fetch all products
    print("📦  Fetching products…")
    products = fetch_products()

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
    skipped_existing_images = 0
    no_match = []
    low_confidence = []
    overridden = 0

    for p in products:
        slug  = p["slug"]
        title = p.get("title", "")
        pid   = p["id"]

        if ONLY_MISSING_IMAGES and has_existing_images(p):
            skipped_existing_images += 1
            continue

        override_files = overrides.get(slug) or overrides.get(str(slug).strip().lower())
        csv_row = products_csv.get(str(slug).strip().lower())
        product_profile = build_product_profile(p, csv_row)
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
                product_context=product_profile,
                file_profiles=file_profiles,
            )

        if not matched:
            no_match.append(slug)
            skipped += 1
            continue

        if confidence < MIN_CONFIDENCE and not ALLOW_LOW_CONFIDENCE:
            low_confidence.append((slug, confidence, strategy, matched))
            skipped += 1
            continue

        print(f"  ✅  {slug[:80]}  ({strategy}, confidence={confidence:.2f})")
        for fn in matched:
            print(f"       ↳ {fn}")

        if not DRY_RUN:
            update_payload = {"images": matched}
            if strategy == "manual_override":
                update_payload["image_overrides"] = matched
            supabase.table("products").update(update_payload).eq("id", pid).execute()

        updated += 1

    # 4. Summary
    print("\n" + "─" * 50)
    print(f"✅  Matched & {'would update' if DRY_RUN else 'updated'}: {updated}")
    print(f"🛠️   Updated via manual overrides:   {overridden}")
    if ONLY_MISSING_IMAGES:
        print(f"🖼️   Skipped (already had image data): {skipped_existing_images}")
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
