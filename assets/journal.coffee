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
    $("#journal-ui").html("<entries/>")
    console.log "View date", entries


    seen = {}
    # Sort by most recent
    entries = entries.sort (a, b) -> b.ID - a.ID
    for entry in entries
      # This is so we can only display a date header once
      entry_date = entry.Date.split("T")[0]
      if not seen[entry_date]
        seen[entry_date] = 0
      seen[entry_date] += 1
      entry.Seen = seen[entry_date]

    riot.mount 'entries',
      title: date.format('MMM YYYY')
      date: date
      entries: entries

actions =
  view: view

  name: (name) ->
    $.get "/journal/entries/name/#{name}", (entry) ->
      document.title = "#{name} / journal" 
      $("#journal-ui").html("<entry-single/>")
      riot.mount 'entry-single', entry_array: [entry]

  tag: (name) ->
    $.get "/journal/entries/tag/#{name}", (entries) ->
      $("#journal-ui").html("<entries/>")
      console.log "View tag #{name}"
      document.title = "##{name} / journal"
      riot.mount('entries',
        title: name
        entries: entries
        thunk: mount_entries
      )

  no_action: () -> route("view/#{moment().format('YYYY-MM')}")

class EntryStore extends common.Store
  on_journal_update: (entry) ->
    console.log entry
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

  on_name_entry: (id, name) ->
    console.log id, name
    $.post
      url: "/journal/name-entry/#{id}/#{name}"
      success: () ->
        true

  on_promote_entry: (id, name) ->
    console.log id, name
    $.post
      url: "/journal/promote-entry/#{id}"
      success: () ->
        $("#entry-#{id}").remove()

  on_browse_tag: (name) ->
    route("tag/#{name}")

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
