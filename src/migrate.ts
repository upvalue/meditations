import pkg from 'pg';
import * as schema from './schema';
import {pool} from './db/connection';

export const db = pool;
