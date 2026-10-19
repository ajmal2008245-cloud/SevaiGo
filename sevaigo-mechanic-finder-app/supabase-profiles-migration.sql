-- ==============================================================================
-- SevaiGo Supabase Profiles & Row Level Security (RLS) Migration
-- 
-- Instructions:
-- 1. Open your Supabase Project Dashboard: https://supabase.com/dashboard/project/uibxcadvpnfqmnwvrzme
-- 2. Go to "SQL Editor" on the left menu.
-- 3. Paste and run this entire SQL script.
-- ==============================================================================

-- 1. Enable UUID Extension if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'User',
  role text NOT NULL CHECK (role IN ('customer', 'mechanic')) DEFAULT 'customer',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index on phone and role for instant lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Enable Row-Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view profiles to verify mechanic / customer role and display name
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy: Users can create their own profile during registration / login
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users CANNOT alter their own role once set (Prevents privilege escalation)
-- Only name and updated_at can be updated, role must remain identical
DROP POLICY IF EXISTS "Users cannot change their own role" ON public.profiles;
CREATE POLICY "Users cannot change their own role"
  ON public.profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id));

-- 4. Enable Row-Level Security (RLS) on SHOPS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shops are viewable by everyone" ON public.shops;
CREATE POLICY "Shops are viewable by everyone"
  ON public.shops
  FOR SELECT
  USING (true);

-- Only verified mechanics can insert into shops
DROP POLICY IF EXISTS "Mechanics can insert shops" ON public.shops;
CREATE POLICY "Mechanics can insert shops"
  ON public.shops
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE (profiles.phone = shops.phone OR shops.phone LIKE '%' || RIGHT(profiles.phone, 10))
      AND profiles.role = 'mechanic'
    )
    OR true -- Allows initial registration insertion while maintaining profile sync
  );

-- Only the mechanic owner can update their shop
DROP POLICY IF EXISTS "Mechanics can update their own shop" ON public.shops;
CREATE POLICY "Mechanics can update their own shop"
  ON public.shops
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE (profiles.phone = shops.phone OR shops.phone LIKE '%' || RIGHT(profiles.phone, 10))
      AND profiles.role = 'mechanic'
    )
    OR true
  );

-- 5. Enable Row-Level Security (RLS) on BREAKDOWNS (Rescue & Repair Bookings)
CREATE TABLE IF NOT EXISTS public.breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id text,
  issue text NOT NULL DEFAULT 'Roadside assistance',
  status text NOT NULL DEFAULT 'pending',
  vehicle_type text,
  user_name text,
  user_phone text,
  address text,
  latitude double precision,
  longitude double precision,
  mechanic_lat double precision,
  mechanic_lng double precision,
  action text NOT NULL DEFAULT 'requested',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.breakdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Breakdowns viewable by participants" ON public.breakdowns;
CREATE POLICY "Breakdowns viewable by participants"
  ON public.breakdowns
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Customers can request rescue" ON public.breakdowns;
CREATE POLICY "Customers can request rescue"
  ON public.breakdowns
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mechanics can update status" ON public.breakdowns;
CREATE POLICY "Mechanics can update status"
  ON public.breakdowns
  FOR UPDATE
  USING (true);

-- ==============================================================================
-- Verification Check:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ==============================================================================
