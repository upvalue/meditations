import { drizzle } from 'drizzle-orm/postgres-js';
import pg from 'pg-promise';
import * as schema from './schema';
export const connection = await pg({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});
export const db = drizzle(connection, { schema });
