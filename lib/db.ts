import { Pool } from 'pg';

// Configure SSL for PostgreSQL connection
const sslConfig = process.env.DATABASE_URL?.includes('sslmode=require')
  ? {
      rejectUnauthorized: false,
    }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  // Additional connection options
  connectionTimeoutMillis: 10000,
});

export default pool;

export async function initDB() {
  const client = await pool.connect();
  try {
    // Create people table
    await client.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        registration_no VARCHAR(100) UNIQUE NOT NULL,
        contact_no VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
      );
    `);

    // Create attendance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
        UNIQUE(person_id, date)
      );
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_people_registration_no ON people(registration_no);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}
