
window.Common =
  request: (data) ->
    ret = $.extend({type: "POST", contentType: "application/json; charset=UTF-8"}, data)
    ret.data = JSON.stringify(ret.data)
    return $.ajax(ret)

  initialize: () ->
    # Hack: Replace Font Awesome icons used by medium-editor-table with octicons
    show_back = MediumEditorTable.prototype.show
    MediumEditorTable.prototype.show = () ->
      $(".fa").removeClass("fa").addClass("octicon")

      fareplace = (bef,aft) ->
        $(".fa-#{bef}").removeClass("fa-#{bef}").addClass("octicon-#{aft}")
      
      fareplace 'long-arrow-up', 'arrow-up'
      fareplace 'long-arrow-down', 'arrow-down'
      fareplace 'long-arrow-right', 'arrow-right'
      fareplace 'long-arrow-left', 'arrow-left'
      fareplace 'close', 'x'
      fareplace 'trash-o', 'trashcan'
      show_back.call(this, arguments)

  make_editor: (selector, focus, blur, args = {}) ->
    editor = window.Common.editor = new MediumEditor selector,
      $.extend({
        autoLink: true
        placeholder: false
        extensions: 
          table: new MediumEditorTable
        toolbar:
          buttons: ['bold', 'italic', 'underline', 'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table']
      }, args)

    # Checkmark indicates whether or not the work has been saved
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

  ##### TUTORIALS
  tutorial_steps: []

  load_tutorial: (thunk) =>
    window.Common.tutorial_thunk = thunk
    $("#tutorial-btn").text("Tutorial")
    $("#tutorial-btn").attr "disabled", false
    $("#tutorial-btn").click () ->
      intro = window.Common.tutorial_thunk()
      $("#tutorial-btn").unbind('click').click () ->
        intro.start()
      intro.start()

  tutorial_refresh: (current_step) ->
    $.each(window.Common.tutorial_steps, (i, step) ->
      # Re-find elements by selector.
      elt = $(step.selector)
      console.log(elt, step.selector)
      # If tutorial is active, an element may need to have introJs css classes back to it
      if current_step and i+1 == current_step
        elt.addClass "introjs-showElement introjs-relativePosition"
      window.intro._introItems[i].element = elt.get(0)
    )

  tutorial_change: (selector, current_step, text) ->
    () ->
      setTimeout(() ->
        if window.intro._currentStep == current_step - 1
          elt = $(selector)
          elt.attr("data-step", current_step)
          elt.attr("data-intro", text)
          window.Common.tutorial_refresh(current_step)
          elt.click(window.Common.tutorial_change(selector, current_step, text))
      , 500)

  tutorial_help: (() =>
    step = 1
    (selector, text, position) ->
      current_step = step
      # This is done because modifying the elements can cause introJS to lose track of things
      elt = $(selector)
      elt.click(window.Common.tutorial_change(selector, current_step, text))
        
      console.log(step, selector, text)
      elt.attr("data-step", current_step)
      elt.attr("data-intro", text)
      step += 1
  )()

  tutorial: (steps) =>
    console.log("Initializing tutorial with #{steps.length} steps")
    window.intro = intro = window.introJs()
    intro.onexit(window.Common.tutorial_refresh)
    $.each(steps, (i, step) =>
      window.Common.tutorial_steps.push(step)
      window.Common.tutorial_help(step.selector, step.text)
    )
    intro
    #$("#tutorial-btn").click () -> intro.start()

  ##### SOCKETS
  make_socket: (location, onmessage) =>
    protocol = if window.MeditationsConfig.WebsocketSecure then "wss" else "ws"
    url = "#{protocol}://#{window.location.hostname}:#{window.location.port}/#{location}"
    socket = new WebSocket url
    socket.onopen = (m) ->
      console.log "Connected to #{url} websocket"
    socket.onmessage = (m) ->
      #console.log "#{location}: Socket message", m
      onmessage JSON.parse(m.data)
    # Reconnect to socket on failure for development re-loading
    #socket.onclose = () =>
    #  setTimeout(() =>
    #    console.log 'Lost websocket connection, retrying in 10 seconds'
    #  , 10000)

  route: (base, first, routes) ->
    route () ->
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

    route.base(base)
    route.start(true)
    unless window.location.hash.length > 2
      route(first) if first

  # Automatically register store methods to listen to events with the same name
  register_events: (store) ->
    for key, value of store
      if key.slice(0, 3) == "on_"
        store.on key.slice(3).replace(/_/g, "-"), value

class window.Common.Store
  constructor: () ->
    riot.observable(@)
    window.Common.register_events(@)
