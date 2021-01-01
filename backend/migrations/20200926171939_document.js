
exports.up = function (knex) {
  console.log('document up');
  return knex.raw(`
  CREATE SCHEMA techne;

  CREATE TABLE techne.notes(
    note_id TEXT PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revision INT,
    UNIQUE(title)
  );

  CREATE TABLE techne.note_revisions(
    note_revision_id INT, 
    note_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    body JSONB NOT NULL,
    CONSTRAINT fk_note FOREIGN KEY(note_id) REFERENCES techne.notes(note_id),
    PRIMARY KEY(note_id, note_revision_id)
  );

  ALTER TABLE techne.notes ADD CONSTRAINT fk_note_rev FOREIGN KEY (note_id, revision) REFERENCES techne.note_revisions(note_id, note_revision_id);

  CREATE TYPE techne.at_type AS ENUM ('unset', 'yesno', 'timer', 'yesno_timer');

  CREATE TABLE techne.ats(
    at_id TEXT NOT NULL,
    at_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    at_type techne.at_type NOT NULL,
    PRIMARY KEY(at_id),
    UNIQUE(at_name)
  );

  CREATE TABLE techne.at_nodes(
    at_id TEXT NOT NULL,
    note_id TEXT NOT NULL,
    data JSONB NOT NULL,
    at_type techne.at_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_at_node_note FOREIGN KEY(note_id) REFERENCES techne.notes(note_id),
    CONSTRAINT fk_at_node_at FOREIGN KEY(at_id) REFERENCES techne.ats(at_id),
    PRIMARY KEY(at_id, note_id)
  );

  CREATE TABLE techne.tags(
    tag_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY(tag_id),
    UNIQUE(tag_name)
  );

  CREATE TABLE techne.tag_notes(
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    path JSONB,
    PRIMARY KEY(note_id, tag_id, path)
  );

  `);
};

exports.down = function (knex) {
  console.log('document down');
  return knex.raw(`
    DROP SCHEMA techne CASCADE;
  `);
};
