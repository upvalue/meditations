common = window.Common

class WikiStore extends common.Store
  on_add_page: (title) ->
    console.log(title)

actions =
  index: () ->
    common.request
      type: "GET"
      url: "/wiki/index"
      success: (pages) ->
        riot.mount 'wiki-index',
          pages: pages

window.Wiki =
  initialize: () ->
    console.log 'Wiki: initializing'
    html5.addElements ' controlsindex page' if html5?
    initialize = () -> false

  main: () ->
    @initialize()

    riot.mount 'controls'
    RiotControl.addStore new WikiStore
    
    common.route '/wiki#', 'index', actions
