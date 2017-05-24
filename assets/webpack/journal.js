// journal.js - Webpack bundle entry for Journal

window.Tether = require("Tether");

// TODO: Use only the necessary files rather than the whole Bootstrap JS
require("bootstrap/dist/js/bootstrap.min.js");
require("./entry");

require("coffee-loader!../journal.coffee");
require("riotjs-loader!../journal-tag.tag");

document.addEventListener('DOMContentLoaded', function() {
  window.Journal.main();
});
