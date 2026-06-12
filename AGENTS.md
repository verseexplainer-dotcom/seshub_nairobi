# SES E-commerce Redesign Instructions

When working on the SES shop UI, follow these documentation files:

- docs/ses-ecommerce-design-guidelines.md
- docs/design.md
- docs/homepage-spec.md
- docs/product-page-spec.md
- docs/content-rules.md
- docs/data-quality-rules.md

## Priority areas

1. Homepage
2. Shop page
3. Product cards
4. Single product page

## Design direction

- Build mobile-first.
- Keep the SES brand style: white/light grey backgrounds, dark navy text, SES blue buttons, rounded cards, clean spacing.
- Make product images larger, cleaner, and more consistent.
- Product images are usually 1000 x 1000 px and should display well in square product cards.
- Use "Refurbished" instead of "Refurb".
- Use "In Stock" instead of "Stock".
- Do not duplicate savings or discount messages.
- Show clean product specs such as processor, RAM, storage, and display where available.
- Keep Add to Cart buttons clear and easy to tap.
- Keep WhatsApp/contact access available without covering important product actions.

## Do not change

Do not change checkout, payment, cart, order, Supabase, webhook, or API logic unless the UI change directly requires it.

Before finishing work, run available lint, test, or build commands if supported by the project.
