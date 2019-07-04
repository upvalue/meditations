// demo.js - Demo seeding

const makeTask = (name, date, scope, additional = {}) => {
  return {
    date, name, scope,
    status: 1,
    position: 0,
    ...additional
  };
}

const { startOfMonth, subMonths, eachDayOfInterval, format, isFirstDayOfMonth } = require('date-fns');

const years = {};

const addYear = (date) => {
  years[format(date, 'yyyy')] = [
    makeTask('Exercise', format(date, 'yyyy'), 3),
    makeTask('Diet', format(date, 'yyyy'), 3),
  ]
}

exports.seed = async function (knex, Promise) {
  const end = new Date();
  const start = startOfMonth(subMonths(end, 3));

  const days = eachDayOfInterval({ start, end });

  // Handle tasks for years
  addYear(start);
  addYear(end);

  // Generate tasks for previous months
  const tasks = days.flatMap((date, i) => {
    return [
      makeTask('Exercise', format(date, 'yyyy-MM-dd'), 1),
      makeTask('Diet', format(date, 'yyyy-MM-dd'), 1),
      // Insert tasks for month at beginning of month
      ...isFirstDayOfMonth(date) ? [
        makeTask('Exercise', format(date, 'yyyy-MM'), 2),
        makeTask('Diet', format(date, 'yyyy-MM'), 2)
      ] : [],
    ]
  });


  await knex.table('tasks').insert(tasks);
  await knex.table('tasks').insert(...Object.values(years));
};
