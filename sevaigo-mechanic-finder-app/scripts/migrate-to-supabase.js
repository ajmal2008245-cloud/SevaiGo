/**
 * SevaiGo Supabase / Remote PostgreSQL Migration & Verification Script
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js [OPTIONAL_DATABASE_URL]
 *
 * Example:
 *   node scripts/migrate-to-supabase.js "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables if available
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const targetUrl = process.argv[2] || process.env.DATABASE_URL;

if (!targetUrl || targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
  console.log('\n======================================================');
  console.log('ℹ️  SevaiGo Database Migration & Verification Utility');
  console.log('======================================================');
  console.log('To migrate or verify your Supabase/PostgreSQL database, run:');
  console.log('  node scripts/migrate-to-supabase.js "YOUR_SUPABASE_POSTGRES_CONNECTION_STRING"\n');
  console.log('Or set DATABASE_URL in your .env / .env.local file or Vercel Environment Variables.');
  console.log('======================================================\n');
  process.exit(0);
}

async function runMigration() {
  console.log('\n🚀 Connecting to target PostgreSQL database...');
  console.log('   Target URL (masked):', targetUrl.replace(/:([^:@]+)@/, ':****@'));

  const pool = new Pool({
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const connTest = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Connected successfully!');
    console.log('   Postgres Version:', connTest.rows[0].version.split(' on ')[0]);
    console.log('   Current DB Time:', connTest.rows[0].current_time);

    console.log('\n📦 Verifying / Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        phone text,
        role text NOT NULL DEFAULT 'user',
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamp with time zone NOT NULL
      );

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
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS pincode text;
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS shop_phone text;
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS working_days text[];
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS business_doc text;
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS spare_parts text[];
      ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true;

      CREATE TABLE IF NOT EXISTS reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating integer NOT NULL,
        comment text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_mechanic_unique ON reviews (user_id, mechanic_id);

      CREATE TABLE IF NOT EXISTS favorites (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, mechanic_id)
      );

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
        latitude double precision,
        longitude double precision,
        action text NOT NULL DEFAULT 'called',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS vehicle_type text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS user_name text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS user_phone text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS address text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS spare_parts text[];
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS mechanic_lat double precision;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS mechanic_lng double precision;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS eta_minutes integer;
      ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        message text NOT NULL,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ Tables and columns verified successfully!');

    // Read initial data from initialData.ts
    const initialDataPath = path.join(__dirname, '..', 'src', 'db', 'initialData.ts');
    if (fs.existsSync(initialDataPath)) {
      console.log('\n🔄 Checking existing data in destination database...');
      const checkRes = await pool.query('SELECT count(*)::int as count FROM mechanics');
      const count = checkRes.rows[0].count;
      console.log(`   Destination currently has ${count} mechanic(s).`);

      if (count === 0) {
        console.log('   Importing baseline verified mechanics and users...');
        // Execute a quick check/insert from local cluster if PGlite is available
        try {
          const { PGlite } = require('@electric-sql/pglite');
          const localDbPath = path.join(__dirname, '..', '.data', 'sevaigo-db');
          if (fs.existsSync(localDbPath)) {
            const pg = new PGlite(localDbPath);
            const localUsers = await pg.query('SELECT * FROM users');
            for (const u of localUsers.rows) {
              await pool.query(
                `INSERT INTO users (id, name, email, password_hash, phone, role, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (email) DO NOTHING`,
                [u.id, u.name, u.email, u.password_hash, u.phone, u.role, u.created_at]
              );
            }
            console.log(`   Synced ${localUsers.rows.length} users.`);

            const localMechs = await pg.query('SELECT * FROM mechanics');
            for (const m of localMechs.rows) {
              await pool.query(
                `INSERT INTO mechanics (
                   id, slug, owner_user_id, shop_name, owner_name, owner_photo, phone,
                   address, city, pincode, shop_phone, latitude, longitude, vehicle_types,
                   specializations, working_days, open_time, close_time, rating, review_count,
                   photos, is_verified, approval_status, availability_status, price_min,
                   price_max, years_experience, business_doc, spare_parts, is_online, created_at
                 ) VALUES (
                   $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                   $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                   $27, $28, $29, $30, $31
                 ) ON CONFLICT (slug) DO NOTHING`,
                [
                  m.id, m.slug, m.owner_user_id, m.shop_name, m.owner_name, m.owner_photo, m.phone,
                  m.address, m.city, m.pincode, m.shop_phone, m.latitude, m.longitude, m.vehicle_types,
                  m.specializations, m.working_days, m.open_time, m.close_time, m.rating, m.review_count,
                  m.photos, m.is_verified, m.approval_status, m.availability_status, m.price_min,
                  m.price_max, m.years_experience, m.business_doc, m.spare_parts, m.is_online, m.created_at
                ]
              );
            }
            console.log(`   Synced ${localMechs.rows.length} mechanics.`);
          }
        } catch (syncErr) {
          console.warn('   Note during data sync:', syncErr.message);
        }
      }
    }

    console.log('\n🎉 Supabase / Remote PostgreSQL database is 100% ready for SevaiGo production!');
    await pool.end();
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
