-- SES ICT HUB Supabase Schema

-- 1) Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('laptops', 'printers', 'phones', 'accessories')),
    price_kes INT NOT NULL,
    compare_at_kes INT NULL,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    stock_qty INT NULL,
    brand TEXT NULL,
    condition TEXT NULL CHECK (condition IN ('brand_new', 'refurbished')),
    refurb_grade TEXT NULL CHECK (refurb_grade IN ('grade_a', 'grade_b', 'grade_c')),
    short_specs TEXT NULL,
    description TEXT NULL,
    warranty_months INT NULL CHECK (warranty_months IN (3, 6, 12)),
    images JSONB NOT NULL DEFAULT '[]',
    featured_home BOOLEAN NOT NULL DEFAULT FALSE,
    featured_rank INT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Order Intents Table
CREATE TABLE order_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source_page TEXT NULL,
    cart JSONB NOT NULL,
    total_kes INT NOT NULL,
    customer_name TEXT NULL,
    phone TEXT NULL,
    location TEXT NULL,
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed'))
);

-- 3) Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'
);

-- 4) Testimonials Table
CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    persona TEXT NOT NULL,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    quote TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5) Newsletter Signups Table
CREATE TABLE newsletter_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    source_page TEXT NULL
);

-- RLS POLICIES

-- Products: Public SELECT
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on products" ON products FOR SELECT USING (true);

-- Testimonials: Public SELECT where approved=true
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on approved testimonials" ON testimonials FOR SELECT USING (approved = true);

-- Order Intents: Public INSERT, deny SELECT, admin only via service role
ALTER TABLE order_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on order_intents" ON order_intents FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin only select on order_intents" ON order_intents FOR SELECT USING (false); -- Service role bypasses this

-- Events: Public INSERT, deny SELECT, admin only via service role
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin only select on events" ON events FOR SELECT USING (false);

-- Newsletter Signups: Public INSERT when consent=true, deny SELECT, admin only
ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on newsletter_signups with consent" ON newsletter_signups FOR INSERT WITH CHECK (consent = true);
CREATE POLICY "Admin only select on newsletter_signups" ON newsletter_signups FOR SELECT USING (false);
