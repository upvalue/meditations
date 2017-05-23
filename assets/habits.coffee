# habits.coffee - habits code
common = window.Common
current_date = false
current_bucket = 0
task_store = false
filter_name = null

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
  # This function mounts all days; it is only called when the month navigation is changed/on startup
  mount_days: (date) =>
    console.log "Mounting all days"
    date = if typeof(date) == 'string' then moment.utc(date) else date.clone()
    today = moment()

    limit = date.daysInMonth() + 1

    # If we are mounting the current month, we will not mount dates too far in advance so as not to clutter the screen
    if today.month() == date.month() and today.year() == date.year()
      limit = today.date() + 1
      # But do mount the next day if it's within 4 hours before midnight
      next = today.clone()
      next.add(4, 'hours')
      if next.date() != today.date()
        limit += 1

    console.log "Getting daily tasks"
    $.get "/habits/in-days?date=#{date.format('YYYY-MM-DD')}&limit=#{limit}", (results) ->
      results = results or []
      for result in results
        date = moment(result.Date, "YYYY-MM-DD")
        opts = date: date, scope: Scope.day, tasks: result.Tasks
        #console.log "Mounting day #scope-day-#{date.format('DD')}", opts
        riot.mount "#scope-day-#{date.format('DD')}", opts

  mount_scope: (scope, date, mount) ->
    fetch = null

    if Scope.bucketp(scope)
      $.get "/habits/in-bucket/#{scope}", (result) ->
        console.log(result)
        [scope, tasks] = [result.scope, result.tasks]

        result = riot.mount "#scope-bucket", { date: date, scope: scope.ID, tasks: tasks, title: scope["Name"], current_bucket: current_bucket }
    else
      date = if typeof date == 'string' then moment.utc(date) else date.clone()
      fetch_date = date.clone()

      [fetch, fetch_date, mount] = switch scope
        when Scope.day then ["day", fetch_date, "#scope-day-#{date.format('DD')}"]
        when Scope.month then ["month", fetch_date.date(1), "#scope-month"]
        when Scope.year then ["year", fetch_date.date(1).month(0), "#scope-year"]

      $.get "/habits/in-#{fetch}?date=#{fetch_date.format('YYYY-MM-DD')}", (tasks) ->
        tasks = tasks or []
        opts = date: date, scope: scope, tasks: tasks, current_bucket: current_bucket
        #console.log "Mounting day", opts
        result = riot.mount mount, opts

  command: (path, task, thunk) ->
    common.request
      url: path
      data: task
      success: () => thunk(task) if thunk

  on_task_new: (scope, task_name, date) ->
    common.request
      url: "/habits/new"
      success: () => @mount_scope scope.scope, date
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

  on_task_log_time: (task, time) ->
    # Break down hours and minutes
    time = time.split(":")
    if time.length == 1
      task["hours"] = 0
      task["minutes"] = parseInt(time[0])
    else if time.length == 2
      task["hours"] = parseInt(time[0])
      task["minutes"] = parseInt(time[1])
    else
      console.log("Bad time", time)
      return

    # Do not update comment
    delete task.comment
    @command '/habits/update', task

  on_task_update: (task) ->
    # Do not update comment
    delete task.comment
    @command '/habits/update', task

  on_task_delete: (task) ->
    @command '/habits/delete', task, () ->
      $("#task-#{task.ID}").remove()
      #riot.update()
      task

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

  task_store = new TaskStore()
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
