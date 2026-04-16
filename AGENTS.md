# AGENTS.md
Project: SES ICT HUB Storefront
Stack: Astro + Supabase + Cloudflare Workers

This document defines how AI coding agents should assist development for this project.

Agents must behave as **senior ecommerce engineers** while explaining changes clearly for a beginner developer.

---

# Project Overview

This project is an ecommerce storefront powered by:

Frontend
- Astro

Backend
- Supabase (Postgres + Storage)

Deployment
- Cloudflare Workers

Product data is stored in Supabase and managed through CSV imports.

---

# Current Product Catalog Scope

The current dataset contains the following product categories:

- Laptops
- Smartphones
- Printers
- Desktops
- Accessories (available via search, not featured)

**Featured Categories (Homepage):**
Only 4 core categories are featured on the homepage to reduce decision fatigue and improve conversion:
- Laptops
- Smartphones  
- Printers
- Desktops

Accessories are available through search and category pages but not in the featured section.

Import note:
- Source rows tagged as `storage` should be treated as `Accessories` in the storefront and import pipeline.

---

# Product Schema (Source of Truth)

Agents must rely on the existing database schema.

Current product fields include:

slug  
title  
category  
price_kes  
compare_at_kes  
in_stock  
stock_qty  
brand  
condition  
refurb_grade  
short_specs  
description  
warranty_months  
images  
featured_home  
featured_rank  
sku  
status  
cpu  
ram_gb  
storage_gb  
storage_type  
screen_in  
collections  
tags  
seo_title  
meta_description  
created_at  
updated_at  

Agents should NOT invent fields that are not present in this schema.

---

# Data Interpretation Rules

Agents should interpret product specs using these fields:

CPU → cpu  
RAM → ram_gb  
Storage → storage_gb + storage_type  
Screen size → screen_in  
Warranty → warranty_months  
Stock → in_stock + stock_qty  

If any spec field is missing, the UI should gracefully hide that spec.

Do NOT fabricate missing values.

---

# Product Image Handling

Product images are stored in Supabase Storage.

Fields used:

images (JSON array)  
image_overrides (optional if present)

Image priority order:

1. image_overrides
2. images
3. fallback image

Fallback images exist in the `product-images` bucket.

Agents must ensure products never render with broken images.

---

# Product Card UI Rules

Product cards must show only data available in the schema.

Each card should display:

- Product image (with fallback)
- Title (truncated intelligently for mobile)  
- Key specs (cpu, ram_gb, storage_gb, screen_in if available, comma-separated)
- Price (price_kes with currency symbol)  
- Savings badge (if compare_at_kes > price_kes)  
- Condition badge (Brand New / Refurbished / Ex-UK)
- Stock status (Live Stock / Out of Stock / Limited Stock)  
- Warranty badge if warranty_months exists (shows months)

Action buttons (context-sensitive):

- "Add to Cart" button (only if in_stock=true)  
- "Chat on WhatsApp" button (if out of stock or for inquiries)
- Product link (click anywhere on card except action areas)

Optional enhancements:
- Quick view modal for specs
- Animation on hover/focus
- Brand name for recognition

---

# Category Page Requirements

Category pages must use the existing category values from the database.

Featured categories (with dedicated pages):
- Laptops  
- Smartphones  
- Printers  
- Desktops

All categories (including Accessories) are accessible via search or direct URL routing.

Category pages should include:

- Breadcrumb navigation  
- Live product count  
- Product grid with persistent filtering
- Sorting options (Featured, Price, Newest, Most Reviewed)
- Active filter badges with clear affordance

Optional filters based on available data:

- brand  
- cpu  
- ram_gb  
- storage_gb  
- screen_in  
- price_kes  
- condition  
- warranty_months  

Filters must not reference fields that do not exist.
All filters should apply via clean URL parameters for shareability and bookmarking.

---

# Product Page Requirements

Single product pages should include:

Product image gallery  
Title and price  
Savings calculation if compare_at_kes exists  
Stock state  
Warranty display  
Key specs summary  

Specs table should use:

cpu  
ram_gb  
storage_gb  
storage_type  
screen_in  
condition  
refurb_grade  

Description content should come from:

short_specs  
description

Related products should be determined using:

category  
brand

---

# Homepage Requirements

Homepage sections must rely on existing data.

Featured products use:

featured_home  
featured_rank

**Homepage Structure (Optimized Layout):**

1. **Hero Section** with:
   - Engaging headline and value proposition
   - Compact search bar with category, price, condition filters
   - Trust badges and live inventory stats
   - Product showcase with floating animations
   - Call-to-action buttons (Shop / WhatsApp)

2. **Featured Category Cards** (4 items only):
   - Laptops, Smartphones, Printers, Desktops
   - Live product count per category
   - Hover effects with accent color overlays
   - 2×2 grid layout (desktop), responsive stacking (mobile)

3. **Featured Products Grid**:
   - Curated by featured_home flag and featured_rank
   - Organized into tabs: Featured, New In, Best Value, Premium
   - Dynamic product cards with specs, pricing, warranty info

4. **Additional Sections**:
   - Refurbished vs Brand New comparison
   - Daily deals band
   - Shop by brand carousel
   - Use case collections
   - Trust highlights
   - Latest guides preview
   - Newsletter signup

Agents must not assume additional marketing data exists.
All sections should gracefully handle empty states.

---

# Conversion Rules

Agents should improve conversion using available data only.

Examples:

Display savings when compare_at_kes exists.

Show warranty badge if warranty_months is present.

Display stock status based on:

in_stock  
stock_qty

Out-of-stock products must disable Add to Cart.

---

# Mobile UX Rules

Agents must ensure:

2-column product grid on mobile  
Readable titles  
Large tap targets  
Responsive layout  

Avoid complex UI that requires unavailable data.

---

# Performance Rules

Agents must preserve Astro performance advantages:

**Frontend Performance:**
- Minimal JavaScript (Astro island hydration only where needed)
- Lazy loading images with native `loading="lazy"`
- Image optimization: WebP format, responsive sizes
- CSS is scoped and statically generated

**Data Performance:**
- Efficient Supabase queries (limit, pagination, indexing on hot queries)
- Server-side filtering on homepage to reduce client-side processing
- Cache static pages where appropriate (ISR for Cloudflare)

**Build Performance:**
- Avoid heavy JavaScript libraries unless absolutely necessary
- Prefer native browser APIs (Fetch, FormData, URLSearchParams)
- Keep component bundle sizes small
- Use dynamic imports for code-splitting

**Target Metrics:**
- Lighthouse scores: 90+ on Perf, Accessibility, Best Practices, SEO
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1

---

# SEO Rules

Use existing SEO fields:

seo_title  
meta_description  

Product pages should use slug as canonical URL.

Agents must not generate SEO content that contradicts database data.

---

# Safety Rules

Agents must ask before:

Changing database schema  
Deleting files  
Refactoring large areas of code  
Adding major dependencies  

All changes should be incremental and explained.

---

# Recommended Codex Skills

Prefer these skills when the task matches:

- `frontend-skill` for homepage, category page, product page, and mobile UX work
- `playwright` for browser-level route checks and conversion-flow validation
- `cloudflare-deploy` for Wrangler auth, Worker deploys, and release checks
- `spreadsheet` for CSV imports, price updates, and catalog QA
- `security-best-practices` for auth, admin, and API hardening review
- `sentry` for release-time error visibility and post-deploy debugging

Secondary skills:

- `figma` or `figma-implement-design` when a Figma file or node link exists
- `notion-spec-to-implementation` when changes need structured planning and task tracking

Project-specific companion notes for these skills live in `tools/codex-skills/`.

---

# Hero Search Bar

**Feature:** Compact search interface with quick filters in the hero section.

**Component:** `HeroSearch.astro`

**Functionality:**
- Text search across: title, description, brand, short_specs
- Category filter: Maptop 4 featured categories
- Price filter: Preset ranges (Under 50K, 50K-100K, 100K-200K, 200K+)
- Condition filter: Brand New, Refurbished

**Search Results Page:** `/search.astro`
- Applies all filters and sorts by featured then price
- Shows result count and clear empty states
- Preserves filter choices in URL for sharing

**Design Principles:**
- Mobile-first responsive (stacks on small screens)
- High visual hierarchy with blue gradient button
- Clear labeling on all filter selects
- Smooth transitions and focus states

---

# Mentorship Requirement

The project owner is learning development.

Agents must:

Explain changes clearly  
Avoid unnecessary complexity  
Provide testing instructions  
Highlight potential mistakes

---

# Development Philosophy

Improve the storefront using the **existing data model first**.

Do not redesign the database unless absolutely necessary.

Prioritize:

clean UI  
trustworthy product display  
consistent catalog data  
maintainable codebase

---
