"use strict";
// model.ts - database interaction code
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const lodash_1 = require("lodash");
var Scope;
(function (Scope) {
    Scope[Scope["UNUSED"] = 0] = "UNUSED";
    Scope[Scope["DAY"] = 1] = "DAY";
    Scope[Scope["MONTH"] = 2] = "MONTH";
    Scope[Scope["YEAR"] = 3] = "YEAR";
    Scope[Scope["PROJECT"] = 4] = "PROJECT";
})(Scope = exports.Scope || (exports.Scope = {}));
console.log('Opening database');
const db = new sqlite3_1.default.Database('./development.sqlite3', (err) => {
    if (err) {
        console.error(`ERROR: Opening database ${err.message}`);
        process_1.default.exit(1);
    }
});
db.all('SELECT * FROM settings', (err, rows) => {
    const row = rows[0];
    if (row.schema === 3) {
        console.log('Migrating from schema 3 to 4');
        // Change all dates to beginning of scope.
        // Calculate tasks
        db.all(`SELECT * FROM tasks WHERE scope >= ${Scope.MONTH}`, (err, rows) => {
            if (err) {
                console.error(`ERROR: Database error ${err}`);
                process_1.default.exit(1);
            }
            db.serialize(() => {
                db.exec('BEGIN;');
                for (const task of rows) {
                    if (task.scope === Scope.MONTH || task.scope === Scope.YEAR) {
                        db.run(`UPDATE tasks SET date = date(date, $startOfScope) WHERE id = $taskId`, {
                            $taskId: task.id,
                            $startOfScope: task.scope === Scope.MONTH ?
                                'start of month' : 'start of year',
                        });
                    }
                }
                db.exec('END');
            });
            // Calculate minutes for all higher-scoped tasks
            db.serialize(() => {
                db.exec('BEGIN');
                for (const task of rows) {
                    if (task.scope >= Scope.MONTH) {
                        let $scopeDate = task.date;
                        let $scopeBegin;
                        let $scopePeriod;
                        switch (task.scope) {
                            case Scope.MONTH:
                                $scopeBegin = 'start of month';
                                $scopePeriod = '1 month';
                                break;
                            case Scope.YEAR:
                                $scopeBegin = 'start of year';
                                $scopePeriod = '1 year';
                                break;
                            default:
                                $scopeDate = '0';
                                $scopeBegin = 'unixepoch';
                                $scopePeriod = '100 years';
                                break;
                        }
                        db.all(`SELECT sum(minutes) FROM tasks
              WHERE scope = ${Scope.DAY} AND name = $name AND date >= date($scopeDate, $scopeBegin)
                AND date <= date($scopeDate, $scopeBegin, $scopePeriod, '-1 day')`, {
                            $scopeDate, $scopeBegin, $scopePeriod,
                            $name: task.name,
                        }, (err, rows) => {
                            if (rows && rows[0]['sum(minutes)'] != null) {
                                const $minutes = rows[0]['sum(minutes)'];
                                db.run('UPDATE tasks SET minutes = $minutes WHERE id = $id', { $id: task.id, $minutes });
                            }
                        });
                    }
                }
                db.exec('END');
            });
            // console.log(rows);
        });
    }
});
const taskFields = {
    id: 'ID',
    created_at: 'CreatedAt',
    updated_at: 'UpdatedAt',
    name: 'Name',
    date: 'Date',
    status: 'Status',
    scope: 'Scope',
    position: 'Position',
    minutes: 'Minutes',
    comment: 'Comment',
};
const selectAll = Object.keys(taskFields)
    .map(k => `${k} as ${taskFields[k]}`).join(',');
/**
 * Select a bunch of rows from the database
 */
const dbSelect = (query, params) => {
    return new Promise((resolve, reject) => {
        console.log(`QUERY: ${query}`);
        console.log(params);
        db.all(query, params || {}, (err, rows) => {
            if (err) {
                console.error(`ERROR: database: ${err.message}`);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.tasksByDate = ($date, includeYear) => {
    return dbSelect(`
    SELECT ${selectAll} FROM tasks
    WHERE deleted_at is null
      AND strftime('%Y-%m-%d', date) = $date
    `, { $date });
};
exports.tasks = () => {
    const $limit = 10;
    return dbSelect(`SELECT ${selectAll} FROM tasks WHERE deleted_at is null LIMIT $limit`, { $limit });
};
exports.updateTask = ($taskId, task) => {
    return new Promise((resolve, reject) => {
        // Automatically generate set statement with only relevant fields
        const setFields = Object.keys(task).map(k => `${lodash_1.lowerCase(k)} = $${k}`).join(',');
        const setParams = { $taskId };
        Object.keys(task).forEach(k => {
            setParams[`$${k}`] = task[k];
        });
        // Do the thing
        db.run(`UPDATE tasks SET ${setFields} WHERE id = $taskId`, setParams, (err) => {
            if (err) {
                reject(err);
            }
            else {
                dbSelect(`SELECT ${selectAll} FROM tasks WHERE id IN ($taskIds)`, { $taskIds: [$taskId].join(',') })
                    .then((res) => {
                    console.log(res);
                    resolve(res);
                });
            }
        });
    });
};
exports.default = db;
