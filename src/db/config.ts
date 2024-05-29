import {Client} from 'pg';

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
};

export const makeClient = async () => {
  const client = new Client(config);
  await client.connect();
  return client;
}