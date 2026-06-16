// Server/src/utils/ensureDatabase.js

const pool = require("../config/db");

const ensureDatabase = async () => {
  console.log("Checking backend database...");

  const dbResult = await pool.query(`
    SELECT current_database() AS database_name;
  `);

  console.log("Backend connected to database:", dbResult.rows[0].database_name);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY
    );
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS name TEXT;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS full_name TEXT;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS email TEXT;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password TEXT;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS role TEXT;
  `);

  const constraintsResult = await pool.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  `);

  for (const constraint of constraintsResult.rows) {
    await pool.query(
      `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "${constraint.conname}";`
    );

    console.log("Dropped old role constraint:", constraint.conname);
  }

  await pool.query(`
    UPDATE public.users
    SET role = 'user'
    WHERE role IS NULL OR role = '';
  `);

  await pool.query(`
    UPDATE public.users
    SET full_name = name
    WHERE full_name IS NULL AND name IS NOT NULL;
  `);

  await pool.query(`
    UPDATE public.users
    SET name = full_name
    WHERE name IS NULL AND full_name IS NOT NULL;
  `);

  await pool.query(`
    UPDATE public.users
    SET password_hash = password
    WHERE password_hash IS NULL AND password IS NOT NULL;
  `);

  await pool.query(`
    UPDATE public.users
    SET password = password_hash
    WHERE password IS NULL AND password_hash IS NOT NULL;
  `);

  await pool.query(`
    ALTER TABLE public.users
    ALTER COLUMN role SET DEFAULT 'user';
  `);

  const columnsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    ORDER BY ordinal_position;
  `);

  console.log("Users table columns now:");
  console.table(columnsResult.rows);

  console.log("Database check completed.");
};

module.exports = ensureDatabase;