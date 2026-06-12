export interface CatalogProduct {
  id?: string | undefined;
  slug: string;
  title: string;
  category: string;
  categories?: string[] | null;
  brand?: string | null;
  price_kes: number;
  compare_at_kes?: number | null;
  compare_at_price?: number | null;
  short_specs?: string | null;
  short_description?: string | null;
  description?: string | null;
  description_html?: string | null;
  condition?: string | null;
  refurb_grade?: string | null;
  warranty_months?: number | null;
  warranty?: string | null;
  stock_status?: string | null;
  in_stock?: boolean | null;
  stock_qty?: number | null;
  parsed_specs_json?: Record<string, unknown> | null;
  images?: string[] | string | null;
  image_overrides?: string[] | string | null;
  featured_home?: boolean | null;
  featured_rank?: number | null;
  sku?: string | null;
  status?: string | null;
  cpu?: string | null;
  ram_gb?: number | null;
  storage_gb?: number | null;
  storage_type?: string | null;
  screen_in?: number | null;
  collections?: string[] | null;
  tags?: string[] | null;
  seo_title?: string | null;
  meta_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HomepageCategoryCount {
  key:
    | 'laptops'
    | 'gaming-laptops'
    | 'smartphones'
    | 'printers'
    | 'desktops'
    | 'accessories'
    | 'storage'
    | 'monitors'
    | 'projectors'
    | 'tablets'
    | 'software'
    | 'ups'
    | 'networking';
  label: string;
  description: string;
  count: number;
  href: string;
  accent: string;
}

export interface HomepageBrandCount {
  brand: string;
  count: number;
  href: string;
}

export interface HomepageUseCaseCollection {
  id: string;
  title: string;
  description: string;
  href: string;
  products: CatalogProduct[];
}
