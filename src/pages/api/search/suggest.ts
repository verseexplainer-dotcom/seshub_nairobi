import { STOREFRONT_CATEGORIES } from '../../../lib/productPresentation';
import type { APIRoute } from 'astro';
import { errorResponse, getPublicEnvValue, jsonResponse } from '../../../lib/server/http';

export const prerender = false;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 64;
const MAX_RESULTS = 6;
const ALL_CATEGORIES = STOREFRONT_CATEGORIES.map((category) => category.slug);
type SearchKey = 'title' | 'slug' | 'brand';

function normalizeQuery(raw: string) {
  return raw.replace(/\s+/g, ' ').trim();
}

function escapeLikeTerm(raw: string) {
  return raw.replace(/[%_*]/g, '').trim();
}

function buildSearchUrl(supabaseUrl: string, key: SearchKey, term: string) {
  const params = new URLSearchParams({
    select: 'title,slug,price_kes,in_stock',
    limit: String(MAX_RESULTS)
  });
  params.set(key, `ilike.*${term}*`);
  params.set('in_stock', 'eq.true');

  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?${params.toString()}`;
}

async function fetchProducts(
  supabaseUrl: string,
  supabaseAnonKey: string,
  key: SearchKey,
  term: string
) {
  const response = await fetch(buildSearchUrl(supabaseUrl, key, term), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    }
  });

  if (!response.ok) {
    return { data: [] as Array<{ title: string; slug: string; price_kes: number }>, ok: false };
  }

  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) {
    return { data: [] as Array<{ title: string; slug: string; price_kes: number }>, ok: false };
  }

  return {
    data: data.filter((item) => typeof item?.slug === 'string'),
    ok: true
  };
}

export const GET: APIRoute = async ({ request, locals }) => {
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

  const searchTerm = escapeLikeTerm(normalized);
  if (!searchTerm) {
    return jsonResponse({ ok: true, products: [], categories: [] });
  }

  const supabaseUrl = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getPublicEnvValue(locals, 'PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse(500, 'SUPABASE_CONFIG_MISSING', 'Server search configuration is incomplete.', {
      products: [],
      categories: []
    });
  }

  try {
    const [titleMatch, brandMatch, slugMatch] = await Promise.all([
      fetchProducts(supabaseUrl, supabaseAnonKey, 'title', searchTerm),
      fetchProducts(supabaseUrl, supabaseAnonKey, 'brand', searchTerm),
      fetchProducts(supabaseUrl, supabaseAnonKey, 'slug', searchTerm)
    ]);

    if (!titleMatch.ok && !brandMatch.ok && !slugMatch.ok) {
      return errorResponse(502, 'SEARCH_UPSTREAM_ERROR', 'Unable to fetch search results right now.', {
        products: [],
        categories: []
      });
    }

    const mergedProducts = [...titleMatch.data, ...brandMatch.data, ...slugMatch.data];
    const dedupedProducts = Array.from(
      new Map(
        mergedProducts.map((item) => [
          String(item.slug),
          {
            title: String(item.title || ''),
            slug: String(item.slug || ''),
            price_kes: Number(item.price_kes || 0)
          }
        ])
      ).values()
    ).slice(0, MAX_RESULTS);

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
