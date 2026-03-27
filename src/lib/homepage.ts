import type { HomeTestimonial } from './homepageContent';
import { getProductBrand } from './productPresentation';

type HomepageTestimonialRow = {
  id?: unknown;
  name?: unknown;
  persona?: unknown;
  rating?: unknown;
  quote?: unknown;
};

export function buildHomepageTestimonials(
  rows: HomepageTestimonialRow[] | null | undefined,
  limit = 6
): HomeTestimonial[] {
  const testimonials: HomeTestimonial[] = [];
  const seenTestimonials = new Set<string>();

  for (const item of rows ?? []) {
    const testimonialId = item.id == null ? null : typeof item.id === 'string' ? item.id : String(item.id);
    const testimonial: HomeTestimonial = {
      name: String(item.name ?? '').trim(),
      persona: String(item.persona ?? '').trim(),
      rating: Math.max(1, Math.min(5, Number(item.rating || 5))),
      quote: String(item.quote ?? '').trim()
    };

    if (testimonialId) {
      testimonial.id = testimonialId;
    }

    const testimonialKey = `${testimonial.name.toLowerCase()}::${testimonial.persona.toLowerCase()}`;
    if (!testimonial.name || !testimonial.quote || seenTestimonials.has(testimonialKey)) {
      continue;
    }

    seenTestimonials.add(testimonialKey);
    testimonials.push(testimonial);

    if (testimonials.length === limit) {
      break;
    }
  }

  return testimonials;
}

export function countExplicitBrands(products: Array<Record<string, unknown>>) {
  return new Set(
    products
      .map((product) => getProductBrand(product))
      .filter(Boolean)
  ).size;
}
