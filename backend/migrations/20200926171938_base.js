// base migration -- this is just here to allow us to rollback to delete everything
exports.up = function (knex) {
  return knex;
};

exports.down = function (knex) {
  return knex;
};
