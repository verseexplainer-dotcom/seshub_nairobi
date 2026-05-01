# Project Guardrails

This file summarizes the rules agents and developers must keep in mind. The detailed source is `ai/AGENTS.md`.

## Platform

- Keep Astro configured for Cloudflare Workers.
- Keep API routes under `src/pages/api/*`.
- Do not introduce Supabase Edge Functions.
- Do not move writes to the browser.
- Do not weaken RLS assumptions.
- Keep TypeScript and vanilla CSS unless a change is explicitly approved.

## Product Data

Use the existing product schema:

- `cpu`
- `ram_gb`
- `storage_gb`
- `storage_type`
- `screen_in`
- `warranty_months`
- `in_stock`
- `stock_qty`
- `images`
- `image_overrides`

If a field is empty, hide that UI detail. Do not fabricate missing values.

## Images

Product image priority:

1. `image_overrides`
2. `images`
3. fallback image

Products should never render with broken images.

## Categories

Featured homepage categories:

- Laptops
- Smartphones
- Printers
- Desktops

Accessories remain available through search and category routes, but should not be featured on the homepage.

## Safety

Ask before:

- Changing database schema
- Deleting files
- Refactoring large areas of code
- Adding major dependencies
- Modifying production data
- Deploying to production

## Shop Assistant Tone

Customer-facing text must sound like:

- a helpful shop assistant
- a practical seller
- a real support team member

Customer-facing text must not sound like:

- AI-generated landing page copy
- SaaS marketing
- product or UX process language
- abstract ecommerce jargon

Rule:

- If it sounds like marketing, rewrite it.
- If it sounds like a real shop assistant, keep it.

## AI Language Detection Rules

Treat wording as suspicious if it:

- talks about journeys, flows, or optimization
- sounds too polished without saying anything practical
- uses hype instead of useful detail
- pushes WhatsApp as a conversion tactic instead of help
- explains the interface instead of helping the buyer

Examples to rewrite:

- "switch to WhatsApp"
- "shortlist quickly"
- "seamless experience"
- "decision-making flow"
- "optimize your purchase journey"

## Human Support Language Enforcement

Prefer:

- "If you need help, message us on WhatsApp"
- "One of our team will assist you"
- "We can help you confirm before you buy"
- "You can talk to us directly before placing the order"

Avoid:

- "Switch to WhatsApp for faster decision-making"
- "Use conversational commerce flow"
- "Browse on-site, shortlist quickly, then switch to WhatsApp"

## Full Audit Checklist

Whenever frontend copy changes, review:

- `src/pages/**/*`
- `src/components/**/*`
- layout text
- cart, checkout, account, and support screens
- metadata and page descriptions
- API messages that users may read

Check each change for:

- AI-sounding phrasing
- process-heavy wording
- fake urgency
- unclear CTA labels
- duplicate copy
- tone drift away from a real Nairobi store

## CTA Guardrail

Prefer:

- Browse Shop
- Confirm on WhatsApp
- Check availability
- Reserve now
- View details

Avoid:

- Ask first
- Submit
- Proceed
- Start journey
- Continue flow
