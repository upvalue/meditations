// webpack-journal-entry.js - Webpack bundle for journal

require("./webpack-entry");

require("coffee-loader!./journal.coffee");
require("riotjs-loader!./journal-tag.tag");

var $ = require('jquery');

$(document).ready(function() {
  window.Journal.main();
});
