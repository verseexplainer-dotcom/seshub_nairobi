const SITE_ASSETS_BUCKET_PATH = '/storage/v1/object/public/site-assets';
const PRODUCT_IMAGES_BUCKET_PATH = '/storage/v1/object/public/product-images';
const LOCAL_SITE_ASSETS_PATH = '/site-assets';
const LOCAL_PRODUCT_IMAGES_PATH = '/product-images';

export interface AssetSource {
  src: string;
  fallback: string;
}

const normalizeSupabaseUrl = (publicSupabaseUrl?: string) => {
  const normalized = (publicSupabaseUrl || '').trim().replace(/\/$/, '');
  return normalized || null;
};

const encodeAssetPath = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const buildAssetSource = (filename: string, localBase: string, remoteBase?: string | null): AssetSource => {
  const encodedFilename = encodeAssetPath(filename);
  const localSrc = `${localBase}/${encodedFilename}`;

  return {
    src: localSrc,
    fallback: remoteBase ? `${remoteBase}/${encodedFilename}` : localSrc
  };
};

export function getSiteAssets(publicSupabaseUrl?: string) {
  const normalizedSupabaseUrl = normalizeSupabaseUrl(publicSupabaseUrl);
  const base = normalizedSupabaseUrl ? `${normalizedSupabaseUrl}${SITE_ASSETS_BUCKET_PATH}` : null;
  const siteAsset = (filename: string) => buildAssetSource(filename, LOCAL_SITE_ASSETS_PATH, base);
  const logo = siteAsset('ses-logo-2500px-by-2500px.svg');

  return {
    base,
    logo,
    logoFallback: logo.fallback,
    hero: siteAsset('hero-image.webp'),
    heroMoments: {
      primary: siteAsset('hero-image.webp'),
      secondary: siteAsset('hero-image-1.webp'),
      tertiary: siteAsset('hero-image-3.webp')
    },
    categoryCards: {
      laptops: siteAsset('laptop-category-card.webp'),
      desktops: siteAsset('desktop-category-card.webp'),
      smartphones: siteAsset('smartphones-category-card.webp'),
      printers: siteAsset('Printers-category-card.webp'),
      printersLegacy: siteAsset('Printers-category-card.webp'),
      accessories: siteAsset('accessories-category-card.webp')
    },
    trustIcons: {
      delivery: siteAsset('delivery-icon.webp'),
      payments: siteAsset('payments-secure-icon.webp'),
      security: siteAsset('security-trust-icon.webp')
    },
    productPlaceholder: siteAsset('product-placeholder.svg')
  };
}

export function getProductImageSources(
  image: string | undefined,
  publicSupabaseUrl?: string,
  placeholder?: AssetSource
): AssetSource {
  const fallbackPlaceholder = placeholder || getSiteAssets(publicSupabaseUrl).productPlaceholder;

  if (!image) {
    return fallbackPlaceholder;
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return {
      src: image,
      fallback: fallbackPlaceholder.fallback
    };
  }

  const normalizedImage = encodeAssetPath(image.replace(/^\/?(product-images\/)?/, ''));
  const normalizedSupabaseUrl = normalizeSupabaseUrl(publicSupabaseUrl);
  const base = normalizedSupabaseUrl ? `${normalizedSupabaseUrl}${PRODUCT_IMAGES_BUCKET_PATH}` : null;

  return {
    src: `${LOCAL_PRODUCT_IMAGES_PATH}/${normalizedImage}`,
    fallback: base ? `${base}/${normalizedImage}` : fallbackPlaceholder.src
  };
}

export function buildImageOnError(fallbackSrc: string, finalFallbackSrc?: string) {
  if (!finalFallbackSrc) {
    return `this.onerror=null;this.src=${JSON.stringify(fallbackSrc)};`;
  }

  return `if(this.dataset.fallbackApplied==='1'){this.onerror=null;this.src=${JSON.stringify(finalFallbackSrc)};}else{this.dataset.fallbackApplied='1';this.src=${JSON.stringify(fallbackSrc)};}`;
}
