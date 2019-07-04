-- schema.sql - Initial database schema

CREATE TABLE IF NOT EXISTS scopes (
  id integer primary key autoincrement,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp,
  deleted_at datetime,
  name varchar(255) NOT NULL UNIQUE,
  pinned bool NOT NULL DEFAULT '0',
  visibility integer NOT NULL  DEFAULT '1'
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id integer,
  tag_id integer,
  PRIMARY KEY ("entry_id","tag_id")
);

CREATE TABLE IF NOT EXISTS tags (
  id integer primary key autoincrement,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime,
  name varchar(255)
);

CREATE TABLE IF NOT EXISTS entries (
	id	integer PRIMARY KEY AUTOINCREMENT,
	created_at	datetime,
	updated_at	datetime,
	deleted_at	datetime,
	date	datetime,
	body	text,
	name	text,
	last_body	text
);

CREATE TABLE IF NOT EXISTS tasks (
  id integer primary key autoincrement,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime,
  name text,
  date datetime,status integer,
  scope integer,
  position integer,
  minutes integer,
  comment text,
  FOREIGN KEY (scope) REFERENCES scopes (id)
);

CREATE INDEX IF NOT EXISTS idx_scopes_deleted_at ON "scopes"("deleted_at");
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON "tags"("deleted_at");
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON "entries"("deleted_at");
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);
CREATE INDEX IF NOT EXISTS idx_entries_body ON entries (body collate nocase);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON "tasks"(deleted_at) ;

INSERT INTO scopes (id, name) VALUES
  (1, 'Day'),
  (2, 'Month'),
  (3, 'Year')
  ON CONFLICT DO NOTHING;

-- Task statistics view

CREATE VIEW task_stats AS SELECT *, 
  (SELECT count(*) FROM tasks WHERE name = t.name AND
    CASE t.scope 
      WHEN 1 THEN 0
      WHEN 2 THEN strftime('%Y-%m', date) = t.date
      WHEN 3 THEN strftime('%Y', date) = t.date
    END) AS total_tasks,

  (SELECT count(*) FROM tasks WHERE name = t.name AND status = 1 AND
    CASE t.scope 
      WHEN 1 THEN 0
      WHEN 2 THEN strftime('%Y-%m', date) = t.date
      WHEN 3 THEN strftime('%Y', date) = t.date
    END) AS completed_tasks,

  (SELECT sum(minutes) FROM tasks WHERE name = t.name AND 
    CASE t.scope 
      WHEN 1 THEN 0
      WHEN 2 THEN strftime('%Y-%m', date) = t.date
      WHEN 3 THEN strftime('%Y', date) = t.date
    END) AS total_minutes

        FROM tasks t;

-- Time tracking trigger

-- CREATE TRIGGER IF NOT EXISTS task_update_track_time AFTER UPDATE ON tasks WHEN new.scope = 1 AND new.minutes != old.minutes
-- BEGIN
  -- update monthly tasks
--   UPDATE tasks SET minutes = (SELECT sum(minutes) FROM tasks WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 1) WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 2;
  -- update yearly tasks
--   UPDATE tasks SET minutes = (SELECT sum(minutes) FROM tasks WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 1) WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 3;
-- END;

-- Completion tracking trigger

-- Well if you track things this way, you need to run this calculation after name is changed or task is deleted as well.
-- Alternative would be tracking stats on fetch the way it's done before. Penalizes reads but may be simpler

--CREATE TRIGGER IF NOT EXISTS task_update_track_completion AFTER UPDATE ON tasks WHEN new.scope = 1 AND new.status != old.status
--BEGIN
  -- update monthly tasks
  --UPDATE tasks SET completed_tasks = (SELECT count(*) FROM tasks WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 1 AND status = 1) WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 2;
  --UPDATE tasks SET total_tasks = (SELECT count(*) FROM tasks WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 1) WHERE name = new.name AND strftime('%Y-%m', date) = strftime('%Y-%m', new.date) AND scope = 2;

  -- update yearly tasks
  --UPDATE tasks SET completed_tasks = (SELECT count(*) FROM tasks WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 1 AND status = 1) WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 3;
  --UPDATE tasks SET total_tasks = (SELECT count(*) FROM tasks WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 1 AND status = 1) WHERE name = new.name AND strftime('%Y', date) = strftime('%Y', new.date) AND scope = 3;
--END;

-- Normalize dates for imported database

UPDATE tasks SET date = strftime('%Y-%m-%d', date) WHERE scope = 1;
UPDATE tasks SET date = strftime('%Y-%m', date) WHERE scope = 2;
UPDATE tasks SET date = strftime('%Y', date) WHERE scope = 3;


