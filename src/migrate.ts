import pkg from 'pg';
import * as schema from './schema';
import {pool, runMigrations} from './db/connection';

export const db = pool;

runMigrations();
