import type { CatalogProduct } from '../types/catalog';
import { getSiteAssets } from './siteAssets';

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function encodeImagePath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function stripProductImagesPrefix(path: string) {
  return path.replace(/^\/?(?:storage\/v1\/object\/public\/)?product-images\//, '');
}

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

function getPrioritizedImageCandidates(product: Pick<CatalogProduct, 'images' | 'image_overrides'>) {
  const overrides = parseImageInput(product.image_overrides);
  const images = parseImageInput(product.images);
  const candidates = overrides.length > 0 ? overrides : images;
  return Array.from(new Set(candidates));
}

export function getFallbackProductImage(publicSupabaseUrl?: string | undefined) {
  return getSiteAssets(publicSupabaseUrl).productPlaceholder.src;
}

export function resolveProductImage(
  image: unknown,
  publicSupabaseUrl?: string | undefined,
  fallbackImage?: string | undefined
) {
  const fallback = normalizeText(fallbackImage) || getFallbackProductImage(publicSupabaseUrl);
  const source = normalizeText(image);
  const normalizedSupabaseUrl = normalizeText(publicSupabaseUrl).replace(/\/$/, '');

  if (!source) {
    return fallback;
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }

  if (
    source.startsWith('/product-images/') ||
    source.startsWith('product-images/') ||
    source.startsWith('/storage/v1/object/public/product-images/') ||
    source.startsWith('storage/v1/object/public/product-images/')
  ) {
    const normalizedImagePath = encodeImagePath(stripProductImagesPrefix(source));
    if (!normalizedImagePath) {
      return fallback;
    }

    if (normalizedSupabaseUrl) {
      return `${normalizedSupabaseUrl}/storage/v1/object/public/product-images/${normalizedImagePath}`;
    }

    return `/product-images/${normalizedImagePath}`;
  }

  if (source.startsWith('/')) {
    return source;
  }

  const normalizedImagePath = encodeImagePath(source);

  if (!normalizedSupabaseUrl) {
    return `/product-images/${normalizedImagePath}`;
  }

  return `${normalizedSupabaseUrl}/storage/v1/object/public/product-images/${normalizedImagePath}`;
}

export function getProductGallery(
  product: Pick<CatalogProduct, 'images' | 'image_overrides'>,
  options: { publicSupabaseUrl?: string | undefined; fallbackImage?: string | undefined } = {}
) {
  const candidates = getPrioritizedImageCandidates(product);
  const resolvedImages = candidates
    .map((image) => resolveProductImage(image, options.publicSupabaseUrl, options.fallbackImage))
    .filter((image): image is string => typeof image === 'string' && image.length > 0);

  if (resolvedImages.length === 0) {
    return [resolveProductImage('', options.publicSupabaseUrl, options.fallbackImage)];
  }

  return Array.from(new Set(resolvedImages));
}

export function getPrimaryImage(
  product: Pick<CatalogProduct, 'images' | 'image_overrides'>,
  options: { publicSupabaseUrl?: string | undefined; fallbackImage?: string | undefined } = {}
) {
  return getProductGallery(product, options)[0] || getFallbackProductImage(options.publicSupabaseUrl);
}

export function hasResolvableProductImage(
  product: Pick<CatalogProduct, 'images' | 'image_overrides'>,
  options: { publicSupabaseUrl?: string | undefined; fallbackImage?: string | undefined } = {}
) {
  void options;
  return getPrioritizedImageCandidates(product)
    .some((image) => {
      const source = normalizeText(image).toLowerCase();
      return Boolean(source) && !source.includes('product-placeholder');
    });
}
