export type DbExecutor = {
  exec?: (sql: string) => Promise<any>;
  query?: (sql: string) => Promise<any>;
};

export async function ensureTables(client: DbExecutor) {
  const execute = async (sql: string) => {
    if (typeof client.exec === "function") {
      return client.exec(sql);
    }
    if (typeof client.query === "function") {
      return client.query(sql);
    }
    throw new Error("Database client must support exec or query");
  };

  await execute(`
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
}
