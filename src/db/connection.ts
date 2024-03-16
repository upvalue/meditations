import pkg from 'pg';
import { runMigrations } from 'drizzle';

const Pool = pkg.Pool;

export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function runMigrations() {
  await runMigrations(pool);
}

