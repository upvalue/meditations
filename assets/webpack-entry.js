// webpack-entry.js - entry file for webpack

// CSS
require("./site.css")

// jquery
window.$ = window.jQuery = require("jquery");
require("../node_modules/jquery-ui/ui/widgets/datepicker");

// bootstrap
window.Tether = require("Tether");
require("bootstrap/dist/js/bootstrap.min.js");

// moment
window.moment = require("moment");

// medium editor
window.MediumEditor = require("medium-editor/dist/js/medium-editor.js");
window.MediumEditorTable = require("medium-editor-tables/dist/js/medium-editor-tables.js");

// riot & etc
window.RiotControl = require("riotcontrol/riotcontrol.js");
window.riot = require("riot/riot+compiler.min.js");
window.route = require("riot-route/dist/amd.route");

// intro.js
window.introJs = require("intro.js/minified/intro.min.js").introJs;

// actual site code
require("coffee-loader!./common.coffee");
