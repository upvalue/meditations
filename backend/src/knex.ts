// <reference path="types.d.ts" />

import knexMod from 'knex';

import connection from '../knexfile';

import knexStringcase from 'knex-stringcase';

export const config = process.env.NODE_ENV === 'production' ? connection.production : connection.development;

export default knexMod(knexStringcase(config));