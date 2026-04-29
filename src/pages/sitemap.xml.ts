import { filterVisibleCatalogProducts, normalizeCatalogProducts, runProductsQuery } from '../lib/catalog';
import { setPublicCacheHeaders } from '../lib/http-cache';
import { STOREFRONT_CATEGORIES } from '../lib/productPresentation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { blogPosts } from '../lib/homepageContent';

export async function GET() {
    const products = isSupabaseConfigured
      ? await (async () => {
          const { data } = await runProductsQuery(
            (selectClause) => supabase.from('products').select(selectClause),
            ['slug', 'title', 'price_kes', 'updated_at', 'images', 'image_overrides'],
            'Sitemap query missing products.image_overrides; retrying without that column. Apply supabase/schema_sync_2026_03_08.sql to restore schema parity.'
          );
          const productRows = (data || []) as unknown as Array<Record<string, unknown>>;

          return filterVisibleCatalogProducts(
            normalizeCatalogProducts(productRows)
          );
        })()
      : [];

    const categories = [...STOREFRONT_CATEGORIES.map((category) => category.slug), 'all'];
    const pages = ['', 'shop', 'cart', 'track', 'contact', 'faq', 'blog'];

    const baseUrl = 'https://sesicthub.co.ke';

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
    <url>
      <loc>${baseUrl}/${page}</loc>
      <changefreq>daily</changefreq>
      <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>
  `).join('')}
  ${categories.map(cat => `
    <url>
      <loc>${baseUrl}/category/${cat}</loc>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')}
  ${products.map(prod => `
    <url>
      <loc>${baseUrl}/product/${prod.slug}</loc>
      <lastmod>${prod.updated_at ? new Date(prod.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('')}
  ${blogPosts.map(post => `
    <url>
      <loc>${baseUrl}${post.href}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('')}
</urlset>`;

    const headers = new Headers({
      'Content-Type': 'application/xml'
    });
    setPublicCacheHeaders(headers, new Request('https://sesicthub.co.ke/sitemap.xml'), {
      sMaxAge: 21600,
      staleWhileRevalidate: 86400
    });

    return new Response(sitemap, { headers });
}
