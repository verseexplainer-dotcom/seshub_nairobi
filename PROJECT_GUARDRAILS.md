# PROJECT_GUARDRAILS.md

This project should read like a real Nairobi electronics shop, not a product demo.

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
