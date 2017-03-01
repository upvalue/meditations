<scope>
  <h6 class=scope-title ref=title></h6>
  <span class="pull-right">
    <span if={opts.scope == window.Habits.Scope.month || opts.scope == window.Habits.Scope.year}>
      <a href="#view/{opts.date.clone().subtract(1, opts.scope == window.Habits.Scope.month ? 'months' : 'years').format('YYYY-MM')}/{opts.current_bucket}"><button class="btn btn-link btn-sm btn-default octicon octicon-chevron-left" title="Previous" onclick={nav_left}></button></a>
      <a href="#view/{opts.date.clone().add(1, opts.scope == window.Habits.Scope.month ? 'months' : 'years').format('YYYY-MM')}/"><button class="btn btn-link btn-sm btn-default octicon octicon-chevron-right" title="Next" onclick={nav_right}></button></a>
    </span>
    <span if={opts.scope > window.Habits.Scope.year}>
      <button class="btn btn-link btn-sm btn-default octicon octicon-briefcase" title="Change bucket" onclick={change_bucket}></button>
    </span>
    <button type=submit class="btn btn-link btn-sm btn-default octicon octicon-plus" title="Add task" onclick={new_task}></button>
  </span>
  <section class=entry data-is=task each={opts.tasks}></task>

  var self = this;

  this.on('mount', function() {
    // These will be mounted at the beginning with no data, so hide the ones without data passed
    var title;
    if(opts.title) {
      title = opts.title;
    } else {
      switch(opts.scope) {
        case window.Habits.Scope.day: title = opts.date.format("dddd Do"); break;
        case window.Habits.Scope.month: title = opts.date.format("MMMM"); break; 
        case window.Habits.Scope.year: title = opts.date.format("YYYY"); break;
      }
    }

    if(opts.date) {
      $(this.root).show();
      $(this.refs.title).text(title);
    } else {
      $(this.root).hide();
    }
  });

  nav_left(e) {
    e.preventDefault();
    RiotControl.trigger('change-date', false, opts);
  }

  nav_right(e) {
    e.preventDefault();
    RiotControl.trigger('change-date', true, opts)
  }

  new_task(e) {
    var title = window.prompt("Task name");
    if(title != null&&title!="") {
      console.log('Adding a new task', opts.date);
      RiotControl.trigger('task-new', opts, title, opts.date);
    }
  }

  change_bucket(e) {
    $.get("/habits/buckets", function(result) {
      $("#bucket-select").empty();
      console.log(result);
      for(var i = 0; i != result.length; i++) {
        $("<option selected value="+result[i].ID+">"+result[i].Name+"</option>").appendTo($("#bucket-select"));
      }
      $("#bucket-select-button").click(function() {
        var selected = parseInt($("#bucket-select option:selected").val());
        RiotControl.trigger("change-bucket", selected);
      });
      $("#bucket-add").click(function() {
        $.post("/habits/bucket-new/"+$("#bucket-add-name").val(), function(scope) {
          RiotControl.trigger("change-bucket", scope.ID);
        });
      });
      $("#bucket-modal").modal();
    });
  }
</scope>

<scope-days>
  <section data-is=scope class=scope id="scope-day-31" visible=false></section>
  <section data-is=scope class=scope id="scope-day-30" visible=false></section>
  <section data-is=scope class=scope id="scope-day-29" visible=false></section>
  <section data-is=scope class=scope id="scope-day-28" visible=false></section>
  <section data-is=scope class=scope id="scope-day-27" visible=false></section>
  <section data-is=scope class=scope id="scope-day-26" visible=false></section>
  <section data-is=scope class=scope id="scope-day-25" visible=false></section>
  <section data-is=scope class=scope id="scope-day-24" visible=false></section>
  <section data-is=scope class=scope id="scope-day-23" visible=false></section>
  <section data-is=scope class=scope id="scope-day-22" visible=false></section>
  <section data-is=scope class=scope id="scope-day-21" visible=false></section>
  <section data-is=scope class=scope id="scope-day-20" visible=false></section>
  <section data-is=scope class=scope id="scope-day-19" visible=false></section>
  <section data-is=scope class=scope id="scope-day-18" visible=false></section>
  <section data-is=scope class=scope id="scope-day-17" visible=false></section>
  <section data-is=scope class=scope id="scope-day-16" visible=false></section>
  <section data-is=scope class=scope id="scope-day-15" visible=false></section>
  <section data-is=scope class=scope id="scope-day-14" visible=false></section>
  <section data-is=scope class=scope id="scope-day-13" visible=false></section>
  <section data-is=scope class=scope id="scope-day-12" visible=false></section>
  <section data-is=scope class=scope id="scope-day-11" visible=false></section>
  <section data-is=scope class=scope id="scope-day-10" visible=false></section>
  <section data-is=scope class=scope id="scope-day-09" visible=false></section>
  <section data-is=scope class=scope id="scope-day-08" visible=false></section>
  <section data-is=scope class=scope id="scope-day-07" visible=false></section>
  <section data-is=scope class=scope id="scope-day-06" visible=false></section>
  <section data-is=scope class=scope id="scope-day-05" visible=false></section>
  <section data-is=scope class=scope id="scope-day-04" visible=false></section>
  <section data-is=scope class=scope id="scope-day-03" visible=false></section>
  <section data-is=scope class=scope id="scope-day-02" visible=false></section>
  <section data-is=scope class=scope id="scope-day-01" visible=false></section>

  this.on('mount', function() {
    if(opts.thunk) { 
      console.log("scope-days mounted");
      opts.thunk();
    }
  });
</scope-days>

<task id="task-{ID}">
  <button class="btn btn-xs btn-default {btn-success: status == window.Habits.Status.complete} {btn-danger: status == window.Habits.Status.incomplete}" onclick={change_status}>
    {name}
    <span if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year )&& (total_tasks > 0)}>
      {completed_tasks}/{total_tasks}
    </span>
    <span if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year) && (completion_rate > -1) }>({completion_rate}%)</span>
  </button>
  <span class="pull-xs-right">
    <span if={minutes > 0 || hours > 0}>
      <i class="octicon octicon-clock"></i>
      <span if={hours > 0}>{hours}h</span>
      <span if={minutes > 0}>{minutes}m </span>
    </span>
    <span class="streak" if={scope == window.Habits.Scope.year && best_streak > 0}>
      <i title="Current/Best streak" class="octicon octicon-dashboard"></i>
      <span>{streak}/{best_streak}</span>
    </span>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-comment" title="Add comment" onclick={edit_comment}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-trashcan" title=Delete onclick={delete}></button>
    <button if={scope == window.Habits.Scope.day} title="Log time"
      class="task-control btn-link btn btn-sm btn-default octicon octicon-clock" onclick={log_time}></button>
    <button if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year)} title="Copy to present day" class="task-control btn btn-link btn-sm btn-default octicon octicon-clippy" onclick={copy}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-chevron-up" title="Move down" onclick={up}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-chevron-down" title="Move up" onclick={down}></button>
  </span>
  <div class="comment" id="comment-{ID}" onclick={edit_comment} contenteditable=true></div>

  var self = this

  var comment_div = function() { return $("#comment-"+self.ID); }

  RiotControl.on('task-updated', function(task) {
    if(task.ID == self.__.item.ID) {
      self.__.item = task;
      console.log("Updating task",task);
      self.update(task);
      comment_div().html(task.comment.body);
    }
  });

  var save = function() {
    console.log("Comment update", comment_div().html());
    RiotControl.trigger('comment-update', self.__.item, {
      ID: self.comment.ID || 0,
      body: comment_div().html(),
      task_id: self.__.item.ID
    });
  }

  self.one('mount', function() {
    comment_div().html(self.comment.body);
    self.editor = window.Common.make_editor(comment_div(), save, save);
  });

  change_status(e) {
    var task = self.__.item;
    task.status = (task.status + 1) % window.Habits.Status.wrap;
    RiotControl.trigger('task-update', task);
  }

  delete(e) {
    if(window.confirm('Really delete?')) {
      RiotControl.trigger('task-delete', self.__.item)
    }
  }

  log_time(e) {
    var time = window.prompt("Log time (HH:MM or minutes, 0 to clear)");
    RiotControl.trigger('task-log-time', self.__.item, time);
  }

  up(_) {
    RiotControl.trigger('task-order-up', self.__.item);
  }

  down(_) {
    RiotControl.trigger('task-order-down', self.__.item);
  }

  edit_comment(_) {
    comment_div().focus();
  }

  copy(_) {
    var scope = self.__.item.scope - 1
    var date = moment(self.__.item.date).utc()
    // Create task on current day from monthly task
    if(scope == window.Habits.Scope.day) {
      date.date(moment().clone().add(4, 'hour').date());
    } else if(scope == window.Habits.Scope.month) {
      date.month(moment().month());
      date.date(moment().date());
    }
    RiotControl.trigger('task-new', {date: date, scope: scope}, self.__.item.name, date)
  }
</task>
