-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'growth', 'agency')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own row" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own row" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own row" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state CHAR(2) NOT NULL DEFAULT 'TX',
  zip TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT,
  license_number TEXT,
  gbp_connected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their businesses" ON businesses USING (auth.uid() = user_id);

-- ============================================================
-- LOCATIONS (Agency multi-location)
-- ============================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Location via business ownership" ON locations USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = locations.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('update', 'offer', 'event', 'tip')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts via business ownership" ON posts USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- REVIEW REQUESTS
-- ============================================================
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  job_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ
);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Review requests via business ownership" ON review_requests USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = review_requests.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded BOOLEAN NOT NULL DEFAULT FALSE,
  response_text TEXT,
  source TEXT NOT NULL DEFAULT 'google',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews via business ownership" ON reviews USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- KEYWORDS
-- ============================================================
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  current_rank INTEGER,
  previous_rank INTEGER,
  monthly_volume INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, keyword)
);

ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Keywords via business ownership" ON keywords USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = keywords.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- COMPETITORS
-- ============================================================
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_posts INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,1) NOT NULL DEFAULT 0,
  last_post_date TIMESTAMPTZ,
  threat_level TEXT NOT NULL DEFAULT 'medium' CHECK (threat_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competitors via business ownership" ON competitors USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = competitors.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- NAP LISTINGS
-- ============================================================
CREATE TABLE nap_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  directory_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unchecked' CHECK (status IN ('consistent', 'inconsistent', 'missing', 'unchecked')),
  issue TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, directory_name)
);

ALTER TABLE nap_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NAP listings via business ownership" ON nap_listings USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = nap_listings.business_id AND businesses.user_id = auth.uid())
);

-- ============================================================
-- TRIGGER: auto-create user profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'trial',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
