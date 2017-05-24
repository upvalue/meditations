import route from 'riot-route';

import Common from './common';

/**
 * Journal frontend functionality
 * @exports journal
 */
const Journal = {
  /**
   * Entry store.
   * @class
   */
  EntryStore: class extends Common.Store {
    constructor() {
      super();

      Common.register_events(this);
    }

    on_delete_entry(id) {
      $.post({
        url: `/journal/delete-entry/${id}`,
        success: () => $(`#entry-${id}`).remove()
      });
    }

    on_journal_update(entry) {
      Common.request({
        url: "/journal/update",
        data: entry
      });
    }

    on_name_entry(id, name) {
      $.post({
        url: `/journal/name-entry/${id}/${name}`
      });
    }

    on_browse_tag(name) {
      route(`tag/${name}`);
    }

    on_remove_tag(entry_id, tag) {
      $.post({url: `/journal/remove-tag/${entry_id}/${tag}`});
    }

    on_add_tag(entry_id, tag) {
      $.post({url: `/journal/add-tag/${entry_id}/${tag}`});
    }
  },

  main: () => {
  },
}

exports.default = Journal;
