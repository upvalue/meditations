make_editor = (selector, args = {}) ->
  editor = window.Common.editor = new MediumEditor selector,
    $.extend({
      autoLink: true
      placeholder: false
      toolbar: {
        buttons: ['bold', 'italic', 'underline', 'anchor', 'h2', 'h3', 'quote', 'orderedlist', 'unorderedlist']
      }
    }, args)
  editor

json_request = (data) ->
  ret = $.extend({type: "POST", contentType: "application/json; charset=UTF-8"}, data)
  ret.data = JSON.stringify(ret.data)
  return ret

make_socket = (location, onmessage) ->
  url = "ws://#{window.location.hostname}:#{window.location.port}/#{location}"
  socket = new WebSocket url
  socket.onopen = (m) ->
    console.log "Connected to #{url} websocket"
  socket.onmessage = (m) ->
    console.log "#{location}: Socket message #{m}"
    onmessage(m)
  # Reconnect to socket on failure for development re-loading
  #socket.onclose = () ->
  #  setTimeout(() ->
  #    socket = make_socket()
  #    console.log 'Lost websocket connection, retrying in 10 seconds'
  #  , 10000)

window.Common = 
  json_request: json_request
  make_editor: make_editor
  make_socket: make_socket
