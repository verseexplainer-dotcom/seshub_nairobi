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

Agents MUST NOT assume other categories exist unless they appear in the database.

If additional categories are added later, agents may extend the UI accordingly.

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
