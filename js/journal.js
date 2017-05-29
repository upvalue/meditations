/** Journal functionality
  * @module journal */
import route from 'riot-route';

import Common from './common';

/**
 * Pre-rendering processing of entries
 */
const process_entry = (entry) => {
  // Create a date object so it doesn't have to be done multiple times in rendering
  entry.DateObj = moment(entry.Date, 'YYYY-MM-DD');
  // Context link
  entry.Context = entry.DateObj.format('YYYY-MM');
  return entry;
}

/**
 * Journal frontend functionality
 * @exports journal
 */
const Journal = {
  /**
   * Entry store.
   * @class
   */
  JournalPage: class extends Common.Page {
    constructor() {
      super();
    }

    /**
     * Delete a given entry
     * @param {number} id
     */
    on_delete_entry(id) {
      $.post({
        url: `/journal/delete-entry/${id}`,
        success: () => $(`#entry-${id}`).remove()
      });
    }

    /**
     * Update a given entry
     * @param {Object} entry
     */
    on_journal_update(entry) {
      Common.request({
        url: "/journal/update",
        data: entry
      });
    }

    /**
     * Name an entry, or change the name of a named entry
     * @param {number} id
     * @param {string} name
     */
    on_name_entry(id, name) {
      $.post({
        url: `/journal/name-entry/${id}/${name}`
      });
    }

    /**
     * Navigate to a specific tag
     * @param {name} string
     */
    on_browse_tag(name) {
      route(`tag/${name}`);
    }

    /**
     * Remove a tag from an entry
     * @param {number} entry_id
     * @param {string} tag
     */
    on_remove_tag(entry_id, tag) {
      $.post({url: `/journal/remove-tag/${entry_id}/${tag}`});
    }

    /**
     * Add a tag to an entry
     * @param {number} entry_id
     * @param {string} tag 
     */
    on_add_tag(entry_id, tag) {
      $.post({url: `/journal/add-tag/${entry_id}/${tag}`});
    }
  },

  /**
   * Action: view a named journal entry
   * @param {string} name Name of the entry
   */
  name: (name) => {
    console.log(`Name`);
    name = decodeURI(name);
    console.log(name);
    $.get(`/journal/entries/name/${name}`, (entry) => {
      entry = process_entry(entry);
      document.title = `${name} /journal`;
      $("#journal-ui").html("<entry-single/>");
      riot.mount('entry-single', {entry_array: [entry]});
    });
  },

  /**
   * Action: view a specific tag
   * @param {string} name Name of the tag
   */
  tag: (name) => {
    console.log(`Tag`);
    $.get(`/journal/entries/tag/${name}`, (entries) => {
      entries = $.map(entries, process_entry);
      $("#journal-ui").html("<entries/>");
      console.log(`View tag ${name}`);
      document.title = `#${name} / journal`;
      riot.mount('entries', {
        title: name,
        entries: entries,
      });
    });
  },

  /**
   * Action: View a specific date
   * @param {string} datestr String of the date in YYYY-MM format
   * @param {string} [entry_scroll_id] Optional, ID of a specific entry to scroll to, used when user clicks on context button.
   */
  view: (datestr, entry_scroll_id) => {
    const date = moment(datestr, 'YYYY-MM');

    document.title = `${date.format('MMMM YYYY')} / journal`;

    $("#habits-link").attr("href", `/habits#view/${date.format('YYYY-MM')}/0`);

    $.get(`/journal/entries/date?date=${datestr}`, (entries) => {
      $("#journal-ui").html("<entries></entries>");

      const seen = {};
      // Sort by most recent
      for(let entry of entries) {
        // This is so we can display a date header only a single time
        const entry_date = entry.Date.split("T")[0]
        if(!seen[entry_date]) {
          seen[entry_date] = 0;
        }
        seen[entry_date] += 1;
        entry.Seen = seen[entry_date];
        entry = process_entry(entry);
        // Do not include context link from pages with the context
        entry.NoContext = true;
      }

      riot.mount('entries', {
        title: date.format('MMM YYYY'),
        date: date,
        entries: entries,
        thunk: () => {
          if(entry_scroll_id) {
            // Scroll to selected entry, if one is given
            const offset = $(`#entry-${entry_scroll_id}`).offset().top
            $("html, body").animate({scrollTop: offset});
          }
        }
      });
    })
  },

  main: () => {
    Common.initialize();
    const journal_page = new Journal.JournalPage();

    RiotControl.addStore(journal_page);

    $("#journal-new-entry-date").datepicker({
      onSelect: (datestr) => {
        const date = moment(datestr, "MM/DD/YYYY").format("YYYY-MM-DD");
        $.post(`/journal/new?date=${date}`, () => {
          Journal.view(moment(date, 'YYYY-MM-DD').format('YYYY-MM'));
        });
      }
    });

    Common.routerInitialize("/journal#", `view/${moment().format('YYYY-MM')}`, {
      view: Journal.view,
      tag: Journal.tag,
      name: Journal.name
    });

    const socket = Common.make_socket("journal/sync", (entry) => {
      if($(`#entry-${entry.ID}`).length) {
        RiotControl.trigger("journal-updated", entry);
      }
    });
  },
}

export default Journal;
