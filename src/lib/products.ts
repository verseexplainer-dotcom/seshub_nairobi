import rawCatalog from '../data/products_final.json';
import type { CatalogProduct } from '../types/catalog';
import {
  getStoreCategoryByValue,
  getStoreCategoryQueryValues,
  matchesStoreCategoryValue,
  normalizeText,
  parsePositiveNumber
} from './productPresentation';
import { filterVisibleCatalogProducts, normalizeCatalogProducts, type CatalogSearchFilters } from './catalog';

type RawJsonProduct = Record<string, unknown>;

type RawCatalogFile = {
  generated_at?: string;
  products?: RawJsonProduct[];
};

const catalogFile = rawCatalog as RawCatalogFile | RawJsonProduct[];
const rawProducts = Array.isArray(catalogFile)
  ? catalogFile
  : Array.isArray(catalogFile.products)
    ? catalogFile.products
    : [];
const generatedAt = !Array.isArray(catalogFile) && normalizeText(catalogFile.generated_at)
  ? normalizeText(catalogFile.generated_at)
  : new Date().toISOString();

function normalizeCategory(value: unknown) {
  const source = Array.isArray(value) ? value[0] : value;
  const normalized = normalizeText(source).toLowerCase().replace(/[\s_-]+/g, ' ');
  const category = getStoreCategoryByValue(source);

  if (category) {
    return category.label;
  }

  if (normalized === 'laptop' || normalized === 'laptops' || normalized === 'notebook' || normalized === 'notebooks') return 'Laptops';
  if (normalized === 'gaming laptop' || normalized === 'gaming laptops') return 'Gaming Laptops';
  if (normalized === 'smartphone' || normalized === 'smartphones' || normalized === 'phone' || normalized === 'phones') return 'Smartphones';
  if (normalized === 'printer' || normalized === 'printers') return 'Printers';
  if (normalized === 'desktop' || normalized === 'desktops' || normalized === 'pc' || normalized === 'pcs') return 'Desktops';
  if (normalized === 'monitor' || normalized === 'monitors') return 'Monitors';
  if (normalized === 'projector' || normalized === 'projectors') return 'Projectors';
  if (normalized === 'tablet' || normalized === 'tablets') return 'Tablets';
  if (normalized === 'software' || normalized === 'software box') return 'Software';
  if (normalized === 'ups') return 'UPS';
  if (normalized === 'network' || normalized === 'networking') return 'Networking';
  if (normalized === 'storage') return 'Accessories';
  return normalizeText(source) || 'Accessories';
}

function normalizeCondition(value: unknown) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'brand_new' || normalized === 'new') return 'brand_new';
  if (normalized === 'refurbished' || normalized === 'ex_uk' || normalized === 'used') return 'refurbished';
  return normalized || null;
}

function parseGbValue(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
  if (!match) return parsePositiveNumber(text);
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2]?.toLowerCase() === 'tb' ? amount * 1024 : amount;
}

function parseScreenInches(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parsePositiveNumber(match[1]) : null;
}

function getStorageType(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (text.includes('ssd')) return 'SSD';
  if (text.includes('hdd')) return 'HDD';
  if (text.includes('emmc')) return 'eMMC';
  return null;
}

function getArrayValues(value: unknown) {
  if (Array.isArray(value)) return value;
  const text = normalizeText(value);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [text];
  } catch {
    return text.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
}

function normalizeImagePath(value: unknown) {
  const image = normalizeText(value);
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/product-images/')) return image;
  if (image.startsWith('product-images/')) return `/${image}`;
  if (image.startsWith('/products/')) return image;
  if (image.startsWith('products/')) return `/${image}`;
  if (image.startsWith('/')) return image;
  return `/product-images/${image}`;
}

function getImageCandidates(row: RawJsonProduct) {
  const candidates = [
    ...(Array.isArray(row.images) ? row.images.map(normalizeImagePath) : []),
    ...getArrayValues(row.Images).map(normalizeImagePath),
    normalizeImagePath(row.image_file),
    ...(Array.isArray(row.image_alternates) ? row.image_alternates.map(normalizeImagePath) : [])
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function rawToCatalogRow(row: RawJsonProduct, index: number): Record<string, unknown> {
  const slug = normalizeText(row.slug || row['URL Slug']);
  const title = normalizeText(row.title || row['Product Name']) || normalizeText(row.Model) || slug;
  const price = parsePositiveNumber(row.price_kes ?? row['Price (KES)'] ?? row.price) ?? 0;
  const regularPrice = parsePositiveNumber(row.compare_at_kes ?? row['Regular Price (KES)'] ?? row.compare_at_price);
  const condition = normalizeCondition(row.condition ?? row.Condition);
  const ramGb = parseGbValue(row.ram_gb ?? row.RAM);
  const storageGb = parseGbValue(row.storage_gb ?? row.Storage);
  const storageType = getStorageType(row.storage_type ?? row.Storage);
  const categories = getArrayValues(row.categories ?? row.category ?? row.Category)
    .map((entry) => normalizeCategory(entry))
    .filter(Boolean);
  const category = normalizeCategory(categories[0] ?? row.category ?? row.Category);
  const shortSpecs = [
    normalizeText(row.cpu ?? row.Processor),
    ramGb ? `${Math.round(ramGb)}GB RAM` : '',
    storageGb ? `${storageGb >= 1024 && storageGb % 1024 === 0 ? `${storageGb / 1024}TB` : `${Math.round(storageGb)}GB`} ${storageType || ''}`.trim() : '',
    normalizeText(row.screen_in ?? row['Display Size'])
  ].filter(Boolean).join(', ');

  return {
    id: slug,
    slug,
    title,
    category,
    categories: categories.length > 0 ? categories : null,
    brand: normalizeText(row.brand ?? row.Brand) || null,
    price_kes: price,
    compare_at_kes: regularPrice !== null && regularPrice > price ? regularPrice : null,
    in_stock: price > 0,
    stock_qty: price > 0 ? 1 : 0,
    condition,
    refurb_grade: condition === 'refurbished' ? 'grade_a' : null,
    short_specs: shortSpecs || normalizeText(row.short_specs ?? row['Short Description']) || null,
    short_description: normalizeText(row.short_description ?? row['Short Description']) || null,
    description: normalizeText(row.description ?? row['Long Description']) || null,
    warranty_months: parsePositiveNumber(row.warranty_months) || null,
    images: getImageCandidates(row),
    image_overrides: Array.isArray(row.image_overrides) ? row.image_overrides : null,
    featured_home: index < 24,
    featured_rank: index + 1,
    sku: normalizeText(row.sku) || slug,
    status: normalizeText(row.status) || (price > 0 ? 'active' : 'draft'),
    cpu: normalizeText(row.cpu ?? row.Processor) || null,
    ram_gb: ramGb,
    storage_gb: storageGb,
    storage_type: storageType,
    screen_in: parseScreenInches(row.screen_in ?? row['Display Size']),
    collections: getArrayValues(row.collections).map((entry) => normalizeText(entry)).filter(Boolean),
    tags: getArrayValues(row.tags ?? row.Tags).map((entry) => normalizeText(entry)).filter(Boolean),
    seo_title: normalizeText(row.seo_title ?? row['Meta Title']) || null,
    meta_description: normalizeText(row.meta_description ?? row['Meta Description']) || null,
    created_at: normalizeText(row.created_at) || generatedAt,
    updated_at: normalizeText(row.updated_at) || generatedAt
  };
}

const products = filterVisibleCatalogProducts(
  normalizeCatalogProducts(rawProducts.map(rawToCatalogRow))
);

function matchesQuery(product: CatalogProduct, query: string) {
  const terms = normalizeText(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [
    product.title,
    product.slug,
    product.brand,
    product.category,
    product.short_specs,
    product.short_description,
    product.description,
    ...(product.tags || [])
  ].map((value) => normalizeText(value).toLowerCase()).join(' ');

  return terms.every((term) => haystack.includes(term));
}

function matchesCondition(product: CatalogProduct, condition: unknown) {
  const normalized = normalizeText(condition).toLowerCase();
  return !normalized || product.condition === normalized;
}

function matchesPrice(product: CatalogProduct, minPrice?: number | null, maxPrice?: number | null) {
  const price = Number(product.price_kes || 0);
  return (minPrice == null || price >= minPrice) && (maxPrice == null || price <= maxPrice);
}

export function getAllProducts() {
  return [...products];
}

export function getProductBySlug(slug: unknown) {
  const normalizedSlug = normalizeText(slug);
  return products.find((product) => product.slug === normalizedSlug) || null;
}

export function getRelatedProducts(product: CatalogProduct, limit = 4) {
  const relatedIds = new Set([product.id, product.slug]);
  const sameBrand = products.filter(
    (item) =>
      item.slug !== product.slug &&
      normalizeText(item.brand) &&
      normalizeText(item.brand) === normalizeText(product.brand) &&
      matchesStoreCategoryValue(item, product.category)
  );
  const sameCategory = products.filter(
    (item) => item.slug !== product.slug && matchesStoreCategoryValue(item, product.category)
  );
  const featured = products.filter((item) => item.slug !== product.slug && item.featured_home);
  const results: CatalogProduct[] = [];

  for (const item of [...sameBrand, ...sameCategory, ...featured]) {
    const key = item.id || item.slug;
    if (!key || relatedIds.has(key)) continue;
    results.push(item);
    relatedIds.add(key);
    if (results.length >= limit) break;
  }

  return results;
}

export function filterProducts(filters: CatalogSearchFilters = {}) {
  const categoryValues = getStoreCategoryQueryValues(filters.category).map((entry) => entry.toLowerCase());
  return products.filter((product) => {
    const categoryMatches =
      categoryValues.length === 0 ||
      categoryValues.includes(normalizeText(product.categories?.[0] || product.category).toLowerCase());

    return (
      categoryMatches &&
      matchesQuery(product, filters.query || '') &&
      matchesCondition(product, filters.condition) &&
      matchesPrice(product, filters.minPrice, filters.maxPrice)
    );
  });
}

export function searchProducts(filters: CatalogSearchFilters = {}) {
  return filterProducts(filters).sort((left, right) => {
    if (left.featured_home && !right.featured_home) return -1;
    if (!left.featured_home && right.featured_home) return 1;
    return (left.price_kes || 0) - (right.price_kes || 0);
  });
}

export const getAllLocalCatalogProducts = getAllProducts;
export const getLocalProductBySlug = getProductBySlug;
export const getLocalRelatedProducts = getRelatedProducts;
export const filterLocalCatalogProducts = filterProducts;
export const searchLocalCatalogProducts = searchProducts;
