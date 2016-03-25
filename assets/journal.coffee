# journal.coffee - Journal code

common = window.Common
entry_store = false

initialize = () ->
  console.log 'Journal: initializing'
  html5.addElements('entries entry tag-cloud') if html5?

  initialize = () -> false
  true

mount_entries = (root) ->
  console.log "Appending entries to", root

view = (datestr) ->
  date = moment(datestr, 'YYYY-MM')
  document.title = "#{date.format('MMM YYYY')} / journal"
  $("#habits-link").attr "href", "/habits#view/#{date.format('YYYY-MM')}/0"
  $.get "/journal/entries/date?date=#{datestr}", (entries) ->
    $("#content").html("<entries/>")
    console.log "View date", entries

    riot.mount 'entries',
      title: date.format('MMM YYYY')
      date: date
      entries: entries

actions =
  view: view

  wiki_index: () ->
    $.get "/journal/entries/wiki-index", (entries) ->
      $("#content").html("<wiki-entries/>")
      riot.mount 'wiki-entries', entries: entries

  wiki: (name) ->
    $.get "/journal/entries/name/#{name}", (entry) ->
      $("#content").html("<entry-single/>")
      riot.mount 'entry-single', entry_array: [entry]

  tag: (name) ->
    $.get "/journal/entries/tag/#{name}", (entries) ->
      $("#content").html("<entries/>")
      console.log "View tag #{name}"
      riot.mount('entries',
        title: name
        entries: entries
        thunk: mount_entries
      )

  tags: () ->
    $.get "/journal/tags", (results) ->
      window.results = results
      #for value in results
      #  console.log value
      max = results.reduce (x,y) ->
        if x.Count
          return x.Count
        Math.max(x, y.Count)

      min = results.reduce (x,y) ->
        if x.Count
          return x.Count
        Math.min(x, y.Count)

      font_min = 12
      font_max = 24
      for r in results
        if r.Count == min
          r.Size = font_min
        else 
          r.Size = Math.round((r.Count / max) * (font_max - font_min) + font_min)

      $("#content").html("<tag-cloud/>")
      riot.mount 'tag-cloud',
        tags: results

  no_action: () -> riot.route("view/#{moment().format('YYYY-MM')}")

class EntryStore extends common.Store
  on_journal_update: (entry) ->
    common.request
      url: "/journal/update"
      success: (data) ->
        true

      data: entry

  on_add_tag: (entry_id, tag) ->
    $.post
      url: "/journal/add-tag/#{entry_id}/#{tag}"

  on_remove_tag: (entry_id, tag) ->
    $.post
      url: "/journal/remove-tag/#{entry_id}/#{tag}"

  on_delete_entry: (id) ->
    $.post
      url: "/journal/delete-entry/#{id}"
      success: () ->
        console.log("Success", id)
        $("#entry-#{id}").remove()

  on_promote_entry: (id, name) ->
    console.log id, name
    $.post
      url: "/journal/promote-entry/#{id}/#{name}"
      success: () ->
        $("#entry-#{id}").remove()

  on_browse_tag: (name) ->
    riot.route("tag/#{name}")

main = () ->
  initialize()

  entry_store = new EntryStore

  RiotControl.addStore(entry_store)

  # Install datepicker
  $("#journal-new-entry-date").datepicker
    onSelect: (datestr) ->
      date = moment(datestr, "MM/DD/YYYY").format('YYYY-MM-DD')
      $.post "/journal/new?date=#{date}", () ->
        view(moment(date, 'YYYY-MM-DD').format('YYYY-MM'))

  # Install router
  common.route "/journal#", "view/#{moment().format('YYYY-MM')}", actions

  socket = window.Common.make_socket "journal/sync", (entry) ->
    if $("#entry-#{entry.ID}").length
      RiotControl.trigger("journal-updated", entry)

window.Journal = 
  initialize: initialize
  main: main
  entry_store: entry_store
