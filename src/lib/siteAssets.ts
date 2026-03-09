const SITE_ASSETS_BUCKET_PATH = '/storage/v1/object/public/site-assets';
const LOCAL_FALLBACK_ASSET = '/product-placeholder.svg';

const normalizeSupabaseUrl = (publicSupabaseUrl?: string) => {
  const normalized = (publicSupabaseUrl || '').trim().replace(/\/$/, '');
  return normalized || null;
};

export function getSiteAssets(publicSupabaseUrl?: string) {
  const normalizedSupabaseUrl = normalizeSupabaseUrl(publicSupabaseUrl);
  const base = normalizedSupabaseUrl ? `${normalizedSupabaseUrl}${SITE_ASSETS_BUCKET_PATH}` : null;
  const asset = (filename: string) => (base ? `${base}/${filename}` : LOCAL_FALLBACK_ASSET);

  return {
    base,
    logo: asset('ses-ict-hub-logo-1.svg'),
    logoFallback: asset('ses-logo.png'),
    hero: asset('hero-image.webp'),
    categoryCards: {
      laptops: asset('laptop-category-card.webp'),
      desktops: asset('desktop-category-card.webp'),
      smartphones: asset('smartphones-category-card.webp'),
      printers: asset('printers-category-card.webp'),
      printersLegacy: asset('Printers-category-card.webp'),
      accessories: asset('accessories-category-card.webp')
    },
    trustIcons: {
      delivery: asset('delivery-icon.webp'),
      payments: asset('payments-secure-icon.webp'),
      security: asset('security-trust-icon.webp')
    },
    productPlaceholder: asset('product-placeholder.webp')
  };
}
