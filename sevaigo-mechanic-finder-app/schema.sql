-- =======================================================
-- SevaiGo Full PostgreSQL / Supabase Database Schema
-- Run this script in your Supabase Project -> SQL Editor
-- =======================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'SevaiGo User',
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  password text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Upgrade columns if users table was created from a partial schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'SevaiGo User';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL
);

-- 3. Mechanics / Garages Table
CREATE TABLE IF NOT EXISTS mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  owner_photo text NOT NULL DEFAULT '/images/owner-1.jpg',
  phone text NOT NULL,
  address text NOT NULL,
  city text,
  pincode text,
  shop_phone text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  vehicle_types text[] NOT NULL,
  specializations text[] NOT NULL,
  working_days text[],
  open_time text NOT NULL DEFAULT '08:00',
  close_time text NOT NULL DEFAULT '21:00',
  rating double precision NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  photos text[] NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  availability_status text NOT NULL DEFAULT 'free',
  price_min integer NOT NULL DEFAULT 300,
  price_max integer NOT NULL DEFAULT 2500,
  years_experience integer NOT NULL DEFAULT 1,
  business_doc text,
  spare_parts text[],
  is_online boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_mechanic_unique ON reviews (user_id, mechanic_id);

-- 5. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mechanic_id)
);

-- 6. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  type text NOT NULL,
  registration text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. Roadside Breakdowns / Rescue Requests Table
CREATE TABLE IF NOT EXISTS breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  issue text NOT NULL DEFAULT 'Roadside assistance',
  status text NOT NULL DEFAULT 'pending',
  vehicle_type text,
  user_name text,
  user_phone text,
  address text,
  notes text,
  photo_url text,
  spare_parts text[],
  latitude double precision,
  longitude double precision,
  mechanic_lat double precision,
  mechanic_lng double precision,
  eta_minutes integer,
  action text NOT NULL DEFAULT 'called',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 9. Supabase Client Sync Table (for frontend real-time sync)
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  lat double precision,
  lng double precision,
  services text[],
  verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 10. Initial Seed Data (Verified Mechanics)
INSERT INTO mechanics (
  id, slug, shop_name, owner_name, owner_photo, phone, address, city, pincode, shop_phone,
  latitude, longitude, vehicle_types, specializations, working_days, open_time, close_time,
  rating, review_count, photos, is_verified, approval_status, availability_status, price_min,
  price_max, years_experience, is_online
) VALUES
(
  'e817617c-f8e4-4fac-8390-37dfc55fe2b9', 'karthik-auto-care-438c78',
  'Karthik Auto Care', 'Karthik Raja', '/images/owner-1.jpg',
  '9840112233', '12 Anna Salai, Guindy, Chennai', 'Chennai', '600032', '9840112233',
  13.0067, 80.2023, ARRAY['2w', '4w'], ARRAY['Engine repair', 'Tyre & puncture', 'Battery'],
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], '08:30', '20:30',
  4.9, 28, ARRAY['/images/workshop-1.jpg'], true, 'approved', 'available', 250, 2500, 3, true
),
(
  '3d6dea57-793b-4102-b25b-c430315dd350', 'ajju-motors-9536a1',
  'ajju motors', 'Ajmal huusain u', '/images/owner-1.jpg',
  '8667084522', 'gobichettipalayam,nallagoundanpalayam', 'erode', '638452', '8667084522',
  11.454111, 77.414657, ARRAY['2w', '4w'], ARRAY['Engine repair', 'General service & Oil change', 'Tyre & puncture'],
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], '08:00', '21:00',
  4.7, 12, ARRAY['/images/workshop-1.jpg'], true, 'approved', 'available', 250, 2500, 6, true
),
(
  '1d79ed85-e603-4205-ab6d-87848cbb7d97', 'nivash-moto-man-98975b',
  'nivash moto man', 'nivash k', '/images/owner-1.jpg',
  '9080909366', 'elachipalayam', 'namakal', '637202', '9080909366',
  13.0597, 80.2514, ARRAY['2w', '4w', 'bus'], ARRAY['Engine repair', 'General service & Oil change', 'Tyre & puncture'],
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], '08:00', '21:00',
  4.8, 14, ARRAY['/images/workshop-1.jpg'], true, 'approved', 'available', 250, 2500, 6, true
)
ON CONFLICT (slug) DO NOTHING;
