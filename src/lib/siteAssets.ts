const SITE_ASSETS_BUCKET_PATH = '/storage/v1/object/public/site-assets';
const PRODUCT_IMAGES_BUCKET_PATH = '/storage/v1/object/public/product-images';
const LOCAL_SITE_ASSETS_PATH = '/site-assets';
const LOCAL_PRODUCT_IMAGES_PATH = '/product-images';

export interface AssetSource {
  src: string;
  fallback: string;
}

interface AssetOptions {
  preferRemote?: boolean;
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

const buildAssetSource = (
  filename: string,
  localBase: string,
  remoteBase?: string | null,
  options: AssetOptions = {}
): AssetSource => {
  const encodedFilename = encodeAssetPath(filename);
  const localSrc = `${localBase}/${encodedFilename}`;
  const remoteSrc = remoteBase ? `${remoteBase}/${encodedFilename}` : localSrc;

  if (options.preferRemote && remoteBase) {
    return {
      src: remoteSrc,
      fallback: localSrc
    };
  }

  return {
    src: localSrc,
    fallback: remoteSrc
  };
};

const BRAND_LOGO_FILENAMES = {
  apple: 'brands/apple-brand.webp',
  asus: 'brands/asus-brand.webp',
  canon: 'brands/canon-brand.webp',
  dell: 'brands/dell-brand.webp',
  epson: 'brands/epson-brand.webp',
  hp: 'brands/hp-brand.webp',
  lenovo: 'brands/lenovo-brand.webp',
  pixel: 'brands/pixel-brand.webp',
  samsung: 'brands/Samsung-brand-.webp'
} as const;

type BrandLogoKey = keyof typeof BRAND_LOGO_FILENAMES;

function normalizeBrandLogoKey(brand: string | null | undefined): BrandLogoKey | null {
  const normalized = (brand || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 'hp' || normalized.includes('hewlett')) {
    return 'hp';
  }

  if (normalized.includes('dell')) {
    return 'dell';
  }

  if (normalized.includes('lenovo')) {
    return 'lenovo';
  }

  if (normalized.includes('asus')) {
    return 'asus';
  }

  if (normalized.includes('samsung')) {
    return 'samsung';
  }

  if (normalized.includes('apple')) {
    return 'apple';
  }

  if (normalized.includes('canon')) {
    return 'canon';
  }

  if (normalized.includes('epson')) {
    return 'epson';
  }

  if (normalized.includes('pixel') || normalized.includes('google')) {
    return 'pixel';
  }

  return null;
}

export function getSiteAssets(publicSupabaseUrl?: string) {
  const normalizedSupabaseUrl = normalizeSupabaseUrl(publicSupabaseUrl);
  const base = normalizedSupabaseUrl ? `${normalizedSupabaseUrl}${SITE_ASSETS_BUCKET_PATH}` : null;
  const siteAsset = (filename: string) => buildAssetSource(filename, LOCAL_SITE_ASSETS_PATH, base);
  const remoteSiteAsset = (filename: string) => buildAssetSource(filename, LOCAL_SITE_ASSETS_PATH, base, { preferRemote: true });
  const logo = siteAsset('ses-logo-2500px-by-2500px.svg');

  return {
    base,
    logo,
    logoFallback: logo.fallback,
    hero: siteAsset('hero-laptops3.webp'),
    heroMoments: {
      primary: siteAsset('hero-laptops3.webp'),
      secondary: siteAsset('hero-desktops.webp'),
      tertiary: siteAsset('hero-printers.webp')
    },
    homeHero: {
      laptops: siteAsset('hero-laptops3.webp'),
      laptopsAlt: siteAsset('hero lenovo laptops.webp'),
      desktops: siteAsset('hero-desktops.webp'),
      desktopsAlt: siteAsset('hero-desktops1.webp'),
      printers: siteAsset('hero-printers.webp'),
      accessories: siteAsset('hero-laptop and accessories.webp')
    },
    categoryCards: {
      laptops: siteAsset('category-laptops.webp'),
      desktops: siteAsset('category-desktops.webp'),
      smartphones: siteAsset('category-smartphones.webp'),
      printers: siteAsset('category-printers.webp'),
      printersLegacy: siteAsset('category-printers.webp'),
      accessories: siteAsset('product-placeholder.webp')
    },
    homeBanners: {
      businessLaptops: siteAsset('banner-business-laptops.webp'),
      zbookWorkstations: siteAsset('banner-zbook-workstations.webp'),
      officeSetup: siteAsset('banner-office-setup.webp')
    },
    homeLifestyle: {
      primary: siteAsset('lifestyle-series.webp'),
      secondary: siteAsset('lifestyle-series2.webp'),
      tertiary: siteAsset('lifestyle-series (2).webp')
    },
    trustIcons: {
      delivery: siteAsset('delivery-icon.webp'),
      payments: siteAsset('payments-secure-icon.webp'),
      security: siteAsset('security-trust-icon.webp')
    },
    paymentMarks: {
      visa: remoteSiteAsset('visa.webp'),
      mastercard: remoteSiteAsset('mastercard-brand.webp')
    },
    brandLogos: {
      apple: siteAsset(BRAND_LOGO_FILENAMES.apple),
      asus: siteAsset(BRAND_LOGO_FILENAMES.asus),
      canon: siteAsset(BRAND_LOGO_FILENAMES.canon),
      dell: siteAsset(BRAND_LOGO_FILENAMES.dell),
      epson: siteAsset(BRAND_LOGO_FILENAMES.epson),
      hp: siteAsset(BRAND_LOGO_FILENAMES.hp),
      lenovo: siteAsset(BRAND_LOGO_FILENAMES.lenovo),
      pixel: siteAsset(BRAND_LOGO_FILENAMES.pixel),
      samsung: siteAsset(BRAND_LOGO_FILENAMES.samsung)
    },
    campaigns: {
      cashOnDelivery: remoteSiteAsset('cash-on-delivery-ses-brand.webp')
    },
    productPlaceholder: siteAsset('product-placeholder.svg')
  };
}

export function getBrandLogoSource(brand: string | null | undefined, publicSupabaseUrl?: string) {
  const key = normalizeBrandLogoKey(brand);
  if (!key) {
    return null;
  }

  return getSiteAssets(publicSupabaseUrl).brandLogos[key];
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
  const localSrc = `${LOCAL_PRODUCT_IMAGES_PATH}/${normalizedImage}`;
  const remoteSrc = base ? `${base}/${normalizedImage}` : null;

  return {
    src: remoteSrc || localSrc,
    fallback: localSrc
  };
}

export function buildImageOnError(fallbackSrc: string, finalFallbackSrc?: string) {
  if (!finalFallbackSrc) {
    return `this.onerror=null;this.src=${JSON.stringify(fallbackSrc)};`;
  }

  return `if(this.dataset.fallbackApplied==='1'){this.onerror=null;this.src=${JSON.stringify(finalFallbackSrc)};}else{this.dataset.fallbackApplied='1';this.src=${JSON.stringify(fallbackSrc)};}`;
}
