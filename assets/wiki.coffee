common = window.Common

class WikiStore extends common.Store
  on_add_page: (title) ->
    common.request url: "/wiki/new/#{title}"
    riot.route("view/#{title}")

  on_edit_page: (title, msg) ->
    console.log 'edit-page', title, msg
    common.request
      url: "/wiki/edit",
      data: msg
      success: () -> riot.route("view/#{title}")

actions =
  index: () ->
    common.request
      type: "GET"
      url: "/wiki/index"
      success: (pages) ->
        riot.mount 'index', pages: pages

  view: (title) ->
    $("index").remove()
    common.request type: "GET", url: "/wiki/page/#{title}", success: (page) ->
      riot.mount 'page', page

window.Wiki =
  initialize: () ->
    console.log 'Wiki: initializing'
    html5.addElements ' wiki-controls index page' if html5?
    initialize = () -> false

  main: () ->
    @initialize()

    riot.mount 'wiki-controls'
    RiotControl.addStore new WikiStore
    
    common.route '/wiki#', 'index', actions
