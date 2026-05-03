import { setPublicCacheHeaders } from '../lib/http-cache';
import { STOREFRONT_CATEGORIES } from '../lib/productPresentation';
import { getAllProducts } from '../lib/products';
import { blogPosts } from '../lib/homepageContent';

export async function GET() {
    const products = getAllProducts();

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
