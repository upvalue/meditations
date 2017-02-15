// webpack-entry.js - entry file for webpack

// CSS
require("./site.css")

window.introJs = require("./vendor/intro.js/minified/intro.min.js").introJs;

// jquery
window.$ = window.jQuery = require("jquery");
require("./vendor/jquery-ui/ui/datepicker");

// bootstrap
window.Tether = require("Tether");
require("./vendor/bootstrap/dist/js/bootstrap.min.js");

// moment
window.moment = require("moment");

// medium editor
window.MediumEditor = require("./vendor/medium-editor/dist/js/medium-editor.js");
window.MediumEditorTable = require("./vendor/medium-editor-tables/dist/js/medium-editor-tables.js");

// riot & etc
window.RiotControl = require("./vendor/RiotControl/riotcontrol.js");
window.riot = require("./vendor/riot/riot+compiler.min.js");
window.route = require("./vendor/riot-route/dist/amd.route");

// actual site code
require("coffee-loader!./common.coffee");
