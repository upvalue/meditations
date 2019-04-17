-- import.sql - import meditations database from go backend

-- normalize task dates
update tasks set date = strftime('%Y-%m-01', date) where strftime('%d') != '01' and scope in (2,3);

-- precalculate all task times
CREATE TABLE task_minutes (id int primary key, name text, minutes int, scope int, date text);

 INSERT INTO task_minutes (id, name, minutes, scope, date) select id, name, 0, scope, date from tasks where scope in (2,3);

 INSERT OR REPLACE INTO task_minutes SELECT tm.id, tm.name, sum(t.minutes), tm.scope, tm.date as minutes FROM tasks t INNER JOIN task_minutes tm ON tm.name = t.name AND strftime('%Y-%m', t.date) = strftime('%Y-%m', tm.date) WHERE t.scope = 1 AND tm.scope = 2 GROUP BY t.name, t.scope, tm.date;

 INSERT OR REPLACE INTO task_minutes SELECT tm.id, tm.name, sum(t.minutes), tm.scope, tm.date as minutes FROM tasks t INNER JOIN task_minutes tm ON tm.name = t.name AND strftime('%Y', t.date) = strftime('%Y', tm.date) WHERE t.scope = 1 AND tm.scope = 3 GROUP BY t.name, t.scope, tm.date;

UPDATE tasks SET minutes = 0 WHERE minutes is null;

UPDATE tasks SET minutes = (SELECT minutes from task_minutes WHERE id = tasks.id);

-- add defaults and nullability here

DROP TABLE task_minutes;
