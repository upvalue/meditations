intro_change = (selector, current_step, text) ->
  () ->
    setTimeout(() ->
      if window.intro._currentStep == current_step - 1
        
        elt = $(selector)
        elt.attr("data-step", current_step - 1)
        elt.attr("data-intro", text)
        # TODO: Attempting to get intro to recognize re-mounted elements
        window.intro._introItems[current_step - 1].element = elt.get(0)
        window.intro.refresh()
        elt.click(intro_change(selector, current_step, text))
    , 1000)

help = (() ->
  # Starts at two because step 1 is hardcoded in the habits.htm template
  step = 2
  (selector, text, position) ->
    current_step = step
    elt = $(selector)
    # This is done because modifying the elements can cause introJS to lose track of things
    elt.click(intro_change(selector, current_step, text))
      
    elt.attr("data-step", current_step)
    elt.attr("data-intro", text)
    step += 1
)()

$(document).ready () ->
  intro = introJs()

  help "section.scope:visible:first",
    "This is a daily scope. All tasks belong to a scope; scopes are created for each unit of time (day, month, year) that passes."

  help "#scope-month section.scope:visible:first .pull-right",
    "One can navigate through time scopes using the controls next to them."

  help "section.entry:visible:first",
    "This is a task. A task is created with a name, but can have comments, success status, and time added later."

  help "section.scope:visible:first .octicon-plus",
    "Tasks can be added to any scope using the plus button next to the scope."

  help "section.entry:visible:first .btn:first",
    "Clicking on the task's name will cycle its status through the three possible statuses: unset, complete, and incomplete."

  help "section.entry:visible:first .pull-xs-right",
    "These controls are used to comment, delete, set time, and re-order tasks within a scope."

  help "#scope-month section.entry:visible:first .octicon-clippy",
    "In addition, monthly and yearly scopes have a button to quickly copy tasks to the left, so names don't have to be repeatedly re-typed."

  help "#scope-year section.entry:visible:first",
    "Notice that completion and time statistics in higher scopes are calculated based on what has happened in lower scopes. These statistics are based on shared names, so one-off tasks do not generate statistics."

  help "#scope-year section.entry:visible:first .streak",
    "In addition, yearly scopes contain success streaks: the left number is the current active streak, and the right is the best."

  help "#scope-bucket",
    "On top of time-based scopes, there are also 'bucket' scopes which can be used to track non time sensitive goals."
  
  help "#scope-bucket .octicon-briefcase",
    "Use the bucket modal to create and change which bucket scope is visible."

  help "section.entry:visible:first .octicon-comment",
    "For comment editing functionality, see: <a href=\"https://yabwe.github.io/medium-editor/\">Medium Editor documentation</a>"

  window.intro = intro

  $("#tutorial-btn").click () -> intro.start()
