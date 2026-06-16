// Server/src/scripts/fixAndTestUsers.js

require("dotenv").config();
const pool = require("../config/db");

const hidePassword = (url) => {
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

    const constraintsResult = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass
      AND contype = 'c';
    `);

    for (const row of constraintsResult.rows) {
      await pool.query(
        `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "${row.conname}";`
      );

      console.log("Dropped constraint:", row.conname);
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

    await pool.query(`
      DELETE FROM public.users
      WHERE email = 'backend-test-intern@worksync.com';
    `);

    await pool.query(`
      INSERT INTO public.users
      (
        name,
        full_name,
        email,
        password,
        password_hash,
        role
      )
      VALUES
      (
        'Backend Test Intern',
        'Backend Test Intern',
        'backend-test-intern@worksync.com',
        'test-password',
        'test-password',
        'intern'
      );
    `);

    const testResult = await pool.query(`
      SELECT id, name, full_name, email, password, password_hash, role
      FROM public.users
      WHERE email = 'backend-test-intern@worksync.com';
    `);

    console.log("TEST INSERT SUCCESS:");
    console.table(testResult.rows);

    await pool.query(`
      DELETE FROM public.users
      WHERE email = 'backend-test-intern@worksync.com';
    `);

    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("FINAL USERS TABLE COLUMNS:");
    console.table(columnsResult.rows);

    console.log("DATABASE FIX COMPLETED SUCCESSFULLY.");
  } catch (error) {
    console.log("DATABASE FIX FAILED:");
    console.log(error.message);
  } finally {
    await pool.end();
  }
};

run();