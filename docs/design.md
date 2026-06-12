# SES ICT HUB Design System

This visual direction is inspired by Shopify's dark-first presentation style, adapted for a Nairobi electronics storefront. It should guide layout, color, typography, and interaction design, while `ai/BRAND.md` remains the source for shop voice and customer-facing copy.

Do not copy Shopify logos, trademarks, exact branded assets, or product claims. Use the dark, premium, commerce-focused design language with SES ICT HUB content, real catalog data, and practical shop-assistant wording.

## 1. Visual Theme & Atmosphere

The storefront should use a dark-first, premium electronics feel: near-black surfaces with deep forest-teal undertones, crisp white text, and a restrained neon green accent. The goal is to make laptops, phones, printers, desktops, and accessories feel carefully presented without sounding like SaaS marketing.

Key characteristics:

- Dark-first design with deep forest-teal undertones, not flat pure black everywhere.
- Large, light-weight display typography for hero and section headings.
- Neon Green (`#36F4A4`) as a precise accent for focus rings, active states, and small highlights.
- Full-pill buttons for primary actions.
- Layered shadows and subtle borders for depth on dark surfaces.
- Product images should sit inside dark, polished commerce UI contexts.
- Neutral zinc-like grays should handle secondary text and quiet details.

## 2. Color Palette & Roles

### Primary

- Shopify White (`#FFFFFF`): Primary text on dark surfaces, button fills, high-contrast elements.
- Shopify Black (`#000000`): Root dark background, button text on white, maximum contrast base.

### Secondary & Accent

- Neon Green (`#36F4A4`): Signature accent for focus rings, interactive highlights, active state indicators.
- Aloe (`#C1FBD4`): Soft green wash for decorative backgrounds and atmospheric panels.
- Pistachio (`#D4F9E0`): Light green tint for subtle surface differentiation.

### Surface & Background

- Void (`#000000`): Root page background.
- Deep Teal (`#02090A`): Card surfaces and content containers.
- Dark Forest (`#061A1C`): Section backgrounds with visible green character.
- Forest (`#102620`): Elevated dark surfaces and header backgrounds.
- Dark Card Border (`#1E2C31`): Card borders on dark surfaces.

### Neutrals & Text

- Shade-30 (`#D4D4D8`): Light neutral borders on dark.
- Muted Text (`#A1A1AA`): Secondary text, metadata, descriptions.
- Shade-50 (`#71717A`): Tertiary text and quiet labels.
- Shade-60 (`#52525B`): Disabled text and decorative neutrals.
- Shade-70 (`#3F3F46`): Subtle dividers and UI boundaries.
- Light Border (`#E4E4E7`): Borders on rare light surfaces.

### Link Variants

- Link Muted (`#9797A2`)
- Link Sage (`#9DABAD`)
- Link Lavender (`#BDBDCA`)
- Link Mint (`#99B3AD`)

### Gradients

- Dark Teal Wash: radial gradient from `#102620` center to `#02090A` edge.
- Green Atmospheric: subtle green-tinted ambient gradients behind hero sections.
- Spotlight: focused bright area fading to black for product showcase lighting.

## 3. Typography Rules

### Font Family

Display:

- Preferred: NeueHaasGrotesk if licensed and available.
- Fallbacks: Helvetica, Arial, sans-serif.
- OpenType features: `ss03` where available.
- Use for headings, hero text, and large display elements.

Body:

- Preferred: Inter Variable.
- Fallbacks: Helvetica, Arial, sans-serif.
- OpenType features: `ss03` where available.
- Use for body text, links, buttons, and UI elements.

Mono:

- `ui-monospace`, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New.
- Use for code snippets, data labels, and technical content.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- |
| Display XL | 96px | 400 | 1.00 | 0 | Hero headlines |
| Display Light | 96px | 330 | 0.96 | 0 | Ethereal display |
| Heading 1 | 70px | 330 | 1.00 | 0 | Section titles |
| Heading 2 | 55px | 330 | 1.16 | 0 | Subsections |
| Heading 3 | 48px | 330 | 1.14 | 0 | Feature titles |
| Heading 4 | 32px | 360 | 1.14 | 0.32px | Card headings |
| Heading 5 | 28px | 500 | 1.28 | 0.42px | Small headings |
| Body Large | 20px | 500 | 1.40 | 0.3px | Lead paragraphs |
| Body | 18px | 400 | 1.56 | 0 | Standard body |
| Body Small | 16px | 400 | 1.50 | 0 | Compact body |
| Button | 16px | 400 | 1.50 | 0 | CTA text |
| Nav Link | 18px | 500 | 1.25 | 0.72px | Navigation |
| Caption | 14px | 500 | 1.49 | 0.28px | Metadata |
| Overline | 15px | 400 | 1.50 | 1.54px | Wide-tracked labels |
| Label | 12px | 400 | 1.20 | 0.72px | Uppercase labels |
| Code | 16px | 400 | 1.50 | 0 | Code blocks |

Principles:

- Display text should feel large, light, and calm.
- Avoid heavy headline weights unless the content needs strong emphasis.
- Keep body copy practical and readable.
- Do not use negative letter-spacing. The wider project frontend rules require neutral or positive tracking.

## 4. Component Styling

### Buttons

Primary:

- Background: `#FFFFFF`
- Text: `#000000`
- Border: 2px solid transparent
- Border radius: `9999px`
- Padding: 12px 26px 12px 16px
- Focus: 2px `#36F4A4` outline
- Transition: all 200ms ease

Secondary:

- Background: transparent
- Text: `#FFFFFF`
- Border: 2px solid `#FFFFFF`
- Border radius: `9999px`
- Hover: white background with black text
- Focus: 2px `#36F4A4` outline

Badge or tag:

- Background: `rgba(255, 255, 255, 0.2)`
- Text: `#FFFFFF`
- Border radius: 4px
- Padding: 12px 16px

### Cards & Containers

- Background: Deep Teal (`#02090A`)
- Border: 1px solid `#1E2C31`
- Border radius: 8px standard, 12px featured, 20px for top-rounded panels.
- Shadow:
  - `rgba(0,0,0,0.1) 0 0 0 1px`
  - `rgba(0,0,0,0.1) 0 2px 2px`
  - `rgba(0,0,0,0.1) 0 4px 4px`
  - `rgba(0,0,0,0.1) 0 8px 8px`
  - `rgba(255,255,255,0.03) 0 1px 0 inset`
- Hover: slightly brighter surface, expanded shadow, small lift.

### Inputs & Forms

- Background: transparent or Dark Forest (`#061A1C`)
- Text: `#FFFFFF`
- Border: 1px solid `#3F3F46`
- Border radius: 8px
- Padding: 12px 16px
- Focus: 2px solid `#36F4A4`
- Placeholder: `#71717A`

### Navigation

- Background: transparent over dark hero; Forest (`#102620`) when elevated or sticky.
- Height: around 64px.
- Links: 18px / 500, white, 0.72px letter-spacing.
- CTA: white pill button.
- Mobile: hamburger menu with dark overlay.

### Image Treatment

- Product screenshots and product photos should sit inside dark containers.
- Use subtle card borders instead of bright frames.
- Use dark placeholder surfaces while images load.
- Maintain aspect ratios and avoid broken image states.

### Trust Indicators

- Use practical trust points: warranty, tested devices, pickup, Nairobi delivery, stock confirmation.
- Do not invent review counts, buyer counts, ratings, or years unless backed by real data.

## 5. Layout Principles

Base spacing unit: 8px.

| Token | Value | Use |
| --- | --- | --- |
| space-1 | 4px | Tight inline gaps |
| space-2 | 8px | Base unit |
| space-3 | 12px | Card padding |
| space-4 | 16px | Standard padding |
| space-5 | 24px | Card gaps |
| space-6 | 28px | Medium spacing |
| space-7 | 32px | Section breaks |
| space-8 | 36px | Large padding |
| space-9 | 40px | Major section padding |
| space-10 | 64px | Hero padding and large gaps |

Grid and container:

- Max container width: around 1280px.
- Desktop horizontal padding: 64px.
- Tablet horizontal padding: 32px.
- Mobile horizontal padding: 16px.
- Major content gap: 24px to 32px.

Whitespace:

- Use large dark breathing room between major sections.
- Keep content inside each section dense enough to scan quickly.
- Do not make operational ecommerce screens feel like landing-page posters.

Border radius:

- 4px: tags and badges.
- 8px: standard cards and inputs.
- 12px: featured cards and image containers.
- 20px: large panels.
- 9999px: pill buttons, pill badges, nav pills.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Base | No shadow, dark surface | Page background |
| Subtle | 1px ring plus inset white glow | Resting cards |
| Medium | 1px ring plus 2px, 4px, 8px shadow stack | Elevated cards |
| High | `rgba(0,0,0,0.25) 0 25px 50px -12px` | Modals and overlays |
| Focus | `0 0 0 2px #36F4A4` | Keyboard focus |

Decorative depth:

- Dark teal gradients.
- Spotlight effects behind product showcases.
- Subtle edge glow via inset shadow.
- Green atmospheric halos used sparingly.

## 7. Do's And Don'ts

Do:

- Use the dark teal-black hierarchy: Void, Deep Teal, Dark Forest, Forest.
- Keep display typography light.
- Use Neon Green only for precise highlights and focus states.
- Use pill buttons for CTAs.
- Use layered shadows for card depth.
- Keep section pacing spacious on marketing surfaces.
- Keep product facts tied to real catalog data.

Don't:

- Do not copy Shopify logos, layouts pixel-for-pixel, or branded assets.
- Do not use green accents across large surfaces.
- Do not introduce warm decorative palettes.
- Do not add bright page backgrounds as the main theme.
- Do not use single-layer shadows for featured dark cards.
- Do not invent stats, prices, stock levels, ratings, or product specs.
- Do not let the visual style override the Nairobi shop-assistant voice.

## 8. Responsive Behavior

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | <640px | Single column, 16px padding, large tap targets |
| Tablet | 640-1024px | 2-column grids begin, 32px padding |
| Desktop | 1024-1440px | Expanded nav, full layout, 64px padding |
| Large Desktop | >1440px | Centered max-width container |

Touch targets:

- Minimum target: 44px by 44px.
- Pill buttons: 48px height minimum.
- Nav links: 44px touch area.
- Linked cards: the full card should be tappable where practical.

Collapsing strategy:

- Navigation: horizontal links to hamburger below desktop width.
- Hero: large display text scales down on mobile.
- Feature sections: 2-column to stacked single column below tablet.
- Stats: horizontal row to stacked on mobile.
- Cards: responsive grid to full-width stack where needed.

## 9. Agent Prompt Guide

Quick color reference:

- Primary CTA: `#FFFFFF`
- Page background: `#000000`
- Card surface: `#02090A`
- Section background: `#061A1C`
- Elevated background: `#102620`
- Accent: `#36F4A4`
- Body text: `#FFFFFF`
- Muted text: `#A1A1AA`
- Border dark: `#1E2C31`

When refining screens:

1. Work on one component at a time.
2. Reference specific color names and hex codes from this document.
3. Keep the design dark-first.
4. Keep display text light in weight.
5. Use Neon Green sparingly.
6. Use the dark surface hierarchy for depth.
7. Use layered shadows, not flat single shadows.
8. Keep customer-facing copy aligned with `ai/BRAND.md`.
