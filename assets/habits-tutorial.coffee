intro = (() ->
  step = 2
  (elt, text, position) ->
    elt.attr("data-step", step)
    step += 1
    elt.attr("data-intro", text)
)()

$(document).ready () ->
  intro $("section.scope:visible:first"),
    "This is a daily scope. All tasks belong to a scope; scopes are created for each unit of time (day, month, year) that passes."

  intro $("#scope-month section.scope:visible:first .pull-right"),
    "One can navigate through time scopes using the controls next to them."

  intro $("section.entry:visible:first"),
    "This is a task. A task is created with a name, but can have comments, success status, and time added later."

  intro $("section.scope:visible:first .octicon-plus"),
    "Tasks can be added to any scope using the plus button next to the scope."

  intro $("section.entry:visible:first .btn:first"),
    "Clicking on the task's name will cycle its status through the three possible statuses: unset, complete, and incomplete."

  intro $("section.entry:visible:first .pull-xs-right"),
    "These controls are used to comment, delete, set time, and re-order tasks within a scope."

  intro $("#scope-month section.entry:visible:first .octicon-clippy"),
    "In addition, monthly and yearly scopes have a button to quickly copy tasks to the left, so names don't have to be repeatedly re-typed."

  intro $("#scope-year section.entry:visible:first"),
    "Notice that completion and time statistics in higher scopes are calculated based on what has happened in lower scopes. These statistics are based on shared names, so one-off tasks do not generate statistics."

  intro $("#scope-year section.entry:visible:first .streak"),
    "In addition, yearly scopes contain success streaks: the left number is the current active streak, and the right is the best."

  intro $("#scope-bucket"),
    "On top of time-based scopes, there are also 'bucket' scopes which can be used to track non time sensitive goals."
  
  intro $("#scope-bucket .octicon-briefcase"),
    "Use the bucket modal to create and change which bucket scope is visible."

  intro = introJs()

  $("#tutorial-btn").click () -> intro.start()
