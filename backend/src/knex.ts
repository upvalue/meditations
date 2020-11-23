// <reference path="types.d.ts" />

import knex from 'knex';

import connection from '../knexfile';

import knexStringcase from 'knex-stringcase';

export const config = process.env.NODE_ENV === 'production' ? connection.production : connection.development;

export default knex(knexStringcase(config)).withSchema('techne');