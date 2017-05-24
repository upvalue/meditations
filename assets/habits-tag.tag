<scope>
  <h6 class=scope-title if={!Habits.Scope.bucketp(opts.scope)} ref=title></h6>
  <button if={Habits.Scope.bucketp(opts.scope)} class="octicon octicon-chevron-down btn btn-link"></button>
  <select ref=bucket_select if={Habits.Scope.bucketp(opts.scope)} onchange={change_bucket_select} style="display:inline !important;" class="form-control bucket-select">
    <option>!Overall</option>
  </select>
  <span>
    <span if={opts.scope == window.Habits.Scope.MONTH || opts.scope == window.Habits.Scope.YEAR}>
      <a href="#view/{opts.date.clone().subtract(1, opts.scope == window.Habits.Scope.MONTH ? 'months' : 'years').format('YYYY-MM')}/{opts.current_bucket}"><button class="btn btn-link btn-sm btn-default octicon octicon-chevron-left" title="Previous" onclick={nav_left}></button></a>
      <a href="#view/{opts.date.clone().add(1, opts.scope == window.Habits.Scope.MONTH ? 'months' : 'years').format('YYYY-MM')}/"><button class="btn btn-link btn-sm btn-default octicon octicon-chevron-right" title="Next" onclick={nav_right}></button></a>
    </span>
    <span if={window.Habits.Scope.bucketp(opts.scope)}>
      <button class="btn btn-link btn-sm btn-default octicon octicon-briefcase" title="Change bucket" onclick={change_bucket}></button>
    </span>
    <button type=submit class="btn btn-link btn-sm btn-default octicon octicon-plus" title="Add task" onclick={new_task}></button>
  </span>
  <section class=task data-is=task each={opts.tasks}></task>

  var self = this;

  this.on('mount', function() {
    // These will be mounted at the beginning with no data, so hide the ones without data passed
    var title;
    if(opts.title) {
      title = opts.title;
    } else {
      switch(opts.scope) {
        case window.Habits.Scope.DAY: title = opts.date.format("dddd Do"); break;
        case window.Habits.Scope.MONTH: title = opts.date.format("MMMM"); break; 
        case window.Habits.Scope.YEAR: title = opts.date.format("YYYY"); break;
      }

    }

    if(window.Habits.Scope.bucketp(opts.scope)) {
      $.get("/habits/buckets", function(result) {

        console.log(opts.current_bucket, opts.scope);
        for(var i = 0; i != result.length; i++) {
          var selected = false;
          if(opts.current_bucket == 0 && i == 0) {
            selected = true;
          } else if(result[i].ID == opts.current_bucket) {
            selected = true;
          }
          $("<option "+(selected?"selected":"")+" value="+result[i].ID+">"+result[i].Name+"</option>").appendTo($(self.refs.bucket_select));
        }

        console.log(result);
        /*
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
          */
      });

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
      RiotControl.trigger('task-new', opts.scope, title, opts.date);
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

  change_bucket_select(e) {
    var selected = $(e.target).val();
    RiotControl.trigger("change-bucket", selected);
    console.log(selected);
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
      opts.thunk();
    }
  });
</scope-days>

<task id="task-{ID}">
  <button class="btn btn-xs btn-default {btn-success: status == window.Habits.Status.complete} {btn-danger: status == window.Habits.Status.incomplete}" onclick={change_status}>
    {name}
    <span if={ (scope == window.Habits.Scope.MONTH || scope == window.Habits.Scope.YEAR )&& (total_tasks > 0)}>
      {completed_tasks}/{total_tasks}
    </span>
    <span if={ (scope == window.Habits.Scope.MONTH || scope == window.Habits.Scope.YEAR) && (completion_rate > -1) }>({completion_rate}%)</span>
  </button>
  <span class="float-xs-right">
    <span ref="time" if={minutes > 0 || hours > 0}>
      <i class="octicon octicon-clock"></i>
      <span if={hours > 0}>{hours}h</span>
      <span if={minutes > 0}>{minutes}m </span>
    </span>
    <span class="streak" if={scope == window.Habits.Scope.YEAR && best_streak > 0}>
      <i title="Current/Best streak" class="octicon octicon-dashboard"></i>
      <span>{streak}/{best_streak}</span>
    </span>
    <span title="Added to list on" if={scope >= window.Habits.Scope.WRAP}>{moment(date).format('M/D/YY')}</span>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-comment" title="Add comment" onclick={edit_comment}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-trashcan" title=Delete onclick={delete}></button>
    <button if={scope == window.Habits.Scope.DAY} title="Log time"
      class="task-control btn-link btn btn-sm btn-default octicon octicon-clock" onclick={log_time}></button>
    
    <button if={ (((scope == window.Habits.Scope.MONTH) && moment(date).month() == (moment().month())) || 
      (scope == window.Habits.Scope.YEAR ))}
      title="Copy to present day" class="task-control btn btn-link btn-sm btn-default octicon octicon-clippy" onclick={copy}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-chevron-up" title="Move down" onclick={up}></button>
    <button class="task-control btn-link btn btn-sm btn-default octicon octicon-chevron-down" title="Move up" onclick={down}></button>
  </span>
  <div class="comment" id="comment-{ID}" onclick={edit_comment} ></div>

  var self = this

  var save = function() {
    console.log("Comment update", comment_div().html());
    RiotControl.trigger('comment-update', self.__.item, {
      ID: self.comment.ID || 0,
      body: comment_div().html(),
      task_id: self.__.item.ID
    });
  }

  var comment_div = function() { return $("#comment-"+self.ID); }
  var get_editor = function() {
    var div = comment_div();
    if(!self.editor) {
      self.editor = window.Common.make_editor(div, save, save);
    }
    div.focus();
    return self.editor;
  }

  RiotControl.on('task-updated', function(task) {
    console.log("TASK UPDATED");
    if(task.ID == self.__.item.ID) {
      self.__.item = task;
      console.log("Updating task",task);
      self.update(task);
      comment_div().html(task.comment.body);
    }
  });

  self.one('mount', function() {
    comment_div().html(self.comment.body);
    comment_div().click(get_editor);
    // TODO: Provide an average of hours
    // TODO: Should probably just be calculated server-side
    if(self.total_tasks_with_time) {
      //console.log("Total tasks for " + self.name + " with time tracking", self.total_tasks_with_time);

      var avg_minutes = ((self.hours * 60) + self.minutes) / self.total_tasks_with_time;

      var time_average = "Average time: " + Math.round(avg_minutes) + "m";

      $(self.refs.time).attr("title", time_average);
    }
  });

  self.one('unmount', function() {
    if(self.editor) self.editor.destroy();
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
    get_editor();
  }

  copy(_) {
    var scope = self.__.item.scope - 1
    var date = moment(self.__.item.date).utc()
    // Create task on current day from monthly task
    if(scope == window.Habits.Scope.DAY) {
      date.date(moment().clone().add(4, 'hour').date());
    } else if(scope == window.Habits.Scope.MONTH) {
      date.month(moment().month());
      date.date(moment().date());
    }
    RiotControl.trigger('task-new', scope, self.__.item.name, date)
  }
</task>
