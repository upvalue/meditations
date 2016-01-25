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
  $.get "/journal/entries?date=#{datestr}", (entries) ->
    console.log "View date", entries
    riot.mount('entries',
      date: date
      entries: entries
    )

create = (date) ->
  $.post "/journal/new?date=#{date}", () ->
    view(moment(date, 'YYYY-MM-DD').format('YYYY-MM'))

class EntryStore
  constructor: () ->
    riot.observable(this)

    this.on 'journal-update', this.journal_update

  journal_update: (entry) ->
    $.ajax json_request
      url: "/journal/update"
      success: (data) ->
        #riot.mount("#entry-#{entry.ID}", data)
        RiotControl.trigger("journal-updated", data)

      data: entry

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
      else true)

  riot.route.base("/journal#")
  riot.route.start(true)
  riot.route("view/#{moment().format('YYYY-MM')}")

window.Journal = 
  initialize: initialize
  main: main
  entry_store: entry_store
