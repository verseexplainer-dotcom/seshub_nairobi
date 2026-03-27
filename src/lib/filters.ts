import { getCategoryPath, getCategorySlug, normalizeText } from './productPresentation';

interface ListingHrefOptions {
  category?: string | null;
  brand?: string | null;
  condition?: string | null;
  sort?: string | null;
  in_stock?: string | number | null;
}

export function buildListingHref(options: ListingHrefOptions = {}) {
  const categorySlug = normalizeText(options.category);
  const basePath = categorySlug ? getCategoryPath(categorySlug) : '/shop';
  const params = new URLSearchParams();

  if (normalizeText(options.brand)) {
    params.set('brand', normalizeText(options.brand));
  }

  if (normalizeText(options.condition)) {
    params.set('condition', normalizeText(options.condition));
  }

  if (normalizeText(options.sort)) {
    params.set('sort', normalizeText(options.sort));
  }

  if (options.in_stock !== null && options.in_stock !== undefined && String(options.in_stock) !== '') {
    params.set('in_stock', String(options.in_stock));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildCategoryFilterHref(category: string | null | undefined, options: Omit<ListingHrefOptions, 'category'> = {}) {
  const categorySlug = getCategorySlug(category);
  return buildListingHref({ category: categorySlug, ...options });
}

export function buildBrandFilterHref(
  brand: string | null | undefined,
  options: Pick<ListingHrefOptions, 'category' | 'sort' | 'in_stock'> = {}
) {
  return buildListingHref({
    ...options,
    ...(brand === undefined ? {} : { brand })
  });
}

export function buildConditionFilterHref(
  condition: string | null | undefined,
  options: Pick<ListingHrefOptions, 'category' | 'sort' | 'in_stock'> = {}
) {
  return buildListingHref({
    ...options,
    ...(condition === undefined ? {} : { condition })
  });
}
