# habits.coffee - habits code

current_date = false
current_bucket = false
task_store = false
json_request = window.Common.json_request

Scope =
  bucket: 0
  day: 1
  month: 2
  year: 3
  wrap: 4
  bucketp: (scope) -> scope > Scope.year

Status =
  unset: 0
  complete: 1
  incomplete: 2
  wrap: 3

class TaskStore
  constructor: ->
    riot.observable(this)

    self = this

    self.on 'comment-update', (task, comment) ->
      $.ajax json_request
        url: "/habits/comment-update"
        success: () -> false
        data: comment

    self.on 'task-new', (scope, task_name, date) ->
      $.ajax json_request
        url: "/habits/new"
        success: () ->
          self.mount_scope scope.scope, date
        data:
          name: task_name
          scope: scope.scope
          date: date.format "YYYY-MM-DDTHH:mm:ssZ"
        
    # Run a command that changes a task and displays changes
    command = (path, thunk) ->
      (task) ->
        req =
          type: "POST"
          url: path
          data: JSON.stringify(task)
          contentType: "application/json; charset=UTF-8"
          success: thunk(task)
        $.ajax(req)

    self.on 'task-delete', command('/habits/delete', (task) ->
      () ->
        $("#task-#{task.ID}").remove()
        riot.update()
    )

    self.on 'task-update', command('/habits/update', () ->
      (task) ->
        self.mount_task opts: task
    )

    remount = (task) ->
      () ->
        self.mount_scope task.scope, task.date

    self.on 'task-order-up', command('/habits/order-up', remount)
    self.on 'task-order-down', command('/habits/order-down', remount)

  mount_task: (task) ->
    riot.mount("#task-#{task.ID}", task)

  mount_scope: (scope, date, mount) ->
    self = this
    fetch = null

    if Scope.bucketp(scope)
      $.get "/habits/in-bucket/#{scope}", (result) ->
        console.log(result)
        scope = result["scope"]
        tasks = result["tasks"]

        result = riot.mount "#scope-bucket", { date: date, scope: scope.ID, tasks: tasks, title: scope["Name"] }
    else
      if typeof date == 'string'
        date = moment.utc(date)
      else
        date = date.clone()

      fetch_date = date.clone()

      [fetch, fetch_date, mount] = switch scope
        when Scope.day then ["day", fetch_date, "#scope-day-#{date.format('DD')}"]
        when Scope.month then ["month", fetch_date.date(1), "#scope-month"]
        when Scope.year then ["year", fetch_date.date(1).month(0), "#scope-year"]

      $.get "/habits/in-#{fetch}?date=#{fetch_date.format('YYYY-MM-DD')}", (tasks) ->
        tasks = tasks or []
        result = riot.mount mount, { date: date, scope: scope, tasks: tasks, }

# Initialize machinery necessary for task interaction
initialize = () ->
  console.log 'Habits: initializing'
  if html5?
    html5.addElements('scope task scope-days')

  task_store = new TaskStore()
  window.Habits.task_store = task_store
  RiotControl.addStore(task_store)
  initialize = () -> false
  return true

# Navigation function
browse = (from, bucket) ->
  console.log('Browsing from', from)
  today = moment()
  from = moment(from, 'YYYY-MM')
  document.title = "#{from.format('MMM YYYY')} / habits"
  current_date = from.clone()
  current_bucket = parseInt(bucket)

  task_store.mount_scope Scope.month, from
  task_store.mount_scope Scope.year, from
  task_store.mount_scope current_bucket, from

  # Allow days up to the current date
  # Note: Day <scope> tags must be mounted only after the <scope-days> tag is, thus we pass it a function for doing what we want
  riot.mount("scope-days", {
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
  })

main = () ->
  console.log 'Habits: installing router'

  initialize()

  # Install Router
  RiotControl.on "change-date", (forward, scope) ->
    date = scope.date.clone().date(1)
    date[if forward then 'add' else 'subtract'](1, if scope.scope == Scope.month then 'months' else 'years')
    riot.route "from/#{date.format('YYYY-MM')}/#{current_bucket or 0}"

  RiotControl.on "change-bucket", (bucket) ->
    riot.route "from/#{current_date.format('YYYY-MM')}/#{bucket}"

  riot.route((action, date, bucket) ->
    switch action
      when 'from' then browse(date, bucket)
      when '' then riot.route("from/#{moment().format('YYYY-MM')}/4")
      else console.log "Unknown action", riot.route.query(), action, date, bucket)

  riot.route.base('/habits#')
  riot.route.start(true)
  riot.route("from/#{moment().format('YYYY-MM')}/4")

  # Setup websocket
  task_near = (task, date2) ->
    date1 = moment.utc(task.date)
    # only compare down to months because we don't browse by the day
    # Sorry.
    return ((task.scope == Scope.month or task.scope == Scope.day) and date1.month() == date2.month() and 
      date1.year() == date2.year()) or
      (task.scope == Scope.year and date1.year() == date2.year()) or
      Scope.bucketp(task.scope)
      #task.scope == Scope.bucket

  socket = false
  make_socket = () ->
    url = "ws://#{window.location.hostname}:#{window.location.port}/habits/sync"
    socket = new WebSocket url
    socket.onopen = (m) ->
      console.log "Connected to #{url} websocket"
    socket.onmessage = (m) ->
      console.log "Socket message #{m}"
      task = $.parseJSON(m.data)
      # No need to refresh if task is not in the current scope
      date = moment.utc(task.date)
      if task_near(task, current_date)
        task_store.mount_scope task.scope, date
    # Reconnect to socket on failure for development re-loading
    #socket.onclose = () ->
    #  setTimeout(() ->
    #    socket = make_socket()
    #    console.log 'Lost websocket connection, retrying in 10 seconds'
    #  , 10000)
  socket = make_socket()

# Export variables
window.Habits =
  Scope: Scope,
  Status: Status,
  initialize: initialize,
  task_store: task_store
  main: main
