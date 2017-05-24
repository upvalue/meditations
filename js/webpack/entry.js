// entry.js - entry file for webpack

// CSS
require("../site.css")

// jquery
window.$ = window.jQuery = require("jquery");
require("jquery-ui/ui/widgets/datepicker");

// moment
window.moment = require("moment");

// medium editor
window.MediumEditor = require("medium-editor/dist/js/medium-editor.js");
window.MediumEditorTable = require("medium-editor-tables/dist/js/medium-editor-tables.js");

// riot & etc
window.RiotControl = require("riotcontrol/riotcontrol.js");
window.riot = require("riot/riot+compiler.min.js");

window.Common = require("../common.js").default;
