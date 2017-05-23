# habits.coffee - habits code
current_date = false
current_bucket = 0
task_store = false
filter_name = null

common = require("./common-es6").default
HabitsES6 = require("./habits-es6").default
Scope = HabitsES6.Scope
Status = HabitsES6.Status

TaskStore = HabitsES6.TaskStore

# Navigation function
view = (from, bucket) ->
  console.log('Browsing from', from)
  from = moment(from, 'YYYY-MM')
  $("#journal-link").attr "href", "/journal#view/#{from.format('YYYY-MM')}"
  document.title = "#{from.format('MMMM YYYY')} / habits"
  current_date = from.clone()
  current_bucket = parseInt(bucket)

  task_store.mount_scope Scope.month, from
  task_store.mount_scope Scope.year, from
  task_store.mount_scope current_bucket, from

  # Allow days up to the current date
  # Note: Day <scope> tags must be mounted only after the <scope-days> tag is, thus we pass it a function for doing what we want
  console.log "Mounting <scope-days>"
  riot.mount "scope-days",
    thunk: () ->
      task_store.mount_days from

main = () ->
  window.Common.initialize()
  console.log 'Habits: initializing'

  task_store = new HabitsES6.TaskStore()
  window.Habits.task_store = task_store
  RiotControl.addStore(task_store)

  # Install Router
  RiotControl.on "change-date", (forward, scope) ->
    date = scope.date.clone().date(1)
    date[if forward then 'add' else 'subtract'](1, if scope.scope == Scope.month then 'months' else 'years')
    route "view/#{date.format('YYYY-MM')}/#{current_bucket or 0}"

  RiotControl.on "change-bucket", (bucket) ->
    route "view/#{current_date.format('YYYY-MM')}/#{bucket}"

  common.route "/habits#", "view/#{moment().format('YYYY-MM')}/0", 
    view: view
    no_action: () -> route("view/#{moment().format('YYYY-MM')}/0")

  # Install modal datepickers
  $(".datepicker").datepicker(dateFormat: 'yy-mm-dd')

  # Install filter
  $("#task-filter").submit (e) ->
    e.preventDefault()

  # Setup websocket
  task_near = (task, date2) ->
    date1 = moment.utc(task.date)
    # only compare down to months because we don't browse by the day
    return ((task.scope == Scope.month or task.scope == Scope.day) and date1.month() == date2.month() and 
      date1.year() == date2.year()) or
      (task.scope == Scope.year and date1.year() == date2.year()) or
      Scope.bucketp(task.scope)

  socket = false
  socket = window.Common.make_socket "habits/sync", (msg) ->
    task = msg.task
    # No need to refresh if task is not in the current scope
    date = moment.utc(task.date)
    if task_near(task, current_date)
      msg.wholescope = true # TODO this is a bandaid fix for time change cloneNode issue
      if msg.wholescope
        #console.log 'Mounting whole scope!'
        task_store.mount_scope task.scope, date
      else
        RiotControl.trigger 'task-updated', task

# Export variables
window.Habits =
  Scope: Scope,
  Status: Status,
  task_store: task_store
  main: main


Object.assign(window.Habits, require("./habits-es6").default)
