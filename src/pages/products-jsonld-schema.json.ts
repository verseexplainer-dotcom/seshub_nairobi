import { setPublicCacheHeaders } from '../lib/http-cache';
import { getAllProducts } from '../lib/products';
import { buildProductsItemCollectionJsonLd } from '../lib/structuredData';

const publicSupabaseUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_SUPABASE_URL;

export async function GET() {
  const headers = new Headers({
    'Content-Type': 'application/ld+json; charset=utf-8'
  });
  setPublicCacheHeaders(headers, new Request('https://sesicthub.co.ke/products-jsonld-schema.json'), {
    sMaxAge: 21600,
    staleWhileRevalidate: 86400
  });

  return new Response(
    JSON.stringify(
      buildProductsItemCollectionJsonLd(getAllProducts(), {
        siteBase: 'https://sesicthub.co.ke',
        publicSupabaseUrl,
        fallbackImage: '/product-placeholder.svg'
      })
    ),
    { headers }
  );
}
