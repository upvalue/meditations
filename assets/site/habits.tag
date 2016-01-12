<scope>
  <section class="scope">
    <h4 class=scope-title>{opts.date}</h4>
    <span class="pull-right">
      <form class=form-inline>
        <input type="text" size="15" class="form-control " />
        <button type="submit" class="btn btn-xs btn-default octicon octicon-plus" onclick={new_task}></button>
      <span if={opts.scope == window.Habits.Scope.month || opts.scope == window.Habits.Scope.year}>
        <button class="btn btn-xs btn-default octicon octicon-chevron-left" onclick={nav_left}></button>
        <button class="btn btn-xs btn-default octicon octicon-chevron-right" onclick={nav_right}></button>
      </span>
      <button class="btn btn-xs btn-default octicon octicon-comment" onclick={comment}></button>
      </form>
    </span>
    <task each={opts.tasks} />
  </section>

  var self = this

  this.on('mount', function() {
    // These will be mounted at the beginning with no data, so hide the ones without data passed
    if(opts.date) {
      $(this.root).show().children('section').children('h4').text(opts.title);
    } else {
      $(this.root).hide();
    }
  });

  nav_left(e) {
    RiotControl.trigger('change-date', false, opts);
  }

  nav_right(e) {
    RiotControl.trigger('change-date', true, opts)
  }

  new_task(e) {
    var title = $(e.target).parent().children('input').val();
    if(title.length > 0) {
      console.log('Adding a new task', opts.date);
      RiotControl.trigger('task-new', opts, title, opts.date);
    }
  }

  comment(e) {
    console.log('Editing comment');
  }

  comment_focus(e) {
    console.log($(e.target).html());
  }

  comment_blur(e) {
    console.log('1: Before any changes', JSON.stringify($(target).html()));
    $(target).children('br').each((function() {
      $(this).replaceWith("\n");
    }));

    console.log('2: After BR replace', JSON.stringify($(target).html()));
    $(target).children('div').each((function() {
      $(this).children('br').each((function() {
        $(this).replaceWith("\n");
      }));
      $(this).replaceWith($(this).html());
    }));

    console.log('3: After DIV replace', JSON.stringify($(target).html()));
    var content = markdown.toHTML($(target).html());
    console.log('4: Markdown rendering', JSON.stringify(content));
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

<task>
  <section class="entry">
    <button class="btn btn-xs btn-default {btn-success: status == window.Habits.Status.complete} {btn-danger: status == window.Habits.Status.incomplete}" onclick={change_status}>
      {name}
      <span if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year) && (completion_rate > -1) }>({completion_rate}%)</span>
    </button>
    <span class="pull-right">
      <button class="task-control btn btn-xs btn-default octicon octicon-trashcan" onclick={delete}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-chevron-up" onclick={up}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-chevron-down" onclick={down}></button>
      <button class="task-control btn btn-xs btn-default octicon octicon-comment" onclick={edit_comment}></button>
      <button if={ (scope == window.Habits.Scope.month || scope == window.Habits.Scope.year)} class="btn btn-xs btn-default octicon octicon-clippy" onclick={copy}></button>
    </span>
    <span class="comment" id="comment-{id}" onblur={comment_unfocus} onfocus={comment_focus} contenteditable="{false: !comment.body}">{comment.body}</comment>
  </section>

  var self = this

  var comment_div = function() { return "#comment-"+self.id }

  var fix_comment = function() {
    // Make comment links clickable 
    $(comment_div()).find("a").attr("contenteditable", false);
  }

  RiotControl.on('task-updated', function(task) {
    if(task.id == self._item.id) {
      self.update(task);
    }
  });

  var render_comment = function(task) {
    $("#comment-"+task.id).html(markdown.toHTML(task.comment.body));
    fix_comment();
  }

  self.one('mount', function() {
    render_comment(this);
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
    self._item.comment.task_id = self.id;
    console.log(self);
    self.comment = {'task_id': self.id}
    $("#comment-"+self.id).attr("contenteditable", true).focus();
  }

  copy(_) {
    var scope = self._item.scope - 1
    var date = moment(self._item.date).utc()
    // Create task on current day from monthly task
    if(scope == window.Habits.Scope.day) {
      date.date(moment().date())
    } else if(scope == window.Habits.Scope.month) {
      date.month(moment().month());
      date.date(moment().date());
    }
    RiotControl.trigger('task-new', {date: date, scope: scope}, self._item.name, date)
  }

  comment_focus(e) {
    $(e.target).text(self.comment.body);
  }

  comment_unfocus(e) {
    // Collapse divs that are inserted as newlines by contenteditable
    $(e.target).children("div").each(function() {
      $(this).replaceWith("\n" + $(this).html());
    });
    console.log($(e.target).text());
    self.comment.body = $(e.target).text();
    RiotControl.trigger('comment-update', self._item, self.comment);
    var content = markdown.toHTML(self.comment.body);
    if(content.length == 0) {
      $(comment_div()).attr("contenteditable", false);
    } else {
      $(comment_div()).html(markdown.toHTML(self.comment.body));
    }

    fix_comment();
  }
</task>
