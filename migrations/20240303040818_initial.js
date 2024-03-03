/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE docs(
      id text PRIMARY KEY,
      revision integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      body jsonb NOT NULL
    );

    CREATE TABLE doc_revisions(
      id text PRIMARY KEY,
      doc_id text NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
      revision integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      body jsonb NOT NULL
    );
  
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS docs;
  `);
};
