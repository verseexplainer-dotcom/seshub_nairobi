# SES ICT HUB — E-commerce Storefront

A production-ready, high-performance storefront for SES ICT HUB built with Astro, Supabase, and Cloudflare Pages.

## 🚀 Tech Stack
- **Framework**: [Astro](https://astro.build/) (`output: static`)
- **Database**: [Supabase](https://supabase.com/) (Postgres + RLS)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **Checkout**: WhatsApp hybrid (order intent saved to DB → WhatsApp opened)
- **Styling**: Vanilla CSS (mobile-first, electric blue theme)

---

## � Project Structure

```
├── src/
│   ├── components/       # AnnouncementStrip, Header, Hero, Footer, ProductCard, etc.
│   ├── layouts/          # Layout.astro
│   ├── lib/supabase.ts   # Supabase client (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
│   ├── pages/
│   │   ├── index.astro           # Homepage (featured, refurbished, testimonials)
│   │   ├── category/[slug].astro # Category pages
│   │   ├── product/[slug].astro  # Product detail pages
│   │   ├── cart.astro            # Shopping cart
│   │   ├── contact.astro
│   │   ├── faq.astro
│   │   ├── track.astro
│   │   └── sitemap.xml.ts
│   └── styles/global.css
├── functions/api/        # Cloudflare Pages Functions (checkout, events, search)
├── supabase/schema.sql   # Full DB schema (v2 — numeric types, RLS policies)
└── public/robots.txt
```

---

## 🛠️ Setup

### 1. Supabase
1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. Open **SQL Editor** → paste and run `supabase/schema.sql`.
3. Under **Storage** → create bucket `product-images` (set to **Public**).

### 2. Import Products
Import `products_for_supabase_import_v4.csv` into the `products` table via Table Editor → Import Data. The CSV has **239 rows** and imports unchanged — all column names match the schema exactly.

**Category values** (capitalized in DB): `Laptops`, `Printers`, `Smartphones`, `Accessories`, `Desktops`
**Conditions**: `brand_new`, `refurbished`, `unknown`
**Refurb grades**: `grade_a`, `grade_b`, `grade_c`

### 3. Environment Variables
Create a `.env` file in the project root:
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Local Development
```bash
npm install
npm run dev
```

### 5. Cloudflare Pages Deployment
1. Connect your GitHub repo to Cloudflare Pages.
2. **Build command**: `npm run build`
3. **Output directory**: `dist`
4. Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Settings → Environment Variables.

---

## 🗄️ Database Schema (v2)

| Table | Purpose |
|---|---|
| `products` | Product catalogue (numeric types for CSV decimal compatibility) |
| `order_intents` | WhatsApp hybrid checkout (customer_name, cart, phone, status) |
| `events` | Analytics (page_view, add_to_cart, whatsapp_click, etc.) |
| `testimonials` | Customer reviews (name, persona, quote, rating, approved) |
| `newsletter_signups` | Email collection with consent |

All tables have RLS enabled. Products and approved testimonials are publicly readable; order_intents, events, and newsletter_signups are insert-only for anon/authenticated roles.

---

## 🛒 Category Routes

| URL | DB Query |
|---|---|
| `/category/laptops` | `category = 'Laptops'` |
| `/category/printers` | `category = 'Printers'` |
| `/category/smartphones` | `category = 'Smartphones'` |
| `/category/accessories` | `category = 'Accessories'` |
| `/category/deals` | `compare_at_kes IS NOT NULL` |
| `/category/all` | All products |

---

## 🛡️ Rollback Plan
1. Revert to the previous commit in Git.
2. Cloudflare Pages auto-redeploys the previous state.
3. For DB issues, use Supabase point-in-time recovery or manual backup.

---

## ✅ Done Criteria
- [x] Homepage loads featured products, refurbished deals, and approved testimonials
- [x] All category pages functional (including `/category/smartphones`)
- [x] Product detail pages render from Supabase data
- [x] WhatsApp checkout saves order intents and opens WhatsApp
- [x] Responsive, mobile-first design with pill buttons and electric blue theme
- [x] SEO: sitemap, robots.txt, OG tags
- [x] CSV imports into `products` table without any column renaming
