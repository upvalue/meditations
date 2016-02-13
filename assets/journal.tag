<entries>
  <span> 
    <button if={opts.date} class="btn btn-link btn-xs octicon octicon-triangle-left" title="Last year" onclick={last_year}></button>
    <button if={opts.date} class="btn btn-link btn-xs octicon octicon-chevron-left" title="Last month" onclick={last_month}></button>
  </span>
  <h3 if={opts.date} id=entries-title>{opts.title}</h3>
  <h3 if={!opts.date} id=entries-title>Tag: {opts.title}</h3>
  <span>
    <button if={!opts.date} class="btn btn-link btn-xs octicon octicon-x" title="Back to journal" onclick={remove_tag}></button>
    <button if={opts.date} class="btn btn-link btn-xs octicon octicon-chevron-right" title="Next month" onclick={next_month}></button>
    <button if={opts.date} class="btn btn-link btn-xs octicon octicon-triangle-right" title="Next year" onclick={next_year}></button>
  </span>
  <entry each={opts.entries}></entry>
  this.on('mount', function() {
    if(opts.thunk) { 
      opts.thunk();
    }
  });

  last_year() {
    riot.route("view/"+opts.date.clone().subtract(1, 'year').format('YYYY-MM'));
  }

  last_month() {
    riot.route("view/"+opts.date.clone().subtract(1, 'month').format('YYYY-MM'));
  }

  next_month() {
    riot.route("view/"+opts.date.clone().add(1, 'month').format('YYYY-MM'));
  }

  next_year() {
    riot.route("view/"+opts.date.clone().add(1, 'year').format('YYYY-MM'));
  }

  remove_tag() {
    history.back();
  }
</entries>

<entry id={"entry-"+ID}>
  <h4>{title}</h4>
  <div id={"entry-body-"+ID} class="entry-body" onfocus={focus} onblur={blur}></div>
  <span class=entry-tags>
    <div class=form-inline>
      <span each={Tags}>
        <button class="btn btn-xs" onclick={browse_tag} data-name="{Name}">
          {Name}
          <button class="btn btn-xs btn-link octicon octicon-x" onclick={remove_tag} data-name="{Name}"></button>
        </button>
      </span>
      <form class="entry-tag-form" onsubmit={new_tag}>
        <input type=text class="form-control tag-name" size=10 placeholder="New tag" />
        <button class="btn btn-xs btn-link octicon octicon-plus" title="Add tag" onclick={new_tag}></button>
      </form>
    </div>

  </span>

  var self = this

  var save = function() {
    RiotControl.trigger('journal-update', {
      ID: self.ID,
      Body: $("#entry-body-"+self.ID).html()
    });
  }

  self.one('mount', function() {
    $(this.root).children("h4").text(moment(this.Date, "YYYY-MM-DD").format("dddd, MMM Do"));
    $(this.root).children(".entry-body").html(this.Body);
    self.editor = window.Common.make_editor("#entry-body-" + this.ID);

    self.editor.subscribe("focus", function() {
      $(window).on("beforeunload", function() {
        save();
      });
    });

    self.editor.subscribe("blur", function() {
      save();
      $(window).off("unload");
    });
  });

  RiotControl.on('journal-updated', function(data) {
    if(data.ID == self._item.ID) {
      self.update(data);
    }
  });

  new_tag() {
    RiotControl.trigger('add-tag', self.ID, $(this.root).find(".tag-name").val());
  }

  remove_tag(e) {
    if(window.confirm("Are you sure you want to remove this tag?")) {
      RiotControl.trigger('remove-tag', self.ID, $(e.target).attr("data-name"))
    }
  }

  browse_tag(e) {
    RiotControl.trigger("browse-tag", $(e.target).attr("data-name"));
  }
</entry>
