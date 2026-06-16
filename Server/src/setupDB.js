const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const setupDatabase = async () => {
  try {
    console.log("Creating WorkSync tables...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(150) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'HR', 'MENTOR', 'INTERN')),
          phone VARCHAR(20),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applicants (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL,
          phone VARCHAR(20),
          city VARCHAR(100),
          college_name VARCHAR(200),
          degree VARCHAR(100),
          branch VARCHAR(100),
          year_of_study VARCHAR(50),
          cgpa VARCHAR(20),
          applied_role VARCHAR(100),
          preferred_domain VARCHAR(100),
          skills TEXT,
          linkedin_url TEXT,
          github_url TEXT,
          portfolio_url TEXT,
          application_source VARCHAR(100),
          why_join TEXT,
          why_role TEXT,
          career_goals TEXT,
          skills_to_develop TEXT,
          why_select_you TEXT,
          status VARCHAR(50) DEFAULT 'Applied',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          code VARCHAR(20) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interns (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          applicant_id INTEGER UNIQUE REFERENCES applicants(id) ON DELETE SET NULL,
          intern_id VARCHAR(50) UNIQUE NOT NULL,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          mentor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          joining_date DATE,
          end_date DATE,
          work_mode VARCHAR(30) DEFAULT 'Remote',
          status VARCHAR(50) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarding_documents (
          id SERIAL PRIMARY KEY,
          intern_id INTEGER REFERENCES interns(id) ON DELETE CASCADE,
          document_type VARCHAR(100) NOT NULL,
          document_url TEXT,
          status VARCHAR(50) DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(200) NOT NULL,
          module VARCHAR(100),
          ip_address VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      INSERT INTO departments (name, code)
      VALUES
        ('Business Development', 'BD'),
        ('Business Analytics', 'BA'),
        ('Consulting', 'CON'),
        ('Civil & Construction', 'CIV'),
        ('Design', 'DES'),
        ('Hospitality', 'HOS'),
        ('Human Resources', 'HR'),
        ('IT', 'IT'),
        ('Marketing', 'MKT'),
        ('Operations', 'OPS'),
        ('Sales', 'SAL'),
        ('Training & EdTech', 'TED')
      ON CONFLICT (code) DO NOTHING;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
      CREATE INDEX IF NOT EXISTS idx_applicants_source ON applicants(application_source);
      CREATE INDEX IF NOT EXISTS idx_applicants_domain ON applicants(preferred_domain);
      CREATE INDEX IF NOT EXISTS idx_interns_intern_id ON interns(intern_id);
      CREATE INDEX IF NOT EXISTS idx_interns_department ON interns(department_id);
    `);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("Tables created successfully:");
    console.table(tables.rows);

    await pool.end();
  } catch (error) {
    console.error("Database setup failed:");
    console.error(error.message);
    await pool.end();
  }
};

setupDatabase();