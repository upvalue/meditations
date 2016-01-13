<scope>
  <section class="scope">
    <h4 class=scope-title>{opts.date}</h4>
    <span class="pull-right">
      <span if={opts.scope == window.Habits.Scope.month || opts.scope == window.Habits.Scope.year}>
        <button class="btn btn-xs btn-default octicon octicon-chevron-left" title="Previous" onclick={nav_left}></button>
        <button class="btn btn-xs btn-default octicon octicon-chevron-right" title="Next" onclick={nav_right}></button>
      </span>
      <span if={opts.scope > window.Habits.Scope.year}>
        <button class="btn btn-xs btn-default octicon octicon-briefcase" title="Change bucket" onclick={change_bucket}></button>
      </span>
      <button type=submit class="btn btn-xs btn-default octicon octicon-plus" title="Add task" onclick={new_task}></button>
      <!--<button if={ window.development } class="btn btn-xs btn-default octicon octicon-sync" onclick={remount}></button>-->
    </span>
    <task each={opts.tasks} />
  </section>

  var self = this

  this.on('mount', function() {
    // These will be mounted at the beginning with no data, so hide the ones without data passed
    var title;
    if(opts.title) {
      title = opts.title;
    } else {
      switch(opts.scope) {
        case window.Habits.Scope.day: title = opts.date.format("Do"); break;
        case window.Habits.Scope.month: title = opts.date.format("MMMM"); break; 
        case window.Habits.Scope.year: title = opts.date.format("YYYY"); break;
      }
    }
    if(opts.date) {
      $(this.root).show().children('section').children('h4').text(title);
    } else {
      $(this.root).hide();
    }
  });

  remount(e) {
    //console.log(opts)
    window.Habits.task_store.mount_scope(opts.scope, opts.date);
  }

  nav_left(e) {
    RiotControl.trigger('change-date', false, opts);
  }

  nav_right(e) {
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
      console.log(result);
    });
  }
</scope>

<scope-days>
  <scope id="scope-day-31" visible=false></scope>
  <scope id="scope-day-30" visible=false></scope>
  <scope id="scope-day-29" visible=false></scope>
  <scope id="scope-day-28" visible=false></scope>
  <scope id="scope-day-27" visible=false></scope>
  <scope id="scope-day-26" visible=false></scope>
  <scope id="scope-day-25" visible=false></scope>
  <scope id="scope-day-24" visible=false></scope>
  <scope id="scope-day-23" visible=false></scope>
  <scope id="scope-day-22" visible=false></scope>
  <scope id="scope-day-21" visible=false></scope>
  <scope id="scope-day-20" visible=false></scope>
  <scope id="scope-day-19" visible=false></scope>
  <scope id="scope-day-18" visible=false></scope>
  <scope id="scope-day-17" visible=false></scope>
  <scope id="scope-day-16" visible=false></scope>
  <scope id="scope-day-15" visible=false></scope>
  <scope id="scope-day-14" visible=false></scope>
  <scope id="scope-day-13" visible=false></scope>
  <scope id="scope-day-12" visible=false></scope>
  <scope id="scope-day-11" visible=false></scope>
  <scope id="scope-day-10" visible=false></scope>
  <scope id="scope-day-09" visible=false></scope>
  <scope id="scope-day-08" visible=false></scope>
  <scope id="scope-day-07" visible=false></scope>
  <scope id="scope-day-06" visible=false></scope>
  <scope id="scope-day-05" visible=false></scope>
  <scope id="scope-day-04" visible=false></scope>
  <scope id="scope-day-03" visible=false></scope>
  <scope id="scope-day-02" visible=false></scope>
  <scope id="scope-day-01" visible=false></scope>

  this.on('mount', function() {
    if(opts.thunk) { 
      opts.thunk();
    }
  });
</scope-days>

<task id="task-{ID}">
  <section class="entry">
    <button class="btn btn-xs btn-default {btn-success: status == window.Habits.Status.complete} {btn-danger: status == window.Habits.Status.incomplete}" onclick={change_status}>
      {name}
      <span if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year) && (completion_rate > -1) }>({completion_rate}%)</span>
    </button>
    <span class="pull-right">
      <button if={ (comment.ID == 0) } class="task-control btn btn-xs btn-default octicon octicon-comment" title="Add comment" onclick={edit_comment}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-trashcan" title=Delete onclick={delete}></button>
      <button if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year)} title="Copy to present day" class="btn btn-xs btn-default octicon octicon-clippy" onclick={copy}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-chevron-up" title="Move down" onclick={up}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-chevron-down" title="Move up" onclick={down}></button>
    </span>
    <div if={ (scope == window.Habits.Scope.year && best_streak > 0) } style="text-align:center;">Streak: {streak} days / {best_streak} (best)</div>
    <div class="comment" id="comment-{ID}"></div>
  </section>

  var self = this

  var comment_div = function() { return $("#comment-"+self.ID); }

  RiotControl.on('task-updated', function(task) {
    if(task.ID == self._item.ID) {
      self.update(task);
    }
  });

  self.one('mount', function() {
    comment_div().html(self.comment.body);
    self.editor = window.Habits.make_editor("#comment-"+self.ID, {});
    self.editor.subscribe("blur", function() {
      RiotControl.trigger('comment-update', self._item, {
        ID: self.comment.ID || 0,
        body: comment_div().html(),
        task_id: self._item.ID
      });
    });
  });

  change_status(e) {
    var task = self._item;
    task.status = (task.status + 1) % window.Habits.Status.wrap;
    RiotControl.trigger('task-update', task);
  }

  delete(e) {
    if(window.confirm('Really delete?')) {
      RiotControl.trigger('task-delete', self._item)
    }
  }

  up(_) {
    RiotControl.trigger('task-order-up', self._item);
  }

  down(_) {
    RiotControl.trigger('task-order-down', self._item);
  }

  edit_comment(_) {
    comment_div().focus();
    self.comment = {'task_id': self.ID}
  }

  copy(_) {
    var scope = self._item.scope - 1
    var date = moment(self._item.date).utc()
    // Create task on current day from monthly task
    if(scope == window.Habits.Scope.day) {
      date.date(moment().clone().add(4, 'hour').date());
    } else if(scope == window.Habits.Scope.month) {
      date.month(moment().month());
      date.date(moment().date());
    }
    RiotControl.trigger('task-new', {date: date, scope: scope}, self._item.name, date)
  }
</task>
