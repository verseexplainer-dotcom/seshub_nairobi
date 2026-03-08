import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ products: [], categories: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = (locals as any)?.runtime?.env ?? {};
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ products: [], categories: [] }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prodRes = await fetch(
      `${supabaseUrl}/rest/v1/products?select=title,slug,price_kes&or=(title.ilike.%${query}%,slug.ilike.%${query}%)&limit=6`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      }
    );
    const products = await prodRes.json();

    const allCategories = ['laptops', 'desktops', 'printers', 'smartphones', 'accessories'];
    const filteredCategories = allCategories.filter((cat) => cat.includes(query.toLowerCase()));

    return new Response(
      JSON.stringify({
        products: Array.isArray(products) ? products : [],
        categories: filteredCategories
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
