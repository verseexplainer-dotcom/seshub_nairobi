# Architecture

SES ICT HUB Storefront is an Astro ecommerce app deployed as a Cloudflare Worker.

## Runtime

- Astro uses server output.
- `@astrojs/cloudflare` adapts the app to Workers.
- API routes live only under `src/pages/api/*`.
- Supabase provides Postgres, Auth, and Storage.
- RLS stays enabled in Supabase.

## Main Folders

- `src/pages`: route files for storefront pages, account pages, admin pages, and API endpoints
- `src/components`: shared Astro components
- `src/components/home`: homepage-specific sections
- `src/components/ui`: reusable small UI building blocks
- `src/lib`: catalog, pricing, image, auth, cache, and runtime helpers
- `src/styles`: vanilla CSS tokens, global styles, utilities, and homepage styles
- `supabase`: schema, migrations, and database reference SQL
- `scripts`: deploy, import, image, audit, and local check tools
- `public/site-assets`: local public site imagery and fallbacks

## Data Flow

1. Storefront pages query Supabase through server-side helpers.
2. Product data is normalized in `src/lib/catalog.ts` and presentation helpers.
3. Product images resolve through `image_overrides`, then `images`, then fallback assets.
4. Checkout, newsletter, events, auth, and admin writes go through Astro API routes.
5. Sensitive Supabase operations use server-only environment variables.

## Boundaries

- Browser code must not receive `SUPABASE_SERVICE_ROLE_KEY`.
- Client writes should not bypass Astro API routes.
- Supabase policies must remain restrictive for write-heavy tables.
- Cloudflare Worker deployment remains the only production runtime.

