// Server/src/scripts/fixOnboardingTables.js

require("dotenv").config();
const pool = require("../config/db");

const hidePassword = (url) => {
  if (!url) return "DATABASE_URL missing";
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
};

const run = async () => {
  try {
    console.log("DATABASE_URL used by backend:");
    console.log(hidePassword(process.env.DATABASE_URL));

    const dbResult = await pool.query(`
      SELECT current_database() AS database_name;
    `);

    console.log("Connected database:");
    console.log(dbResult.rows[0].database_name);

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

    const userConstraints = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass
      AND contype = 'c';
    `);

    for (const row of userConstraints.rows) {
      await pool.query(
        `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "${row.conname}";`
      );

      console.log("Dropped users constraint:", row.conname);
    }

    await pool.query(`
      ALTER TABLE public.users
      ALTER COLUMN role SET DEFAULT 'user';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.interns (
        id SERIAL PRIMARY KEY
      );
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS applicant_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS department_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS mentor_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS intern_id TEXT;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS full_name TEXT;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS email TEXT;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS joining_date DATE;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS end_date DATE;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'Remote';
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      ALTER TABLE public.interns
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    const usersColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    const internsColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'interns'
      ORDER BY ordinal_position;
    `);

    console.log("FINAL USERS TABLE COLUMNS:");
    console.table(usersColumns.rows);

    console.log("FINAL INTERNS TABLE COLUMNS:");
    console.table(internsColumns.rows);

    console.log("ONBOARDING TABLE FIX COMPLETED SUCCESSFULLY.");
  } catch (error) {
    console.log("ONBOARDING TABLE FIX FAILED:");
    console.log(error.message);
  } finally {
    await pool.end();
  }
};

run();