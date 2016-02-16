// Generated by CoffeeScript 1.10.0
(function() {
  var WikiStore, actions, common,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  common = window.Common;

  WikiStore = (function(superClass) {
    extend(WikiStore, superClass);

    function WikiStore() {
      return WikiStore.__super__.constructor.apply(this, arguments);
    }

    WikiStore.prototype.on_add_page = function(title) {
      common.request({
        url: "/wiki/new/" + title
      });
      return riot.route("view/" + title);
    };

    WikiStore.prototype.on_edit_page = function(title, msg) {
      console.log('edit-page', title, msg);
      return common.request({
        url: "/wiki/edit",
        data: msg,
        success: function() {
          return riot.route("view/" + title);
        }
      });
    };

    return WikiStore;

  })(common.Store);

  actions = {
    index: function() {
      return common.request({
        type: "GET",
        url: "/wiki/index",
        success: function(pages) {
          return riot.mount('index', {
            pages: pages
          });
        }
      });
    },
    view: function(title) {
      $("index").remove();
      return common.request({
        type: "GET",
        url: "/wiki/page/" + title,
        success: function(page) {
          return riot.mount('page', page);
        }
      });
    }
  };

  window.Wiki = {
    initialize: function() {
      var initialize;
      console.log('Wiki: initializing');
      if (typeof html5 !== "undefined" && html5 !== null) {
        html5.addElements(' wiki-controls index page');
      }
      return initialize = function() {
        return false;
      };
    },
    main: function() {
      this.initialize();
      riot.mount('wiki-controls');
      RiotControl.addStore(new WikiStore);
      return common.route('/wiki#', 'index', actions);
    }
  };

}).call(this);

//# sourceMappingURL=wiki.js.map
