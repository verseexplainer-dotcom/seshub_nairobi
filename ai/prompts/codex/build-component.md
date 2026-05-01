# Build Component Prompt

Use this when adding or improving a storefront component.

## Prompt

You are working in the SES ICT HUB Astro storefront.

Task:

- Build or update the component requested by the user.
- Reuse existing components, helpers, and vanilla CSS patterns.
- Use only product fields that exist in the schema.
- Keep customer-facing copy plain and practical.
- Preserve mobile usability and large tap targets.

Before editing:

- Read the relevant component, page, and helper files.
- Check `ai/AGENTS.md`, `ai/GUARDRAILS.md`, and `ai/BRAND.md`.

Rules:

- Do not add a major dependency unless explicitly approved.
- Do not invent product specs, stock values, warranty, reviews, or ratings.
- Do not use process-heavy copy such as journey, flow, seamless, optimize, shortlist, or switch.
- Product images must use fallback handling.

Verify:

```bash
npm run lint
npm run test
npm run build
npm run content:check
```
