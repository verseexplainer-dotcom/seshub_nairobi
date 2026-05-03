import { searchProducts } from '../../../lib/products';
import { STOREFRONT_CATEGORIES } from '../../../lib/productPresentation';
import type { APIRoute } from 'astro';
import { errorResponse, jsonResponse } from '../../../lib/server/http';

export const prerender = false;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 64;
const MAX_RESULTS = 6;
const ALL_CATEGORIES = STOREFRONT_CATEGORIES.map((category) => category.slug);

function normalizeQuery(raw: string) {
  return raw.replace(/\s+/g, ' ').trim();
}

export const GET: APIRoute = async ({ request, locals }) => {
  void locals;
  const queryParam = new URL(request.url).searchParams.get('q') ?? '';
  const normalized = normalizeQuery(queryParam);

  if (normalized.length < MIN_QUERY_LENGTH) {
    return jsonResponse({ ok: true, products: [], categories: [] });
  }

  if (normalized.length > MAX_QUERY_LENGTH) {
    return errorResponse(400, 'INVALID_QUERY', 'Search query is too long.', {
      products: [],
      categories: []
    });
  }

  const searchTerm = normalized
    .replace(/<[^>]*>/g, ' ')
    .replace(/[%_*()[\]{}<>,"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!searchTerm) {
    return jsonResponse({ ok: true, products: [], categories: [] });
  }

  try {
    const dedupedProducts = searchProducts({ query: searchTerm })
      .filter((product) => product.in_stock === true)
      .slice(0, MAX_RESULTS)
      .map((product) => ({
        title: product.title,
        slug: product.slug,
        price_kes: product.price_kes
      }));

    const lowered = normalized.toLowerCase();
    const filteredCategories = ALL_CATEGORIES.filter((category) => category.includes(lowered));

    return jsonResponse(
      {
        ok: true,
        products: dedupedProducts,
        categories: filteredCategories
      },
      200,
      {
        'Cache-Control': 'public, max-age=60'
      }
    );
  } catch (error) {
    return errorResponse(500, 'SEARCH_UNEXPECTED_ERROR', 'Unexpected search error.');
  }
};
