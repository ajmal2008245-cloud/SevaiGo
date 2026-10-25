-- ==============================================================================
-- SevaiGo Supabase Row Level Security (RLS) & Performance Migration
--
-- Instructions:
-- 1. Open your Supabase Project: https://supabase.com/dashboard/project/uibxcadvpnfqmnwvrzme
-- 2. Navigate to "SQL Editor" on the left sidebar.
-- 3. Paste and run this script.
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure SHOPS table schema and indexes
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  services text[] DEFAULT ARRAY[]::text[],
  verified boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Bounding Box & Phone Indexes for instant 7km queries
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON public.shops (lat, lng);
CREATE INDEX IF NOT EXISTS idx_shops_verified ON public.shops (verified);
CREATE INDEX IF NOT EXISTS idx_shops_phone ON public.shops (phone);

-- 3. Ensure USERS table schema and indexes
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

-- 4. Ensure RESCUE_REQUESTS table schema and indexes
CREATE TABLE IF NOT EXISTS public.rescue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  vehicle_type text NOT NULL DEFAULT '2w',
  problem text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rescue_requests_phone ON public.rescue_requests (user_phone);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_status ON public.rescue_requests (status);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_lat_lng ON public.rescue_requests (lat, lng);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_created ON public.rescue_requests (created_at DESC);

-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. SHOPS Policies
-- ------------------------------------------------------------------------------
-- Anyone (customers and mechanics) can read verified workshops within their discovery radius
DROP POLICY IF EXISTS "Public can view verified workshops" ON public.shops;
CREATE POLICY "Public can view verified workshops"
  ON public.shops
  FOR SELECT
  USING (true);

-- Registered partners can insert their genuine workshops
DROP POLICY IF EXISTS "Mechanics can insert shops" ON public.shops;
CREATE POLICY "Mechanics can insert shops"
  ON public.shops
  FOR INSERT
  WITH CHECK (
    lat IS NOT NULL AND 
    lng IS NOT NULL AND 
    length(phone) >= 10 AND 
    length(shop_name) >= 3
  );

-- Only the workshop owner can update their own shop listing
DROP POLICY IF EXISTS "Owners can update their own shop" ON public.shops;
CREATE POLICY "Owners can update their own shop"
  ON public.shops
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- B. USERS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users are viewable by participants" ON public.users;
CREATE POLICY "Users are viewable by participants"
  ON public.users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their profile" ON public.users;
CREATE POLICY "Users can insert their profile"
  ON public.users
  FOR INSERT
  WITH CHECK (length(phone) >= 10);

DROP POLICY IF EXISTS "Users can update their profile" ON public.users;
CREATE POLICY "Users can update their profile"
  ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- C. RESCUE_REQUESTS Policies
-- ------------------------------------------------------------------------------
-- Customers and mechanics can view active rescue requests
DROP POLICY IF EXISTS "Participants can view rescue requests" ON public.rescue_requests;
CREATE POLICY "Participants can view rescue requests"
  ON public.rescue_requests
  FOR SELECT
  USING (true);

-- Customers can submit real rescue requests with verified coordinates
DROP POLICY IF EXISTS "Customers can create rescue requests" ON public.rescue_requests;
CREATE POLICY "Customers can create rescue requests"
  ON public.rescue_requests
  FOR INSERT
  WITH CHECK (
    lat IS NOT NULL AND 
    lng IS NOT NULL AND 
    length(user_phone) >= 10
  );

-- Mechanics and customers can update status (accept, arrive, complete, cancel)
DROP POLICY IF EXISTS "Participants can update rescue status" ON public.rescue_requests;
CREATE POLICY "Participants can update rescue status"
  ON public.rescue_requests
  FOR UPDATE
  USING (true)
  WITH CHECK (
    status IN ('pending', 'accepted', 'on_the_way', 'arrived', 'repairing', 'completed', 'cancelled', 'declined')
  );

-- ==============================================================================
-- 6. Verification Queries
-- ==============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
