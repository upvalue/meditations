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

window.Common = 
  json_request: json_request
  make_editor: make_editor
