import type { User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'staff' | 'admin';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'refunded';

export type FulfillmentStatus =
  | 'new'
  | 'contacted'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderEventType =
  | 'order_created'
  | 'payment_status_updated'
  | 'fulfillment_status_updated'
  | 'note_added'
  | 'backfilled';

export interface RuntimeEnv {
  PUBLIC_SUPABASE_URL: string | undefined;
  PUBLIC_SUPABASE_ANON_KEY: string | undefined;
  PUBLIC_FALLBACK_IMAGE_URL?: string | undefined;
  PUBLIC_TURNSTILE_SITE_KEY?: string | undefined;
  PUBLIC_META_PIXEL_ID?: string | undefined;
  META_PIXEL_ID?: string | undefined;
  META_CAPI_TOKEN?: string | undefined;
  MESSENGER_VERIFY_TOKEN?: string | undefined;
  MESSENGER_PAGE_ACCESS_TOKEN?: string | undefined;
  FACEBOOK_APP_ID?: string | undefined;
  FACEBOOK_APP_SECRET?: string | undefined;
  WHATSAPP_TOKEN?: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY: string | undefined;
  TURNSTILE_SECRET_KEY?: string | undefined;
}

export interface SessionLocals {
  user: User | null;
  profile: ProfileRecord | null;
  isStaff: boolean;
  isAdmin: boolean;
  runtime?: {
    env?: RuntimeEnv;
  } & Record<string, unknown>;
}

export interface ProfileRecord {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  default_location: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string | null;
  product_title: string;
  product_slug: string | null;
  product_sku: string | null;
  product_image: string | null;
  unit_price_kes: number;
  qty: number;
  line_total_kes: number;
  created_at: string;
}

export interface OrderStatusEventRecord {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  event_type: OrderEventType;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  note: string | null;
  created_at: string;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  user_id: string | null;
  order_intent_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_location: string | null;
  subtotal_kes: number;
  total_kes: number;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  source: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRecord[];
  order_status_events?: OrderStatusEventRecord[];
}

export interface OrderIntentRecord {
  id: string;
  created_at: string;
  source_page: string | null;
  cart: unknown[];
  total_kes: number;
  customer_name: string;
  phone: string;
  location: string | null;
  consent: boolean;
  status: string;
}

export interface NewsletterSignupRecord {
  id: string;
  email: string;
  consent: boolean;
  created_at: string;
  source_page: string | null;
}

export interface EventRecord {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
}
