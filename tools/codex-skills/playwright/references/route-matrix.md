# Route Matrix

Use this matrix when adding browser-level checks for the storefront.

## Core shopper routes

- `/`
  - Expect the page to render, primary navigation to be visible, and hero or featured catalog content to load.
- `/shop`
  - Expect product cards, sort controls, and filter controls to render without console-breaking errors.
- `/category/laptops`
  - Expect breadcrumb, product count, and filtered catalog presentation to render.
- `/product/[known-slug]`
  - Expect product title, price, stock state, and add-to-cart or out-of-stock path to render.
- `/cart`
  - Expect cart shell to load and guest login prompt to appear when appropriate.

## Auth and access control

- `/auth/login`
  - Expect login form fields and next-path handling to render.
- `/account`
  - Expect signed-out users to be redirected to `/auth/login`.
- `/admin`
  - Expect signed-out users to be redirected and non-staff users to be blocked.

## Suggested evidence

- Capture one screenshot each for homepage, category, and product routes after major UI changes.
- Prefer assertions on visible headings, buttons, and price blocks over raw DOM structure.
- Keep selectors resilient: role, label, text, or explicit test ids if the repo adds them later.
