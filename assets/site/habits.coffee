# habits.coffee - habits code
Scope =
  day: 0
  month: 1
  year: 2
  bucket: 3

Status =
  unset: 0
  complete: 1
  incomplete: 2
  wrap: 3

class TaskStore
  mount_scope: (scope, date, mount) ->
    self = this
    fetch = null

    if typeof date == 'string'
      date = moment.utc(date)
    else
      date = date.clone()

    fetch_date = date.clone()

    [fetch, fetch_date, mount] = switch scope
      when Scope.day then ["day", fetch_date, "#scope-day-#{date.format('DD')}"]
      when Scope.month then ["month", fetch_date.date(1), "#scope-month"]
      when Scope.year then ["year", fetch_date.date(1).month(0), "#scope-year"]
      when Scope.bucket then ["bucket", fetch_date, "#scope-bucket"]

    $.get "/habits/tasks/in-#{fetch}?date=#{fetch_date.format('YYYY-MM-DD')}", (tasks) ->
      tasks = tasks or []
      title = switch
        when scope == Scope.day then date.format('Do')
        when scope == Scope.month then date.format('MMMM')
        when scope == Scope.year then date.format('YYYY')
        when scope == Scope.bucket then "Bucket"
      result = riot.mount mount, { date: date, scope: scope, tasks: tasks, title: title }

  constructor: ->
    riot.observable(this)

    self = this

    self.on 'comment-update', (task, comment) ->
      $.post 'habits/comment/update', comment, (saved_comment) ->
        self.trigger 'comment-updated', task, saved_comment

    self.on 'task-new', (scope, task_name, created_at) ->
      $.post 'habits/task/new', { name: task_name, scope: scope.scope, created_at: created_at.format('YYYY-MM-DD') }, () ->
        self.mount_scope scope.scope, scope.date
        
    remount = (path) ->
      (task) ->
        $.post path, task, () ->
          self.mount_scope task.scope, task.created_at

    self.on 'task-delete', remount('/habits/task/delete')
    self.on 'task-order-down', remount('/habits/task/order-down')
    self.on 'task-order-up', remount('/habits/task/order-up')
    self.on 'task-update', remount('/habits/task/update')

main = () ->
  console.log 'Initializing main habits page'

  if html5?
    html5.addElements('scope task')

  task_store = window.task_store = new TaskStore()
  RiotControl.addStore(task_store)

  current_date = false

  # Navigation
  browse_from = (from) ->
    console.log('Browsing from', from)
    today = moment()
    from = moment(from, 'YYYY-MM')
    document.title = "#{from.format('MMM YYYY')} / habits"
    current_date = from.clone()

    task_store.mount_scope Scope.month, from
    task_store.mount_scope Scope.year, from
    task_store.mount_scope Scope.bucket, from

    # Allow days up to the current date
    # Note: Day <scope> tags must be mounted only after the <scope-days> tag is, thus we pass it a function for doing what we want
    riot.mount("scope-days", {
      thunk: () ->
        date = 1
        while date <= from.daysInMonth()
          next = from.clone().date(date)
          if next > today
            check = next.clone()
            unless check.subtract(4, 'hours') < today 
              break
          task_store.mount_scope Scope.day, next
          date += 1
    })
  RiotControl.on "change-date", (forward, scope) ->
    riot.route.exec (action, date) ->
      date = scope.date.clone().date(1)
      date[if forward then 'add' else 'subtract'](1, if scope.scope == Scope.month then 'months' else 'years')
      riot.route "from/#{date.format('YYYY-MM')}"

  # Handle routes
  riot.route((action, rest) ->
    switch action
      when 'from' then browse_from(rest)
      else console.log "Unknown action", action)

  riot.route "from/#{moment().format('YYYY-MM')}"
  
  task_near = (task, date2) ->
    date1 = moment.utc(task.created_at)
    # only compare down to months because that's what we browse
    # Sorry.
    return ((task.scope == Scope.month or task.scope == Scope.day) and date1.month() == date2.month() and 
      date1.year() == date2.year()) or
      (task.scope == Scope.year and date1.year() == date2.year()) or
      task.scope == Scope.bucket

  ### Setup websocket
  socket = false
  make_socket = () ->
    socket = new WebSocket("ws://#{window.location.hostname}:#{window.location.port}/update-subscribe")
    socket.onopen = (m) ->
      console.log 'Connected to /update-subscribe websocket'
    socket.onmessage = (m) ->
      task = $.parseJSON(m.data)
      # No need to refresh if task is not in the current scope
      date = moment.utc(task.created_at)
      console.log task_near(task, current_date), task, current_date
      if task_near(task, current_date)
        task_store.mount_scope task.scope, date
    # Reconnect to socket on failure for development re-loading
    #socket.onclose = () ->
    #  setTimeout(() ->
    #    socket = make_socket()
    #    console.log 'Lost websocket connection, retrying in 10 seconds'
    #  , 10000)
  #socket = make_socket()
  ###

# Export variables
window.Habits =
  Scope: Scope,
  Status: Status,
  TaskStore: TaskStore,
  main: main
