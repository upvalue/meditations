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

    CREATE TABLE doc_tags(
      doc_id text NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
      doc_location text NOT NULL,
      tag_name text NOT NULL,
      PRIMARY KEY (doc_id, doc_location, tag_name)
    );

    INSERT INTO docs (id, body) VALUES ('doc-1', '{}');
  
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS doc_tags;
    DROP TABLE IF EXISTS doc_revisions;
    DROP TABLE IF EXISTS docs;
  `);
};
