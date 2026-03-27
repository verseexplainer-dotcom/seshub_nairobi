import type { CatalogProduct, HomepageBrandCount, HomepageCategoryCount } from '../types/catalog';
import { buildBrandFilterHref } from './filters';
import { getProductGallery } from './images';
import { getCompareAtPrice } from './pricing';
import { getCategorySlug, normalizeText, parsePositiveNumber } from './productPresentation';

const LOW_STOCK_THRESHOLD = 3;
const HOMEPAGE_PRODUCT_COLUMNS = [
  'id',
  'slug',
  'title',
  'category',
  'brand',
  'price_kes',
  'compare_at_kes',
  'in_stock',
  'stock_qty',
  'condition',
  'refurb_grade',
  'short_specs',
  'description',
  'warranty_months',
  'images',
  'image_overrides',
  'featured_home',
  'featured_rank',
  'sku',
  'status',
  'cpu',
  'ram_gb',
  'storage_gb',
  'storage_type',
  'screen_in',
  'collections',
  'tags',
  'seo_title',
  'meta_description',
  'created_at',
  'updated_at'
].join(',');

const HOME_CATEGORY_META: Array<Omit<HomepageCategoryCount, 'count'>> = [
  {
    key: 'laptops',
    label: 'Laptops',
    description: 'Work, school, and everyday productivity picks.',
    href: '/category/laptops',
    accent: '#155dfc'
  },
  {
    key: 'smartphones',
    label: 'Smartphones',
    description: 'Daily-use phones with clear condition and stock updates.',
    href: '/category/smartphones',
    accent: '#0f766e'
  },
  {
    key: 'printers',
    label: 'Printers',
    description: 'Home and office printers for fast setup.',
    href: '/category/printers',
    accent: '#ea580c'
  },
  {
    key: 'desktops',
    label: 'Desktops',
    description: 'Desk-ready machines for business and office work.',
    href: '/category/desktops',
    accent: '#4f46e5'
  },
  {
    key: 'accessories',
    label: 'Accessories',
    description: 'Useful add-ons, peripherals, and finishing touches.',
    href: '/category/accessories',
    accent: '#ca8a04'
  },
  {
    key: 'storage',
    label: 'Storage',
    description: 'SSDs, HDDs, flash storage, and portable backup options.',
    href: '/category/accessories',
    accent: '#0891b2'
  }
];

const PREFERRED_HOME_BRANDS = ['HP', 'Dell', 'Lenovo', 'Apple', 'Samsung', 'Epson'];

function toStringOrNull(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function toNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return null;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('[')) {
    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed) ? parsed.map((entry) => normalizeText(entry)).filter(Boolean) : null;
    } catch {
      return null;
    }
  }

  return normalized
    .split(',')
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

export function normalizeCatalogProduct(row: Record<string, unknown>): CatalogProduct {
  const warrantyMonths = toNumberOrNull(row.warranty_months);
  const compareAt = toNumberOrNull(row.compare_at_kes ?? row.compare_at_price);
  const inStock = toBoolean(row.in_stock);
  const stockQty = toNumberOrNull(row.stock_qty);
  const stockStatus = !inStock ? 'out_of_stock' : stockQty !== null && stockQty > 0 && stockQty <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock';

  return {
    id: toStringOrNull(row.id) || undefined,
    slug: normalizeText(row.slug),
    title: normalizeText(row.title),
    category: normalizeText(row.category),
    brand: toStringOrNull(row.brand),
    price_kes: Math.max(0, toNumberOrNull(row.price_kes) ?? 0),
    compare_at_kes: compareAt,
    compare_at_price: compareAt,
    short_specs: toStringOrNull(row.short_specs),
    short_description: toStringOrNull(row.short_description),
    description: toStringOrNull(row.description),
    description_html: toStringOrNull(row.description_html),
    condition: toStringOrNull(row.condition),
    refurb_grade: toStringOrNull(row.refurb_grade),
    warranty_months: warrantyMonths,
    warranty: warrantyMonths ? `${Math.round(warrantyMonths)} month warranty` : toStringOrNull(row.warranty),
    stock_status: toStringOrNull(row.stock_status) || stockStatus,
    in_stock: inStock ?? false,
    stock_qty: stockQty,
    parsed_specs_json:
      typeof row.parsed_specs_json === 'object' && row.parsed_specs_json !== null
        ? (row.parsed_specs_json as Record<string, unknown>)
        : null,
    images: (row.images as CatalogProduct['images']) ?? null,
    image_overrides: (row.image_overrides as CatalogProduct['image_overrides']) ?? null,
    featured_home: toBoolean(row.featured_home),
    featured_rank: toNumberOrNull(row.featured_rank),
    sku: toStringOrNull(row.sku),
    status: toStringOrNull(row.status),
    cpu: toStringOrNull(row.cpu),
    ram_gb: toNumberOrNull(row.ram_gb),
    storage_gb: toNumberOrNull(row.storage_gb),
    storage_type: toStringOrNull(row.storage_type),
    screen_in: toNumberOrNull(row.screen_in),
    collections: toStringArray(row.collections),
    tags: toStringArray(row.tags),
    seo_title: toStringOrNull(row.seo_title),
    meta_description: toStringOrNull(row.meta_description),
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at)
  };
}

export function isProductInStock(product: CatalogProduct) {
  return product.in_stock === true;
}

export function isLowStockProduct(product: CatalogProduct) {
  const quantity = parsePositiveNumber(product.stock_qty);
  return isProductInStock(product) && quantity !== null && quantity <= LOW_STOCK_THRESHOLD;
}

export function getProductStockLabel(product: CatalogProduct) {
  if (!isProductInStock(product)) {
    return 'Out of Stock';
  }

  return isLowStockProduct(product) ? 'Low Stock' : 'In Stock';
}

export function getConditionLabel(product: CatalogProduct) {
  if (normalizeText(product.condition).toLowerCase() === 'brand_new') {
    return 'Brand New';
  }

  if (normalizeText(product.condition).toLowerCase() === 'refurbished') {
    return 'Refurbished';
  }

  return '';
}

export function hasCatalogImage(product: CatalogProduct) {
  const gallery = getProductGallery(product);
  const primaryImage = gallery[0];
  return typeof primaryImage === 'string' && !primaryImage.includes('product-placeholder');
}

export function getCatalogCategoryKey(product: CatalogProduct) {
  return getCategorySlug(product.category) || normalizeText(product.category).toLowerCase();
}

export function isStorageProduct(product: CatalogProduct) {
  if (getCatalogCategoryKey(product) !== 'accessories') {
    return false;
  }

  const source = [
    product.title,
    product.short_specs,
    product.description,
    product.storage_type,
    ...(product.collections || []),
    ...(product.tags || [])
  ]
    .map((entry) => normalizeText(entry).toLowerCase())
    .join(' ');

  return /(ssd|hdd|storage|external hard|hard drive|flash drive|usb drive|memory card|portable ssd|nvme|storejet)/.test(source);
}

export function getProductSpecChips(product: CatalogProduct, limit = 3) {
  const chips: string[] = [];
  const seen = new Set<string>();

  const pushChip = (value: string) => {
    const normalized = normalizeText(value);
    const key = normalized.toLowerCase();
    if (!normalized || normalized.length > 36 || seen.has(key)) {
      return;
    }

    seen.add(key);
    chips.push(normalized);
  };

  if (product.cpu) {
    pushChip(product.cpu);
  }

  if (product.ram_gb) {
    pushChip(`${Math.round(product.ram_gb)}GB RAM`);
  }

  if (product.storage_gb || product.storage_type) {
    const storageValue = product.storage_gb
      ? product.storage_gb >= 1024 && product.storage_gb % 1024 === 0
        ? `${product.storage_gb / 1024}TB`
        : `${Math.round(product.storage_gb)}GB`
      : '';
    pushChip(`${storageValue}${storageValue && product.storage_type ? ' ' : ''}${normalizeText(product.storage_type).toUpperCase()}`.trim());
  }

  if (product.screen_in) {
    pushChip(`${String(product.screen_in).replace(/\.0$/, '')}" Display`);
  }

  const shortSpecs = normalizeText(product.short_specs);
  if (shortSpecs) {
    shortSpecs
      .split(/\s*[|,;•]\s*/)
      .map((entry) => entry.replace(/\s+/g, ' ').trim())
      .forEach(pushChip);
  }

  return chips.slice(0, limit);
}

export async function getHomepageProducts() {
  const { isSupabaseConfigured, supabase } = await import('./supabase');

  if (!isSupabaseConfigured) {
    return [] as CatalogProduct[];
  }

  const { data, error } = await supabase
    .from('products')
    .select(HOMEPAGE_PRODUCT_COLUMNS)
    .order('in_stock', { ascending: false })
    .order('featured_home', { ascending: false })
    .order('featured_rank', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Homepage catalog query failed', {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message
    });
    return [] as CatalogProduct[];
  }

  const rows = (data || []) as unknown as Array<Record<string, unknown>>;

  return rows
    .map((row) => normalizeCatalogProduct(row))
    .filter((product) => product.slug && product.title && product.price_kes > 0);
}

export async function getCategoryCounts(products?: CatalogProduct[]) {
  const catalog = products ?? (await getHomepageProducts());

  return HOME_CATEGORY_META.map((category) => ({
    ...category,
    count:
      category.key === 'storage'
        ? catalog.filter(isStorageProduct).length
        : catalog.filter((product) => getCatalogCategoryKey(product) === category.key).length
  }));
}

export async function getBrandCounts(products?: CatalogProduct[]) {
  const catalog = products ?? (await getHomepageProducts());
  const counts = new Map<string, number>();

  for (const product of catalog) {
    const brand = normalizeText(product.brand);
    if (!brand) {
      continue;
    }

    counts.set(brand, (counts.get(brand) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      const countDelta = right[1] - left[1];
      if (countDelta !== 0) {
        return countDelta;
      }

      const leftPreference = PREFERRED_HOME_BRANDS.indexOf(left[0]);
      const rightPreference = PREFERRED_HOME_BRANDS.indexOf(right[0]);
      if (leftPreference !== rightPreference) {
        return (leftPreference === -1 ? Number.MAX_SAFE_INTEGER : leftPreference) -
          (rightPreference === -1 ? Number.MAX_SAFE_INTEGER : rightPreference);
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([brand, count]) => ({
      brand,
      count,
      href: buildBrandFilterHref(brand, { sort: 'featured', in_stock: 1 })
    })) as HomepageBrandCount[];
}

export async function getHomepageFeaturedProducts(products?: CatalogProduct[]) {
  const catalog = products ?? (await getHomepageProducts());
  const { selectFeaturedProducts } = await import('./homepage');
  return selectFeaturedProducts(catalog);
}

export async function getDealsProducts(products?: CatalogProduct[]) {
  const catalog = products ?? (await getHomepageProducts());
  const { selectDealsProducts } = await import('./homepage');
  return selectDealsProducts(catalog);
}

export function countMerchandisingBrands(products: CatalogProduct[]) {
  return new Set(
    products
      .map((product) => normalizeText(product.brand))
      .filter(Boolean)
  ).size;
}

export function countValidDeals(products: CatalogProduct[]) {
  return products.filter((product) => (getCompareAtPrice(product) ?? 0) > product.price_kes).length;
}
