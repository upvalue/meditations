
window.Common =
  request: (data) ->
    ret = $.extend({type: "POST", contentType: "application/json; charset=UTF-8"}, data)
    ret.data = JSON.stringify(ret.data)
    return $.ajax(ret)

  make_editor: (selector, focus, blur, args = {}) ->
    editor = window.Common.editor = new MediumEditor selector,
      $.extend({
        autoLink: true
        placeholder: false
        toolbar: {
          buttons: ['bold', 'italic', 'underline', 'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        }
      }, args)

    editor.subscribe "focus", () ->
      $("#saved-button").removeClass "octicon-check"
      $("#saved-button").addClass "octicon-circle-slash"

      $(window).on("beforeunload", focus)

    editor.subscribe "blur", () ->
      $("#saved-button").addClass "octicon-check"
      $("#saved-button").removeClass "octicon-circle-slash"

      blur()
      $(window).off("unload")

    editor

  make_socket: (location, onmessage) =>
    url = "ws://#{window.location.hostname}:#{window.location.port}/#{location}"
    socket = new WebSocket url
    socket.onopen = (m) ->
      console.log "Connected to #{url} websocket"
    socket.onmessage = (m) ->
      console.log "#{location}: Socket message", m
      onmessage $.parseJSON(m.data)
    # Reconnect to socket on failure for development re-loading
    socket.onclose = () =>
      setTimeout(() =>
        socket = window.Common.make_socket()
        console.log 'Lost websocket connection, retrying in 10 seconds'
      , 10000)

  route: (base, first, routes) ->
    riot.route () ->
      action = [].shift.apply(arguments)
      if routes[action]
        routes[action].apply(this, arguments)
      else if action == '' and routes['no_action']
        routes['no_action'].apply(this, arguments)
      else
        if routes['unknown']
          routes.unknown.apply(this, arguments)
        else
          console.log 'Unknown action', action

    riot.route.base(base)
    riot.route.start(true)
    unless window.location.hash.length > 2
      riot.route(first) if first

  # Automatically register store methods to listen to events with the same name
  register_events: (store) ->
    for key, value of store
      if key.slice(0, 3) == "on_"
        store.on key.slice(3).replace(/_/g, "-"), value

class window.Common.Store
  constructor: () ->
    riot.observable(@)
    window.Common.register_events(@)
