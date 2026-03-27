import { normalizeText } from './productPresentation';
import { getSiteAssets } from './siteAssets';
import type { CatalogProduct } from '../types/catalog';

function parseImageInput(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith('[')) {
    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }

  return [normalized];
}

export function getFallbackProductImage(publicSupabaseUrl?: string | undefined) {
  return getSiteAssets(publicSupabaseUrl).productPlaceholder.src;
}

export function resolveProductImage(image: unknown, publicSupabaseUrl?: string | undefined, fallbackImage?: string | undefined) {
  const fallback = normalizeText(fallbackImage) || getFallbackProductImage(publicSupabaseUrl);
  const source = normalizeText(image);
  const normalizedSupabaseUrl = normalizeText(publicSupabaseUrl).replace(/\/$/, '');

  if (!source) {
    return fallback;
  }

  if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('/product-images/')) {
    return source;
  }

  if (source.startsWith('/')) {
    return source;
  }

  if (!normalizedSupabaseUrl) {
    return `/product-images/${source.replace(/^product-images\//, '')}`;
  }

  return `${normalizedSupabaseUrl}/storage/v1/object/public/product-images/${source.replace(/^\/?(product-images\/)?/, '')}`;
}

export function getProductGallery(
  product: Pick<CatalogProduct, 'images' | 'image_overrides'>,
  options: { publicSupabaseUrl?: string | undefined; fallbackImage?: string | undefined } = {}
) {
  const overrides = parseImageInput(product.image_overrides);
  const images = parseImageInput(product.images);
  const candidates = overrides.length > 0 ? overrides : images;

  if (candidates.length === 0) {
    return [resolveProductImage('', options.publicSupabaseUrl, options.fallbackImage)];
  }

  return candidates.map((image) => resolveProductImage(image, options.publicSupabaseUrl, options.fallbackImage));
}

export function getPrimaryImage(
  product: Pick<CatalogProduct, 'images' | 'image_overrides'>,
  options: { publicSupabaseUrl?: string | undefined; fallbackImage?: string | undefined } = {}
) {
  return getProductGallery(product, options)[0] || getFallbackProductImage(options.publicSupabaseUrl);
}
