# habits.coffee - habits code

common = window.Common
current_date = false
current_bucket = false
task_store = false
json_request = common.json_request

Scope =
  bucket: 0
  day: 1
  month: 2
  year: 3
  wrap: 4
  bucketp: (scope) -> scope == Scope.bucket or scope > Scope.year

Status =
  unset: 0
  complete: 1
  incomplete: 2
  wrap: 3

class TaskStore extends common.Store
  mount_scope: (scope, date, mount) ->
    fetch = null

    if Scope.bucketp(scope)
      $.get "/habits/in-bucket/#{scope}", (result) ->
        console.log(result)
        [scope, tasks] = [result.scope, result.tasks]

        result = riot.mount "#scope-bucket", { date: date, scope: scope.ID, tasks: tasks, title: scope["Name"] }
    else
      date = if typeof date == 'string' then moment.utc(date) else date.clone()
      fetch_date = date.clone()

      [fetch, fetch_date, mount] = switch scope
        when Scope.day then ["day", fetch_date, "#scope-day-#{date.format('DD')}"]
        when Scope.month then ["month", fetch_date.date(1), "#scope-month"]
        when Scope.year then ["year", fetch_date.date(1).month(0), "#scope-year"]

      $.get "/habits/in-#{fetch}?date=#{fetch_date.format('YYYY-MM-DD')}", (tasks) ->
        tasks = tasks or []
        result = riot.mount mount, { date: date, scope: scope, tasks: tasks, }

  command: (path, task, thunk) ->
    common.request
      url: path
      data: task
      success: () =>
        thunk(task) if thunk

  on_task_new: (scope, task_name, date) ->
    common.request
      url: "/habits/new"
      success: () =>
        @mount_scope scope.scope, date
      data:
        name: task_name
        scope: scope.scope
        date: date.format "YYYY-MM-DDTHH:mm:ssZ"

  on_comment_update: (task, comment) ->
    common.request
      url: "/habits/comment-update"
      success: () -> false
      data: comment

  on_task_order_up: (task) -> @command '/habits/order-up', task
  on_task_order_down: (task) -> @command '/habits/order-down', task

  on_task_update: (task) -> @command '/habits/update', task

  on_task_delete: (task) ->
    @command '/habits/delete', task, () ->
      $("#task-#{task.ID}").remove()
      riot.update()
      task

# Initialize machinery necessary for task interaction
initialize = () ->
  console.log 'Habits: initializing'
  html5.addElements('scope task scope-days') if html5?

  task_store = new TaskStore()
  window.Habits.task_store = task_store
  RiotControl.addStore(task_store)
  initialize = () -> false
  return true

# Navigation function
view = (from, bucket) ->
  console.log('Browsing from', from)
  today = moment()
  from = moment(from, 'YYYY-MM')
  $("#journal-link").attr "href", "/journal#view/#{from.format('YYYY-MM')}"
  document.title = "#{from.format('MMM YYYY')} / habits"
  current_date = from.clone()
  current_bucket = parseInt(bucket)

  task_store.mount_scope Scope.month, from
  task_store.mount_scope Scope.year, from
  task_store.mount_scope current_bucket, from

  # Allow days up to the current date
  # Note: Day <scope> tags must be mounted only after the <scope-days> tag is, thus we pass it a function for doing what we want
  riot.mount "scope-days",
    thunk: () ->
      date = 1
      while date <= from.daysInMonth()
        next = from.clone().date(date)
        if next > today
          check = next.clone()
          # Display the next day 4 hours in advance so tasks can easily be added to it
          unless check.subtract(4, 'hours') < today 
            break
        task_store.mount_scope Scope.day, next
        date += 1

main = () ->
  console.log 'Habits: installing router'

  initialize()

  # Install Router
  RiotControl.on "change-date", (forward, scope) ->
    date = scope.date.clone().date(1)
    date[if forward then 'add' else 'subtract'](1, if scope.scope == Scope.month then 'months' else 'years')
    riot.route "view/#{date.format('YYYY-MM')}/#{current_bucket or 0}"

  RiotControl.on "change-bucket", (bucket) ->
    riot.route "view/#{current_date.format('YYYY-MM')}/#{bucket}"

  common.route "/habits#", "view/#{moment().format('YYYY-MM')}/0", 
    view: view
    no_action: () -> riot.route("view/#{moment().format('YYYY-MM')}/0")

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
    whole_scope = msg.wholescope
    task = msg.task
    # No need to refresh if task is not in the current scope
    date = moment.utc(task.date)
    if task_near(task, current_date)
      if whole_scope
        console.log 'Mounting whole scope!'
        task_store.mount_scope task.scope, date
      else
        RiotControl.trigger 'task-updated', task

# Export variables
window.Habits =
  Scope: Scope,
  Status: Status,
  initialize: initialize,
  task_store: task_store
  main: main
