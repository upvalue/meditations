// webpack-journal-entry.js - Webpack bundle for journal

window.Tether = require("Tether");
// TODO: Use only the necessary files rather than the whole Bootstrap JS
require("bootstrap/dist/js/bootstrap.min.js");
require("./webpack-entry");

require("coffee-loader!./journal.coffee");
require("riotjs-loader!./journal-tag.tag");

var $ = require('jquery');

$(document).ready(function() {
  window.Journal.main();
});
