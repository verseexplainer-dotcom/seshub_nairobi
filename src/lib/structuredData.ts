import type { CatalogProduct } from '../types/catalog';
import { getProductPresentation, getWarrantyLabel, normalizeText } from './productPresentation';

type ProductJsonLdOptions = {
  siteBase?: string;
  publicSupabaseUrl?: string;
  fallbackImage?: string;
};

const DEFAULT_SITE_BASE = 'https://sesicthub.co.ke';
const DEFAULT_FALLBACK_IMAGE = '/product-placeholder.svg';

function getSiteBase(value?: string) {
  return normalizeText(value || DEFAULT_SITE_BASE).replace(/\/$/, '') || DEFAULT_SITE_BASE;
}

function stripHtml(value: unknown) {
  return normalizeText(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAbsoluteUrl(value: string, siteBase: string) {
  try {
    return new URL(value, siteBase).toString();
  } catch {
    return value;
  }
}

function getItemCondition(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'brand_new') {
    return 'https://schema.org/NewCondition';
  }

  if (normalized === 'refurbished') {
    return 'https://schema.org/RefurbishedCondition';
  }

  return undefined;
}

function getProductDescription(product: CatalogProduct, conditionLabel: string) {
  const baseDescription = stripHtml(product.meta_description || product.short_description || product.description || product.short_specs);
  const warrantyLabel = getWarrantyLabel(product.warranty_months, 'long');
  const facts = [conditionLabel, warrantyLabel].filter(Boolean).join(' with ');

  if (baseDescription && facts) {
    return `${baseDescription}. ${facts}.`;
  }

  if (baseDescription) {
    return baseDescription;
  }

  return `${product.title} available at SES ICT HUB in Nairobi${facts ? `. ${facts}.` : '.'}`;
}

export function buildProductJsonLd(product: CatalogProduct, options: ProductJsonLdOptions = {}) {
  const siteBase = getSiteBase(options.siteBase);
  const productUrl = `${siteBase}/product/${product.slug}`;
  const presentation = getProductPresentation(product, {
    ...(options.publicSupabaseUrl ? { publicSupabaseUrl: options.publicSupabaseUrl } : {}),
    fallbackImage: options.fallbackImage || DEFAULT_FALLBACK_IMAGE
  });
  const imageUrls = presentation.imageUrls
    .filter(Boolean)
    .map((url) => toAbsoluteUrl(url, siteBase));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: getProductDescription(product, presentation.condition.label),
    image: imageUrls.length > 0 ? imageUrls : undefined,
    sku: product.sku || product.id || product.slug,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category || undefined,
    itemCondition: getItemCondition(product.condition),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'KES',
      price: String(presentation.pricing.price),
      availability: presentation.stock.isInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'SES ICT HUB',
        url: siteBase
      }
    }
  };
}

export function buildProductsItemCollectionJsonLd(products: CatalogProduct[], options: ProductJsonLdOptions = {}) {
  const siteBase = getSiteBase(options.siteBase);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemCollection',
    name: 'SES ICT HUB Products',
    url: siteBase,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildProductJsonLd(product, { ...options, siteBase })
    }))
  };
}
