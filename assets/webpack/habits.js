// habits.js - Webpack bundle entry for habits

require("./entry");

window.Habits = require("../habits.js").default;

// require("coffee-loader!./habits.coffee");
require("riotjs-loader!../habits-tag.tag");

document.addEventListener('DOMContentLoaded', function() {
  window.Habits.main();
});
