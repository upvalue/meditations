const { readFileSync } = require('fs');

exports.up = function(knex, Promise) {
  knex.raw(readFileSync('./sql/20190406-schema.sql'));  
};

exports.down = function(knex, Promise) {
  
};
