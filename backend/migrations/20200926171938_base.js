// base migration -- this is just here to allow us to rollback to delete everything
exports.up = function (knex) {
  console.log('migration up');
  return knex;
};

exports.down = function (knex) {
  console.log('migration down');
  return knex;
};
