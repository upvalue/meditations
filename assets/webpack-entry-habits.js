// webpack-habits-entry.js - Webpack bundle for habits

require("./webpack-entry");

require("coffee-loader!./habits.coffee");
require("riotjs-loader!./habits-tag.tag");

var $ = require('jquery');

$(document).ready(function() {
  window.Habits.main(true);
});
