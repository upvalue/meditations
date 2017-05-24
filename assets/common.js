import route from 'riot-route';
import $ from 'jquery';
import MediumEditor from 'medium-editor';
import MediumEditorTable from 'medium-editor-tables';

/**
 * Functionality shared by all pages.
 * @exports common-es6
 */
const Common = {
  /**
   * Shorthand for a jQuery $.ajax call
   * @param {Object} data
   * @returns {undefined}
   */
  request: (data) => {
    const ret = $.extend({type: "POST", contentType: "application/json; charset=UTF-8"}, data)
    ret.data = JSON.stringify(ret.data)
    return $.ajax(ret)
  },

  /**
   * Called at startup to monkeypatch MediumEditorTable with the appropriate icon set.
   */
  initialize: () => {
    console.log("Common.initialize");
    // Monkeypatch: Replace Font Awesome icons used by medium-editor-table with octicons
    const show_back = MediumEditorTable.prototype.show;
    MediumEditorTable.prototype.show = function() {
      $(".fa").removeClass("fa").addClass("octicon")
      const fareplace = (bef, aft) => $(`.fa-${bef}`).removeClass(`fa-${bef}`).addClass(`octicon-${aft}`)
      fareplace('long-arrow-up', 'arrow-up')
      fareplace('long-arrow-down', 'arrow-down')
      fareplace('long-arrow-right', 'arrow-right')
      fareplace('long-arrow-left', 'arrow-left')
      fareplace('close', 'x')
      fareplace('trash-o', 'trashcan')
      show_back.call(this, arguments)
    };
  },

  /**
   * Creates a MediumEditor instance with a given element
   * @param {string} selector jQuery selector to find the element
   * @param {function} focus Callback for when the editor is focused
   * @param {function} blur Callback for when the editor is blurred
   * @param {Object} [args] Arguments to pass-through to `new MediumEditor`
   * @returns {MediumEditor}
   */
  make_editor: (selector, focus, blur, args = {}) => {
    const editor = Common.editor = new MediumEditor(selector,
      $.extend({
        // Default arguments
        autoLink: true,
        placeholder: false,
        extensions: { table: new MediumEditorTable },
        toolbar: { buttons: ['bold', 'italic', 'underline', 'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table' ] }
      }, args))

    // Register callbacks
    editor.subscribe("focus", () => {
      $("#saved-button").removeClass("octicon-check");
      $("#saved-button").addClass("octicon-circle-slash");
      $(window).on("beforeunload", focus);
    });

    editor.subscribe("blur", () => {
      $("#saved-button").addClass("octicon-check")
      $("#saved-button").removeClass("octicon-circle-slash")
      blur()
      $(window).off("unload");
    });

    return editor;
  },

  /**
   * Creates a websocket, over SSL if the page has been served with HTTPS
   * @param {location} string
   * @param {onmessage} function Callback for when a message is received
   * @returns {WebSocket}
   */
  make_socket: (location, onmessage) => {
    const protocol = window.location.protocol == 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.hostname}:${window.location.port}/${location}`;

    const socket = new WebSocket(url);
    socket.onopen = (m) => console.log(`Common.make_socket: Connected to ${url} websocket`);
    socket.onmessage = (m) => onmessage(JSON.parse(m.data));
    return socket;
  },

  /**
   * Shorthand for configuring routes with riot's router
   * @param {string} base The base of the URL (eg #habits/)
   * @param {string} first An initial route to go to.
   * @param {Object} routes An object mapping names to callback functions. `no_action` will be called if no action<br>
   * is supplied in the URL.
   */
  routerInitialize: (base, first, routes) => {
    window.route = route; // TODO remove after journal is ported
    console.log(`Common.routerInitialize called`);
    route(function() {
      // Routing callback, checks through the routes Object for appropriate actions
      const action = [].shift.apply(arguments);
      console.log(`Common.routerInitialize: dispatching ${action}`);
      if(routes[action]) {
        routes[action].apply(this, arguments);
      } else if(action == '' && routes['no_action']) {
        routes['no_action'].apply(this, arguments);
      } else {
        if(routes['unknown']) {
          routes.unknown.apply(this, arguments);
        } else {
          console.warn("Unknown action", action);
        }
      }

    });

    // Initialize router
    route.base(base);
    route.start(true);

    if(window.location.hash.length <= 2) {
      if(first) {
        route(first);
      }
    }
  },

  /**
   * Automatically register store methods beginning with on_ to listen to RiotControl events with the same name
   */
  register_events: (obj) => {
    const events = [];
    //console.log(Object.getOwnPropertyNames(obj.__proto__));
    for(const key of Object.getOwnPropertyNames(obj.__proto__)) {
      // console.log(`Common.register_events method ${key}`);
      if(key.slice(0,3) == "on_") {
        events.push(key);
        obj.on(key.slice(3).replace(/_/g, "-"), obj[key]);
      }
    }
    console.log(`Common.registerEvents: listening for ${events}`);
  },

  /** An observable Store for the frontend to interact with. Automatically registers methods beginning with on_ to
   * listen to RiotControl events. Note that this will only be done for one subclass.
   */
  Store: class {
    constructor() {
      riot.observable(this);
    }
  },
}

export default Common;
