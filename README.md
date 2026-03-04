# SES ICT HUB E-commerce Storefront

A production-ready, high-performance storefront for SES ICT HUB built with Astro, Supabase, and Cloudflare Pages.

## 🚀 Speed & Tech Stack
- **Framework**: [Astro](https://astro.build/) (Static First)
- **Database**: [Supabase](https://supabase.com/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/) 
- **Checkout**: WhatsApp-only (No online payments)
- **Styling**: Vanilla CSS (Modern, Minimal, Mobile-first)

---

## 🛠️ Step-by-Step Setup

### 1. Supabase Setup
1. Create a new Supabase project at [app.supabase.com](https://app.supabase.com).
2. Go to the **SQL Editor** and run the contents of [`supabase/schema.sql`](file:///home/paulaflare/Desktop/ses%20superbase%20stack/supabase/schema.sql).
3. Under **Storage**, create two buckets:
   - `product-images` (Set to **Public**)
   - `brand-logos` (Set to **Public**)

### 2. Product Data
Add initial products via the Supabase Dashboard or CSV import. Ensure you follow the schema.
- **Conditions**: `brand_new`, `refurbished`
- **Categories**: `laptops`, `printers`, `phones`, `accessories`
- **Grades**: `grade_a`, `grade_b`, `grade_c` (for refurbished items)

### 3. Environment Variables
Create a `.env` file in the root:
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Cloudflare Pages Deployment
1. Connect your GitHub repo to Cloudflare Pages.
2. Set the **Build Command**: `npm run build`
3. Set the **Output Directory**: `dist`
4. Add the **Environment Variables** (matches `.env` above) in the Cloudflare Dashboard under Settings > Functions.

---

## 📦 Deliverables
- `/src/pages`: Astro pages for Home, Category, Product, Cart, etc.
- `/src/components`: UI components including Sticky Header, Announcement Bar, and Product Cards.
- `/functions/api`: Serverless functions for WhatsApp checkout and event tracking.
- `/supabase/schema.sql`: Full database schema with Row Level Security (RLS) policies.

---

## 🛡️ Rollback Plan
If a deployment fails:
1. Revert to the previous successful commit in Git.
2. Cloudflare Pages will automatically redeploy the previous state.
3. If database changes are breaking, use Supabase point-in-time recovery (if available) or manual backup restoration.

---

## 📋 Done Criteria Check
- [x] Homepage, Category, Product, and Cart pages functional.
- [x] WhatsApp checkout generates correct messages and saves order intents.
- [x] Responsive, mobile-first design with pill buttons and electric blue theme.
- [x] SEO optimized with sitemap, robots.txt, and OG tags.
- [x] Predictive search via Cloudflare Functions.
