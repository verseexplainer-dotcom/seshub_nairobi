import type { CatalogProduct, HomepageUseCaseCollection } from '../types/catalog';
import type { HomeTestimonial } from './homepageContent';
import {
  countMerchandisingBrands,
  getCatalogCategoryKey,
  getConditionLabel,
  getProductSpecChips,
  hasCatalogImage,
  isProductInStock
} from './catalog';
import { buildCategoryFilterHref, buildConditionFilterHref, buildListingHref } from './filters';
import { getSavingsAmount, getSavingsPercent, hasDiscount } from './pricing';
import { getProductBrand, normalizeText } from './productPresentation';

type HomepageTestimonialRow = {
  id?: unknown;
  name?: unknown;
  persona?: unknown;
  rating?: unknown;
  quote?: unknown;
};

export function buildHomepageTestimonials(
  rows: HomepageTestimonialRow[] | null | undefined,
  limit = 6
): HomeTestimonial[] {
  const testimonials: HomeTestimonial[] = [];
  const seenTestimonials = new Set<string>();

  for (const item of rows ?? []) {
    const testimonialId = item.id == null ? null : typeof item.id === 'string' ? item.id : String(item.id);
    const testimonial: HomeTestimonial = {
      name: String(item.name ?? '').trim(),
      persona: String(item.persona ?? '').trim(),
      rating: Math.max(1, Math.min(5, Number(item.rating || 5))),
      quote: String(item.quote ?? '').trim()
    };

    if (testimonialId) {
      testimonial.id = testimonialId;
    }

    const testimonialKey = `${testimonial.name.toLowerCase()}::${testimonial.persona.toLowerCase()}`;
    if (!testimonial.name || !testimonial.quote || seenTestimonials.has(testimonialKey)) {
      continue;
    }

    seenTestimonials.add(testimonialKey);
    testimonials.push(testimonial);

    if (testimonials.length === limit) {
      break;
    }
  }

  return testimonials;
}

export function countExplicitBrands(products: Array<Record<string, unknown>>) {
  return new Set(
    products
      .map((product) => getProductBrand(product))
      .filter(Boolean)
  ).size;
}

const CATEGORY_PRIORITY: Record<string, number> = {
  laptops: 5,
  smartphones: 4,
  printers: 3,
  desktops: 2,
  accessories: 1
};

function getCategoryPriority(product: CatalogProduct) {
  return CATEGORY_PRIORITY[getCatalogCategoryKey(product)] || 0;
}

function getSpecDepth(product: CatalogProduct) {
  return getProductSpecChips(product, 4).length;
}

function getDateValue(value: string | null | undefined) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTieBreaker(left: CatalogProduct, right: CatalogProduct) {
  const featuredRankDelta = Number(left.featured_rank || Number.MAX_SAFE_INTEGER) - Number(right.featured_rank || Number.MAX_SAFE_INTEGER);
  if (featuredRankDelta !== 0) {
    return featuredRankDelta;
  }

  const updatedDelta = getDateValue(right.updated_at) - getDateValue(left.updated_at);
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const createdDelta = getDateValue(right.created_at) - getDateValue(left.created_at);
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.title.localeCompare(right.title);
}

function scoreMerchandisingCandidate(product: CatalogProduct) {
  return (
    (isProductInStock(product) ? 200 : 0) +
    (hasCatalogImage(product) ? 70 : 0) +
    (product.featured_home ? 100 : 0) +
    getCategoryPriority(product) * 20 +
    getSpecDepth(product) * 12 +
    (product.short_specs ? 20 : 0) +
    (product.warranty_months ? 8 : 0)
  );
}

function scoreNewInCandidate(product: CatalogProduct) {
  return (
    (isProductInStock(product) ? 200 : 0) +
    (hasCatalogImage(product) ? 50 : 0) +
    getCategoryPriority(product) * 24 +
    getSpecDepth(product) * 10 +
    (product.short_specs ? 14 : 0) +
    Math.round(getDateValue(product.updated_at) / 100000000)
  );
}

function scoreBestValueCandidate(product: CatalogProduct) {
  return (
    (isProductInStock(product) ? 200 : 0) +
    (hasCatalogImage(product) ? 40 : 0) +
    getCategoryPriority(product) * 18 +
    getSavingsPercent(product) * 4 +
    Math.round(getSavingsAmount(product) / 1000) +
    getSpecDepth(product) * 12 -
    Math.round(product.price_kes / 5000)
  );
}

function scorePremiumCandidate(product: CatalogProduct) {
  return (
    (isProductInStock(product) ? 180 : 0) +
    (hasCatalogImage(product) ? 40 : 0) +
    getCategoryPriority(product) * 24 +
    getSpecDepth(product) * 18 +
    Math.round(product.price_kes / 1000) +
    (normalizeText(product.condition).toLowerCase() === 'brand_new' ? 16 : 0)
  );
}

function sortByScore(products: CatalogProduct[], scorer: (product: CatalogProduct) => number) {
  return products
    .map((product) => ({
      product,
      score: scorer(product)
    }))
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return getTieBreaker(left.product, right.product);
    })
    .map((entry) => entry.product);
}

function pickBalancedProducts(products: CatalogProduct[], limit: number, perCategory = 3) {
  const counts = new Map<string, number>();
  const picked: CatalogProduct[] = [];

  for (const product of products) {
    const category = getCatalogCategoryKey(product);
    const categoryCount = counts.get(category) || 0;
    if (categoryCount >= perCategory) {
      continue;
    }

    picked.push(product);
    counts.set(category, categoryCount + 1);
    if (picked.length === limit) {
      return picked;
    }
  }

  for (const product of products) {
    if (picked.some((entry) => entry.slug === product.slug)) {
      continue;
    }

    picked.push(product);
    if (picked.length === limit) {
      break;
    }
  }

  return picked;
}

function getHomepageCandidates(products: CatalogProduct[]) {
  return products.filter((product) => product.slug && product.title && product.price_kes > 0);
}

export function selectFeaturedProducts(products: CatalogProduct[], limit = 6) {
  const ranked = sortByScore(getHomepageCandidates(products), scoreMerchandisingCandidate);
  return pickBalancedProducts(ranked, limit, 2);
}

export function selectNewInProducts(products: CatalogProduct[], limit = 6) {
  const ranked = sortByScore(getHomepageCandidates(products), scoreNewInCandidate);
  return pickBalancedProducts(ranked, limit, 2);
}

export function selectBestValueProducts(products: CatalogProduct[], limit = 6) {
  const discounted = getHomepageCandidates(products).filter(hasDiscount);
  const source = discounted.length >= Math.min(limit, 3) ? discounted : getHomepageCandidates(products);
  const ranked = sortByScore(source, scoreBestValueCandidate);
  return pickBalancedProducts(ranked, limit, 2);
}

export function selectPremiumProducts(products: CatalogProduct[], limit = 6) {
  const ranked = sortByScore(getHomepageCandidates(products), scorePremiumCandidate);
  return pickBalancedProducts(ranked, limit, 2);
}

export function selectDealsProducts(products: CatalogProduct[], limit = 3) {
  const deals = getHomepageCandidates(products).filter((product) => isProductInStock(product) && hasDiscount(product));
  return sortByScore(deals, scoreBestValueCandidate).slice(0, limit);
}

export function buildUseCaseCollections(products: CatalogProduct[]) {
  const allProducts = getHomepageCandidates(products);
  const laptopProducts = allProducts.filter((product) => getCatalogCategoryKey(product) === 'laptops' && isProductInStock(product));
  const printerProducts = allProducts.filter((product) => getCatalogCategoryKey(product) === 'printers' && isProductInStock(product));
  const smartphoneProducts = allProducts.filter((product) => getCatalogCategoryKey(product) === 'smartphones' && isProductInStock(product));
  const officeProducts = allProducts.filter((product) => ['desktops', 'printers', 'accessories', 'laptops'].includes(getCatalogCategoryKey(product)) && isProductInStock(product));
  const refurbishedProducts = allProducts.filter((product) => normalizeText(product.condition).toLowerCase() === 'refurbished' && isProductInStock(product));

  const collections: HomepageUseCaseCollection[] = [
    {
      id: 'student-laptops',
      title: 'Best Laptops for Students',
      description: 'Portable picks with practical RAM, storage, and fair pricing for study and daily work.',
      href: buildCategoryFilterHref('laptops', { sort: 'price_asc', in_stock: 1 }),
      products: sortByScore(
        laptopProducts.filter((product) => product.price_kes <= 90000 || (product.ram_gb || 0) >= 8),
        scoreBestValueCandidate
      ).slice(0, 3)
    },
    {
      id: 'office-setup-essentials',
      title: 'Office Setup Essentials',
      description: 'Mix desktops, printers, and reliable accessories for counters, teams, and small offices.',
      href: buildListingHref({ sort: 'featured', in_stock: 1 }),
      products: sortByScore(officeProducts, scoreMerchandisingCandidate).slice(0, 3)
    },
    {
      id: 'best-refurbished-deals',
      title: 'Best Refurbished Deals',
      description: 'Value-focused refurbished machines with tested condition and honest pricing.',
      href: buildConditionFilterHref('refurbished', { sort: 'price_asc', in_stock: 1 }),
      products: sortByScore(refurbishedProducts, scoreBestValueCandidate).slice(0, 3)
    },
    {
      id: 'printers-for-small-business',
      title: 'Printers for Small Business',
      description: 'Fast office-ready printers for receipts, documents, and day-to-day business tasks.',
      href: buildCategoryFilterHref('printers', { sort: 'featured', in_stock: 1 }),
      products: sortByScore(printerProducts, scoreMerchandisingCandidate).slice(0, 3)
    },
    {
      id: 'popular-smartphones',
      title: 'Popular Smartphones',
      description: 'Phone picks shoppers ask for most when they need dependable daily-use devices.',
      href: buildCategoryFilterHref('smartphones', { sort: 'featured', in_stock: 1 }),
      products: sortByScore(smartphoneProducts, scoreNewInCandidate).slice(0, 3)
    }
  ];

  return collections.filter((collection) => collection.products.length > 0);
}

export function getInventorySummary(products: CatalogProduct[]) {
  const liveProducts = products.filter((product) => isProductInStock(product));

  return {
    liveCount: liveProducts.length,
    brandCount: countMerchandisingBrands(products),
    brandNewCount: liveProducts.filter((product) => getConditionLabel(product) === 'Brand New').length,
    refurbishedCount: liveProducts.filter((product) => getConditionLabel(product) === 'Refurbished').length
  };
}
