import type { CatalogProduct } from '../types/catalog';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getProductPrice(product: Pick<CatalogProduct, 'price_kes'>) {
  return Math.max(0, toNumber(product.price_kes) ?? 0);
}

export function getCompareAtPrice(
  product: Pick<CatalogProduct, 'compare_at_kes' | 'compare_at_price'>
) {
  const compareAt = toNumber(product.compare_at_kes ?? product.compare_at_price);
  return compareAt !== null && compareAt > 0 ? compareAt : null;
}

export function formatKES(value: number | string | null | undefined) {
  const amount = toNumber(value) ?? 0;
  return `KSh ${Math.round(Math.max(0, amount)).toLocaleString('en-KE')}`;
}

export function hasDiscount(product: Pick<CatalogProduct, 'price_kes' | 'compare_at_kes' | 'compare_at_price'>) {
  const price = getProductPrice(product);
  const compareAt = getCompareAtPrice(product);
  return compareAt !== null && compareAt > price;
}

export function getSavingsAmount(
  product: Pick<CatalogProduct, 'price_kes' | 'compare_at_kes' | 'compare_at_price'>
) {
  if (!hasDiscount(product)) {
    return 0;
  }

  return Math.max(0, (getCompareAtPrice(product) ?? 0) - getProductPrice(product));
}

export function getSavingsPercent(
  product: Pick<CatalogProduct, 'price_kes' | 'compare_at_kes' | 'compare_at_price'>
) {
  const compareAt = getCompareAtPrice(product);
  if (!compareAt || !hasDiscount(product)) {
    return 0;
  }

  return Math.round((getSavingsAmount(product) / compareAt) * 100);
}
