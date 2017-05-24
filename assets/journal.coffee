# journal.coffee - Journal code

JournalES6 = require("./journal-es6").default

console.log(JournalES6)

common = window.Common
entry_store = false

mount_entries = (root) ->
  console.log "Appending entries to", root

scroll = (id) ->
  () ->
    # Scroll to selected entry, if one is given
    offset = $("#entry-#{entry_scroll_id}").offset().top
    $("html, body").animate({scrollTop: offset})
    #$(window).scrollTop($("#entry-#{entry_scroll_id}").offset().top)

process_entry = (entry) ->
  # Create a date object so it doesn't have to be done multiple times in rendering
  entry.DateObj = moment(entry.Date, 'YYYY-MM-DD')
  # Context link
  entry.Context = entry.DateObj.format('YYYY-MM')
  entry

view = (datestr, entry_scroll_id) ->
  date = moment(datestr, 'YYYY-MM')
  document.title = "#{date.format('MMMM YYYY')} / journal"
  $("#habits-link").attr "href", "/habits#view/#{date.format('YYYY-MM')}/0"
  $.get "/journal/entries/date?date=#{datestr}", (entries) ->
    $("#journal-ui").html("<entries></entries>")
    #console.log "View date", entries

    seen = {}
    # Sort by most recent
    for entry in entries
      # This is so we can only display a date header once
      entry_date = entry.Date.split("T")[0]
      if not seen[entry_date]
        seen[entry_date] = 0
      seen[entry_date] += 1
      entry.Seen = seen[entry_date]

      entry = process_entry(entry)
      # Do not include context link from pages with the context
      entry.NoContext = true

    riot.mount 'entries',
      title: date.format('MMM YYYY')
      date: date
      entries: entries
      thunk: () ->
        if entry_scroll_id
          # Scroll to selected entry, if one is given
          offset = $("#entry-#{entry_scroll_id}").offset().top
          $("html, body").animate({scrollTop: offset})

actions =
  view: view

  name: (name) ->
    name = decodeURI(name)
    console.log(name)
    $.get "/journal/entries/name/#{name}", (entry) ->
      entry = process_entry(entry)
      document.title = "#{name} / journal"
      $("#journal-ui").html("<entry-single/>")
      riot.mount 'entry-single', entry_array: [entry]

  tag: (name) ->
    $.get "/journal/entries/tag/#{name}", (entries) ->
      entries = $.map(entries, process_entry)
      $("#journal-ui").html("<entries/>")
      console.log "View tag #{name}"
      document.title = "##{name} / journal"
      riot.mount('entries',
        title: name
        entries: entries
        thunk: mount_entries
      )

  no_action: () -> route("view/#{moment().format('YYYY-MM')}")

main = () ->
  window.Common.initialize()
  console.log 'Journal: initializing'

  console.log("ES6 entry store")
  entry_store = new JournalES6.EntryStore

  RiotControl.addStore(entry_store)

  # Install datepicker
  $("#journal-new-entry-date").datepicker
    onSelect: (datestr) ->
      date = moment(datestr, "MM/DD/YYYY").format('YYYY-MM-DD')
      $.post "/journal/new?date=#{date}", () ->
        view(moment(date, 'YYYY-MM-DD').format('YYYY-MM'))

  # Install router
  common.routerInitialize "/journal#", "view/#{moment().format('YYYY-MM')}", actions

  # Set up websocket
  socket = window.Common.make_socket "journal/sync", (entry) ->
    if $("#entry-#{entry.ID}").length
      RiotControl.trigger("journal-updated", entry)

window.Journal =
  main: main
  entry_store: entry_store

