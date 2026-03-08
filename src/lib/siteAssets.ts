const DEFAULT_SUPABASE_URL = 'https://jddjdebcuruzwxiwaqfq.supabase.co';
const SITE_ASSETS_BUCKET_PATH = '/storage/v1/object/public/site-assets';

const normalizeSupabaseUrl = (publicSupabaseUrl?: string) =>
  (publicSupabaseUrl || DEFAULT_SUPABASE_URL).replace(/\/$/, '');

export function getSiteAssets(publicSupabaseUrl?: string) {
  const base = `${normalizeSupabaseUrl(publicSupabaseUrl)}${SITE_ASSETS_BUCKET_PATH}`;

  return {
    base,
    logo: `${base}/ses-logo.png`,
    hero: `${base}/hero-image-3.webp`,
    categoryCards: {
      laptops: `${base}/laptop-category-card.webp`,
      desktops: `${base}/desktop-category-card.webp`,
      smartphones: `${base}/smartphones-category-card.webp`,
      printers: `${base}/printers-category-card.webp`,
      printersLegacy: `${base}/Printers-category-card.webp`,
      accessories: `${base}/accessories-category-card.webp`
    },
    trustIcons: {
      delivery: `${base}/delivery-icon.webp`,
      payments: `${base}/payments-secure-icon.webp`,
      security: `${base}/security-trust-icon.webp`
    },
    productPlaceholder: `${base}/product-placeholder.webp`
  };
}
