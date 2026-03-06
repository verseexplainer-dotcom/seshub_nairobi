# 🚀 Deployment Guide: SES ICT HUB Storefront

This document outlines the steps to deploy the SES ICT HUB storefront to **Cloudflare Pages** and configure the **Supabase** backend.

## 1. Supabase Setup (Backend)

### SQL Schema
1. Login to [Supabase Dashboard](https://app.supabase.com/).
2. Select your project.
3. Go to **SQL Editor** → **New Query**.
4. Paste the contents of `supabase/schema.sql` and run.

### Storage
1. Go to **Storage**.
2. Create a new bucket named `product-images`.
3. Set the bucket privacy to **Public**.
4. **(Recommended)** Create a separate bucket named `site-assets` for:
    - Store logos and favicons.
    - Homepage banners and hero images.
    - Category feature cards.
    - Brand logos for carousels.
5. Set the privacy for `site-assets` to **Public**.

### Data Import
1. Go to **Table Editor** → `products` table.
2. Click **Insert** → **Import Data from CSV**.
3. Upload `products_for_supabase_import_v4.csv`.

---

## 2. Cloudflare Pages Deployment (Frontend)

### Initial Connection
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the repository `ses-superbase-stack`.

### Build Settings
- **Framework preset**: `Astro`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

### Environment Variables
Go to **Settings** → **Environment Variables** and add the following:

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** Service Role Key (Found in Project Settings -> API) |

> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` is required for the checkout and analytics functions to work correctly.

---

## 3. Production Testing & Verification

1. **Build Sanity**: Run `npm run build` locally to ensure no TypeScript or build errors.
2. **Checkout Flow**: 
   - Add a product to cart.
   - Proceed to checkout.
   - Verify that an `order_intent` is created in Supabase.
   - Verify that the WhatsApp link opens with the correct pre-filled message.
3. **Analytics**: Verify that `events` are being recorded in the Supabase `events` table.

## 4. Troubleshooting
- **Missing Images**: Ensure images are uploaded to the `product-images` bucket and the base URL in the database matches the bucket path.
- **API Failures**: Check Cloudflare Pages **Functions** logs for any errors related to environment variables.
