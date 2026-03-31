export type StoreCategorySlug = 'laptops' | 'smartphones' | 'printers' | 'desktops' | 'accessories';
export type CatalogCategorySlug = StoreCategorySlug | 'all';

export interface StoreCategoryMeta {
  slug: StoreCategorySlug;
  label: string;
  dbValue: string;
  intro: string;
  heroEyebrow: string;
  heroDescription: string;
  highlights: string[];
}

const SCREEN_MIN_INCHES = 3.5;
const SCREEN_MAX_INCHES = 20;
const LOW_STOCK_THRESHOLD = 3;

export const SHOP_PATH = '/shop';

export const STOREFRONT_CATEGORIES: StoreCategoryMeta[] = [
  {
    slug: 'laptops',
    label: 'Laptops',
    dbValue: 'Laptops',
    intro: 'Laptops for work, school, and everyday use, with clear specs and honest stock updates.',
    heroEyebrow: 'Portable performance',
    heroDescription:
      "Compare laptops by CPU, RAM, storage, warranty, and price. If you need help choosing, message us on WhatsApp.",
    highlights: ['CPU and RAM filters', 'Warranty shown when available', 'Reach out on WhatsApp if you need help']
  },
  {
    slug: 'desktops',
    label: 'Desktops',
    dbValue: 'Desktops',
    intro: 'Desktops for office setups, business counters, school labs, and dependable everyday work.',
    heroEyebrow: 'Desk-ready performance',
    heroDescription:
      "Compare desktops by brand, CPU, RAM, storage, and price, then message us on WhatsApp if you want help choosing.",
    highlights: ['CPU and RAM filters', 'Brand and price filters', 'Ask us about office setup needs']
  },
  {
    slug: 'smartphones',
    label: 'Smartphones',
    dbValue: 'Smartphones',
    intro: 'Smartphones with fair pricing, honest condition labels, and trusted Kenya delivery and pickup options.',
    heroEyebrow: 'Everyday mobility',
    heroDescription:
      "Compare smartphones by brand, storage, price, and stock. Reach out on WhatsApp if you need help.",
    highlights: ['Condition shown clearly', 'Savings shown clearly', 'Message us on WhatsApp and we’ll help you']
  },
  {
    slug: 'printers',
    label: 'Printers',
    dbValue: 'Printers',
    intro: 'Printers for school, office, and business use with clear prices and honest stock updates.',
    heroEyebrow: 'Reliable print output',
    heroDescription:
      "Check brand, price, and stock, then message us on WhatsApp if you want help choosing the right one.",
    highlights: ['Brand filter', 'Price sorting', 'Ask us about delivery']
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    dbValue: 'Accessories',
    intro: 'Accessories and storage add-ons with clear pricing and straightforward stock updates.',
    heroEyebrow: 'Useful add-ons',
    heroDescription:
      "Browse accessories by brand and price, then message us on WhatsApp if you need help checking compatibility.",
    highlights: ['Good for storage and peripherals', 'Brand and price filters', 'Ask us about compatibility']
  }
];

const CATEGORY_BY_SLUG = new Map(STOREFRONT_CATEGORIES.map((category) => [category.slug, category]));
const CATEGORY_BY_VALUE = new Map(
  STOREFRONT_CATEGORIES.flatMap((category) => [
    [category.slug, category],
    [category.dbValue.toLowerCase(), category]
  ])
);
const CATEGORY_VALUE_ALIASES = new Map<string, StoreCategorySlug>([
  ['storage', 'accessories']
]);

export function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toTitleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function formatCurrencyKes(value: unknown) {
  const amount = Number(value);
  return `KSh ${Math.max(0, Number.isFinite(amount) ? Math.round(amount) : 0).toLocaleString('en-KE')}`;
}

export function parsePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatNumberLabel(value: unknown) {
  const parsed = parsePositiveNumber(value);
  if (!parsed) {
    return '';
  }

  return Number.isInteger(parsed) ? String(Math.round(parsed)) : parsed.toFixed(1).replace(/\.0$/, '');
}

export function formatStorageSize(value: unknown) {
  const parsed = parsePositiveNumber(value);
  if (!parsed) {
    return '';
  }

  if (parsed >= 1024 && parsed % 1024 === 0) {
    return `${parsed / 1024}TB`;
  }

  return `${formatNumberLabel(parsed)}GB`;
}

export function getSafeScreenSize(value: unknown) {
  const parsed = parsePositiveNumber(value);
  if (!parsed) {
    return null;
  }

  return parsed >= SCREEN_MIN_INCHES && parsed <= SCREEN_MAX_INCHES ? parsed : null;
}

export function formatScreenSize(value: unknown) {
  const safe = getSafeScreenSize(value);
  return safe ? `${formatNumberLabel(safe)}"` : '';
}

export function getStoreCategoryBySlug(value: unknown) {
  const slug = normalizeText(value).toLowerCase() as StoreCategorySlug;
  return CATEGORY_BY_SLUG.get(slug) || null;
}

export function getStoreCategoryByValue(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  return CATEGORY_BY_VALUE.get(normalized) || CATEGORY_BY_SLUG.get(CATEGORY_VALUE_ALIASES.get(normalized) as StoreCategorySlug) || null;
}

export function getStoreCategoryQueryValues(value: unknown) {
  const category = typeof value === 'object' && value !== null && 'slug' in value
    ? (value as StoreCategoryMeta)
    : getStoreCategoryBySlug(value) || getStoreCategoryByValue(value);

  if (!category) {
    return [];
  }

  return Array.from(
    new Set(
      [
        category.dbValue,
        category.dbValue.toLowerCase(),
        category.slug,
        ...(category.slug === 'accessories' ? ['storage'] : [])
      ]
        .map((entry) => normalizeText(entry))
        .filter(Boolean)
    )
  );
}

export function matchesStoreCategoryValue(value: unknown, category: unknown) {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) {
    return false;
  }

  return getStoreCategoryQueryValues(category)
    .map((entry) => entry.toLowerCase())
    .includes(normalizedValue);
}

export function getCategorySlug(value: unknown) {
  return getStoreCategoryBySlug(value)?.slug || getStoreCategoryByValue(value)?.slug || null;
}

export function getCategoryLabel(value: unknown) {
  return getStoreCategoryByValue(value)?.label || getStoreCategoryBySlug(value)?.label || toTitleCase(normalizeText(value) || 'Product');
}

export function getCategoryPath(value: unknown) {
  const slug = getCategorySlug(value);
  return slug ? `/category/${slug}` : SHOP_PATH;
}

export function formatKES(value: number | string | null | undefined) {
  return formatCurrencyKes(value);
}

export function normalizeCategory(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function normalizeCondition(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function getProductBrand(product: Record<string, any>) {
  return normalizeText(product?.brand);
}

export function getAvailabilityLabel(product: Record<string, any>) {
  if (!product?.in_stock) {
    return 'Out of stock';
  }

  const stockQty = Number(product?.stock_qty || 0);
  return stockQty > 0 && stockQty <= LOW_STOCK_THRESHOLD ? 'Limited stock' : 'In stock';
}

export function getProductBadge(product: Record<string, any>, context: 'arrival' | 'seller' | 'default' = 'default', index = 0) {
  void context;
  void index;

  if (Number(product?.compare_at_kes || 0) > Number(product?.price_kes || 0)) {
    return 'SALE';
  }

  return null;
}

export function getProductBadgeTone(badge: string | null) {
  return badge === 'SALE' ? 'sale' : '';
}

export function getInitials(name: string) {
  const initials = String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'SE';
}

export function getConditionMeta(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'brand_new') {
    return { label: 'Brand New', tone: 'new' as const };
  }

  if (normalized === 'refurbished') {
    return { label: 'Refurbished', tone: 'refurbished' as const };
  }

  return { label: 'Verified condition', tone: 'verified' as const };
}

export function isLaptopProduct(value: unknown) {
  return normalizeText(value).toLowerCase() === 'laptops';
}

export function getConditionMetaForProduct(value: unknown, category: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  if (isLaptopProduct(category) && !new Set(['brand_new', 'refurbished']).has(normalized)) {
    return { label: '', tone: 'verified' as const };
  }

  return getConditionMeta(value);
}

export function getRefurbGradeMeta(value: unknown, options: { category?: unknown; condition?: unknown } = {}) {
  const normalized = normalizeText(value).toLowerCase();
  const normalizedCondition = normalizeText(options.condition).toLowerCase();
  if (isLaptopProduct(options.category)) {
    if (normalizedCondition !== 'refurbished' || normalized !== 'grade_a') {
      return null;
    }
  }

  const allowed = new Set(['grade_a', 'grade_b', 'grade_c']);
  if (!allowed.has(normalized)) {
    return null;
  }

  const gradeLetter = normalized.split('_')[1]?.toUpperCase();
  if (!gradeLetter) {
    return null;
  }

  return {
    label: `Grade ${gradeLetter}`,
    tone: gradeLetter.toLowerCase()
  };
}

export function getWarrantyMonths(value: unknown) {
  const parsed = parsePositiveNumber(value);
  return parsed ? Math.round(parsed) : null;
}

export function getWarrantyLabel(value: unknown, style: 'short' | 'long' = 'short') {
  const months = getWarrantyMonths(value);
  if (!months) {
    return null;
  }

  return style === 'long' ? `${months}-month warranty` : `${months} mo warranty`;
}

export function getDiscountMeta(priceValue: unknown, compareAtValue: unknown) {
  const price = Math.max(0, Number(priceValue || 0));
  const compareAt = Math.max(0, Number(compareAtValue || 0));
  const hasDiscount = compareAt > price;
  const savings = hasDiscount ? compareAt - price : 0;
  const percent = hasDiscount && compareAt > 0 ? Math.round((savings / compareAt) * 100) : 0;

  return {
    price,
    compareAt,
    hasDiscount,
    savings,
    percent,
    priceText: formatCurrencyKes(price),
    compareAtText: hasDiscount ? formatCurrencyKes(compareAt) : null,
    savingsText: hasDiscount ? formatCurrencyKes(savings) : null
  };
}

export function getStockMeta(product: Record<string, any>) {
  const isInStock = product?.in_stock === true;
  const stockQty = parsePositiveNumber(product?.stock_qty);
  const isLowStock = Boolean(isInStock && stockQty && stockQty <= LOW_STOCK_THRESHOLD);

  if (!isInStock) {
    return {
      isInStock,
      stockQty,
      isLowStock: false,
      badge: 'Out of Stock',
      detail: 'Ask on WhatsApp for similar options',
      tone: 'out' as const
    };
  }

  if (isLowStock) {
    return {
      isInStock,
      stockQty,
      isLowStock: true,
      badge: 'Low Stock',
      detail: `Only ${Math.round(stockQty as number)} left`,
      tone: 'low' as const
    };
  }

  return {
    isInStock,
    stockQty,
    isLowStock: false,
    badge: 'In Stock',
    detail: stockQty ? `${Math.round(stockQty)} ready to order` : 'Ready to order',
    tone: 'in' as const
  };
}

function parsePossibleImageArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter((item): item is string => item.length > 0);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    if (!normalized.startsWith('[')) {
      return [normalized];
    }

    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed)
        ? parsed
          .map((item) => normalizeText(item))
          .filter((item): item is string => item.length > 0)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getImageCandidates(product: Record<string, any>) {
  const overrides = parsePossibleImageArray(product?.image_overrides);
  const images = parsePossibleImageArray(product?.images);
  return overrides.length > 0 ? overrides : images;
}

export function resolveProductImageUrl(image: unknown, publicSupabaseUrl: string, fallbackImage: string) {
  const normalizedFallback = normalizeText(fallbackImage) || '/product-placeholder.svg';
  const normalizedUrl = normalizeText(publicSupabaseUrl).replace(/\/$/, '');
  const imagePath = normalizeText(image);

  if (!imagePath) {
    return normalizedFallback;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  if (imagePath.startsWith('/product-images/')) {
    return normalizedUrl ? `${normalizedUrl}/storage/v1/object/public${imagePath}` : imagePath;
  }

  if (imagePath.startsWith('/storage/v1/object/public/product-images/')) {
    return normalizedUrl ? `${normalizedUrl}${imagePath}` : imagePath;
  }

  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  if (!normalizedUrl) {
    return `/product-images/${imagePath.replace(/^product-images\//, '')}`;
  }

  return `${normalizedUrl}/storage/v1/object/public/product-images/${imagePath.replace(/^\/?(product-images\/)?/, '')}`;
}

export function getProductImageUrls(product: Record<string, any>, publicSupabaseUrl: string, fallbackImage: string) {
  const candidates = getImageCandidates(product);
  if (candidates.length === 0) {
    return [resolveProductImageUrl('', publicSupabaseUrl, fallbackImage)];
  }

  return candidates.map((image) => resolveProductImageUrl(image, publicSupabaseUrl, fallbackImage));
}

export function hasExplicitChargerIncluded(product: Record<string, any>) {
  const source = `${normalizeText(product?.short_specs)} ${normalizeText(product?.description)}`.toLowerCase();
  if (!source) {
    return false;
  }

  const negativePatterns = [
    /charger\s+not\s+included/,
    /no\s+charger/,
    /without\s+charger/,
    /charger\s+sold\s+separately/
  ];
  if (negativePatterns.some((pattern) => pattern.test(source))) {
    return false;
  }

  const positivePatterns = [
    /charger\s+included/,
    /comes?\s+with\s+(an?\s+)?charger/,
    /includes?\s+(an?\s+)?charger/,
    /with\s+(an?\s+)?charger/,
    /original\s+charger/
  ];

  return positivePatterns.some((pattern) => pattern.test(source));
}

export function getSummarySpecItems(product: Record<string, any>) {
  const cpu = normalizeText(product?.cpu);
  const ram = formatNumberLabel(product?.ram_gb);
  const storage = formatStorageSize(product?.storage_gb);
  const storageType = normalizeText(product?.storage_type).toUpperCase();
  const screen = formatScreenSize(product?.screen_in);

  const items: Array<{ label: string; value: string }> = [];
  if (cpu) {
    items.push({ label: 'CPU', value: cpu });
  }
  if (ram) {
    items.push({ label: 'RAM', value: `${ram}GB` });
  }
  if (storage || storageType) {
    items.push({
      label: 'Storage',
      value: `${storage}${storage && storageType ? ' ' : ''}${storageType}`.trim()
    });
  }
  if (screen) {
    items.push({ label: 'Display', value: screen });
  }

  return items;
}

export function getSpecTableRows(product: Record<string, any>) {
  const condition = getConditionMetaForProduct(product?.condition, product?.category);
  const grade = getRefurbGradeMeta(product?.refurb_grade, {
    category: product?.category,
    condition: product?.condition
  });
  const rows: Array<{ label: string; value: string }> = [];

  const cpu = normalizeText(product?.cpu);
  const ram = formatNumberLabel(product?.ram_gb);
  const storage = formatStorageSize(product?.storage_gb);
  const storageType = normalizeText(product?.storage_type).toUpperCase();
  const screen = formatScreenSize(product?.screen_in);

  if (cpu) {
    rows.push({ label: 'CPU', value: cpu });
  }
  if (ram) {
    rows.push({ label: 'RAM', value: `${ram}GB` });
  }
  if (storage || storageType) {
    rows.push({
      label: 'Storage',
      value: `${storage}${storage && storageType ? ' ' : ''}${storageType}`.trim()
    });
  }
  if (screen) {
    rows.push({ label: 'Screen size', value: screen });
  }
  if (condition.label) {
    rows.push({ label: 'Condition', value: condition.label });
  }
  if (grade?.label) {
    rows.push({ label: 'Refurb grade', value: grade.label });
  }

  return rows;
}

export function stripMarketingWordsFromTitle(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) {
    return 'Product';
  }

  return raw
    .replace(/\b(refurbished|brand[\s-]?new)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || raw;
}

export function getProductPresentation(
  product: Record<string, any>,
  options: { publicSupabaseUrl?: string; fallbackImage?: string } = {}
) {
  const publicSupabaseUrl = normalizeText(options.publicSupabaseUrl);
  const fallbackImage = normalizeText(options.fallbackImage) || '/product-placeholder.svg';
  const category = getStoreCategoryByValue(product?.category);
  const condition = getConditionMetaForProduct(product?.condition, product?.category);
  const grade = getRefurbGradeMeta(product?.refurb_grade, {
    category: product?.category,
    condition: product?.condition
  });
  const warranty = getWarrantyLabel(product?.warranty_months);
  const stock = getStockMeta(product);
  const pricing = getDiscountMeta(product?.price_kes, product?.compare_at_kes);
  const summarySpecs = getSummarySpecItems(product);
  const specRows = getSpecTableRows(product);
  const imageUrls = getProductImageUrls(product, publicSupabaseUrl, fallbackImage);
  const displayTitle = stripMarketingWordsFromTitle(product?.title);
  const rawTitle = normalizeText(product?.title) || displayTitle;
  const brand = normalizeText(product?.brand);
  const categoryLabel = category?.label || getCategoryLabel(product?.category);
  const eyeBrow = brand ? `${brand} / ${categoryLabel}` : categoryLabel;

  return {
    rawTitle,
    displayTitle,
    category,
    categoryLabel,
    categoryPath: category ? `/category/${category.slug}` : SHOP_PATH,
    eyebrow: eyeBrow,
    productPath: `/product/${product?.slug}`,
    condition,
    grade,
    warranty,
    stock,
    pricing,
    summarySpecs,
    specRows,
    chargerIncluded: hasExplicitChargerIncluded(product),
    imageUrls,
    primaryImageUrl: imageUrls[0] || fallbackImage
  };
}
