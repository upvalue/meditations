const { readFileSync } = require('fs');
const sqlite3 = require('sqlite3');

exports.up = function (knex, Promise) {
  // Required to run multiple statements
  return knex.connection().client.acquireConnection().then(db => {
    db.exec(readFileSync('./sql/20190406-schema.sql').toString());
  });
};

exports.down = function (knex, Promise) {

};
