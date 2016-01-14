# journal.coffee - Journal code

initialize = () ->
  console.log 'Journal: initializing'
  if html5?
    html5.addElements('scope task scope-days')

  initialize = () -> false
  true

entry_new = () ->
  #$("#entry-new-input").datepicker("show")
  console.log "Entry-new"

view = (date) ->
  $.get "/journal/entries?date=#{date}", (entries) ->
    riot.mount('entries')

create = (date) ->
  true

main = () ->
  initialize()

  # Install datepicker
  $("#journal-new-entry-date").datepicker
    onSelect: (datestr) ->
      date = moment(datestr, "MM/DD/YYYY")
      riot.route("create/#{date.format('YYYY-MM-DD')}")
      #riot.route
      #console.log date

  # Install router
  riot.route((action, date) ->
    switch action
      when 'view' then view(date)
      else true)

  riot.route.start(true)
  riot.route("view/#{moment().format('YYYY-MM')}")

window.Journal = 
  initialize: initialize
  main: main
