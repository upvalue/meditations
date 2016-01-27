# journal.coffee - Journal code

entry_store = false
json_request = window.Common.json_request

initialize = () ->
  console.log 'Journal: initializing'
  if html5?
    html5.addElements('entries entry')

  initialize = () -> false
  true

view = (datestr) ->
  date = moment(datestr, 'YYYY-MM')
  document.title = "#{date.format('MMM YYYY')} / journal"
  $("#habits-link").attr "href", "/habits#from/#{date.format('YYYY-MM')}/0"
  $.get "/journal/entries/date?date=#{datestr}", (entries) ->
    console.log "View date", entries
    # if there's not an entry for today (or tomorrow if within 4 hours of that), add a little "click to edit" mount
    check = moment(entries[0].Date, 'YYYY-MM-DD')
    today = moment()
    today.add(4, 'hours')
    if today.isSame(check, 'month')
      unless check.isSame(today, 'day')
        $("<button class=\"btn btn-xs\">Add entry for #{today.format('YYYY-MM-DD')}</button>")
          .insertBefore("entries").click () ->
            riot.route("create/#{today.format('YYYY-MM-DD')}")
        console.log('new journal entry', today)


    riot.mount('entries',
      title: date.format('MMM YYYY')
      date: date
      entries: entries
    )

tag = (name) ->
  $.get "/journal/entries/tag/#{name}", (entries) ->
    console.log "View tag #{name}"
    riot.mount('entries',
      title: name
      entries: entries
    )

create = (date) ->
  $.post "/journal/new?date=#{date}", () ->
    view(moment(date, 'YYYY-MM-DD').format('YYYY-MM'))

class EntryStore
  constructor: () ->
    riot.observable(this)

    this.on 'journal-update', this.journal_update
    this.on 'add-tag', this.add_tag
    this.on 'remove-tag', this.on_remove_tag
    this.on 'browse-tag', this.on_browse_tag

  journal_update: (entry) ->
    $.ajax json_request
      url: "/journal/update"
      success: (data) ->
        RiotControl.trigger("journal-updated", data)

      data: entry

  add_tag: (entry_id, tag) ->
    $.post
      url: "/journal/add-tag/#{entry_id}/#{tag}"

  on_remove_tag: (entry_id, tag) ->
    $.post
      url: "/journal/remove-tag/#{entry_id}/#{tag}"

  on_browse_tag: (name) ->
    riot.route("tag/#{name}")

main = () ->
  initialize()

  entry_store = new EntryStore

  RiotControl.addStore(entry_store)

  # Install datepicker
  $("#journal-new-entry-date").datepicker
    onSelect: (datestr) ->
      date = moment(datestr, "MM/DD/YYYY")
      riot.route("create/#{date.format('YYYY-MM-DD')}")

  # Install router
  riot.route((action, date) ->
    switch action
      when 'view' then view(date)
      when 'create' then create(date)
      when 'tag' then tag(date)
      when '' then riot.route("view/#{moment().format('YYYY-MM')}")
      else true)

  riot.route.base("/journal#")
  riot.route.start(true)
  unless window.location.hash.length > 2
    riot.route("view/#{moment().format('YYYY-MM')}")

  socket = window.Common.make_socket "journal/sync", (m) ->
    entry = $.parseJSON(m.data)
    if $("#entry-#{entry.ID}").length
      riot.mount("#entry-#{entry.ID}", entry)

window.Journal = 
  initialize: initialize
  main: main
  entry_store: entry_store
