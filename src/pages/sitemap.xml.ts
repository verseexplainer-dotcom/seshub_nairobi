import { STOREFRONT_CATEGORIES } from '../lib/productPresentation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function GET() {
    const products = isSupabaseConfigured
      ? (await supabase.from('products').select('slug, updated_at')).data || []
      : [];

    const categories = [...STOREFRONT_CATEGORIES.map((category) => category.slug), 'all'];
    const pages = ['', 'shop', 'cart', 'track', 'contact', 'faq'];

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
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
}
