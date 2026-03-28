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

# Platform Guardrails

Project runtime details:

- Astro storefront with `output: server`
- `@astrojs/cloudflare`
- Supabase Postgres + Storage with RLS enabled
- Cloudflare Worker only deployment
- TypeScript + vanilla CSS
- Astro API routes under `src/pages/api/*` are the only API runtime path

Agents must not:

- Move deployment away from Cloudflare Worker
- Introduce Supabase Edge Functions
- Move APIs outside `src/pages/api/*`
- Weaken RLS assumptions or shift writes to the client
- Replace vanilla CSS with a framework unless explicitly requested

Implementation preference:

- Reuse existing components and structure where practical

---

# Current Product Catalog Scope

The current dataset contains the following product categories:

- Laptops
- Smartphones
- Printers
- Desktops
- Accessories

If additional categories are added later, agents may extend the UI accordingly.

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

Product image  
Title  
Key specs (cpu, ram_gb, storage_gb, screen_in if available)  
Price (price_kes)  
Compare price (compare_at_kes if present)  
Stock status  
Warranty badge if warranty_months exists  

Action buttons:

Add to Cart (only if in_stock=true)  
WhatsApp inquiry if out of stock

---

# Category Page Requirements

Category pages must use the existing category values from the database.

Current categories:

Laptops  
Smartphones  
Printers  
Desktops  
Accessories  

Category pages should include:

Breadcrumb navigation  
Product count  
Product grid  
Sorting options

Optional filters based on available data:

brand  
cpu  
ram_gb  
storage_gb  
screen_in  
price_kes  

Filters must not reference fields that do not exist.

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

Recommended homepage structure:

Hero section  
Featured products  
Category navigation  
Product grid  

Agents must not assume additional marketing data exists.

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

Minimal JavaScript  
Lazy loading images  
Efficient Supabase queries  

Avoid adding heavy libraries unless necessary.

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

# Mentorship Requirement

The project owner is learning development.

Agents must:

Explain changes clearly  
Avoid unnecessary complexity  
Provide testing instructions  
Highlight potential mistakes

---

# Voice and Copy Rules

This storefront is a real Nairobi electronics shop.

All customer-facing text must sound like a real shop assistant, seller, or support team member.

Desired tone:

- Natural
- Calm
- Clear
- Practical
- Trustworthy
- Local
- Human

Avoid:

- Hype
- Fake urgency
- Corporate jargon
- Over-explaining
- Robotic phrasing
- SaaS-style marketing language
- Abstract UX or process language

Golden test:

- If it sounds like a UX designer wrote it, rewrite it.
- If it sounds like a shop assistant said it, keep it.

---

# Human Support Language Rule

Do not use process-style wording such as:

- browse on-site
- shortlist quickly
- switch to WhatsApp
- optimize your purchase journey
- seamless experience
- decision-making flow
- streamline checkout
- facilitate a smoother journey

Rewrite into direct human language such as:

- Message us on WhatsApp and one of our team will assist you
- If you need help, just reach out on WhatsApp
- We can help you confirm before you buy
- One of our team will attend to you
- You can talk to us directly before placing the order

---

# Frontend Content Rules

CTA labels:

Prefer:

- Browse Shop
- Confirm on WhatsApp
- Check availability
- Reserve now
- View details
- Create account
- Sign in

Avoid:

- Ask first
- Submit
- Proceed
- Start journey
- Continue flow

Trust language:

Prefer:

- In stock
- Limited stock
- Available on request
- Same-day Nairobi delivery available
- Pickup available at our Moi Avenue shop
- We will confirm before dispatch
- Tested and ready to use

Avoid:

- best-in-class
- seamless
- premium journey
- frictionless
- cutting-edge experience

Accounts and checkout:

- Always keep guest checkout clearly available where relevant.
- Accounts must feel optional and helpful, not required.

WhatsApp positioning:

- Present WhatsApp as optional, helpful, fast, and human.
- Prefer wording like "If you need help, message us on WhatsApp" or "One of our team will assist you."
- Avoid wording like "Switch to WhatsApp for faster decision-making" or "Use conversational commerce flow."

---

# Content Audit Expectation

Whenever editing user-facing pages or components, agents must:

- Check for AI-sounding or process-heavy language
- Simplify overly polished copy
- Remove fake urgency
- Tighten CTA wording
- Remove duplicate content
- Preserve the tone of a real local storefront

Review text in:

- `src/pages/**/*`
- `src/components/**/*`
- layouts
- auth/account/cart/checkout/support screens
- footer text
- metadata and descriptions
- API responses that users may see

If content sounds too perfect, too abstract, too formal, or too marketing-heavy, rewrite it.

---

# Copy Rewrite Requirement

When frontend copy sounds AI-generated, product-led, or process-heavy, rewrite it before finishing the task.

Agents must:

- Detect AI-sounding or UX-process wording
- Rewrite common bad phrases into direct human support language
- Keep the voice aligned with a real Nairobi electronics shop
- Prefer plain wording that sounds like a shop assistant speaking to a customer

Non-negotiable rule:

- If it sounds like marketing, rewrite it.

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
