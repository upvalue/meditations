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
    //console.log(opts.entries);
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
  <div id={"entry-body-"+ID} class=entry-body onfocus={focus} onblur={blur}></div>
  <span class=entry-tags>
    <div class=form-inline>
      <span each={Tags}>
        <button class="btn btn-xs" onclick={browse_tag} data-name="{Name}">
          {Name}
          <button class="btn btn-xs btn-link octicon octicon-x" onclick={remove_tag} data-name="{Name}"></button>
        </button>
      </span>
      <form class="entry-tag-form" onsubmit={new_tag}>
        <input type=text class="form-control tag-name" size=10 placeholder="New Tag" />
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
    // What a hack. Seems riot won't allow remounting of tags created with each= (or rather, there is no way to load
    // the variables back into the "context"
    if(this.opts.__proto__.ID) {
      console.log(this.opts.__proto__);
      self.update(this.opts.__proto__);
    } else {
    }
    $(this.root).children("h4").text(moment(this.Date, "YYYY-MM-DD").format("dddd, MMM Do"));
    $(this.root).children(".entry-body").html(this.Body);
    self.editor = window.Common.make_editor("#entry-body-" + this.ID);
    self.editor.subscribe("blur", function() {
      console.log("Journal update");
      save();
    });
  });

  RiotControl.on('journal-updated', function(data) {
    if(data.ID == self.ID) {
      self.update(data);
      self = this;
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

  // Focus/blur managers to ensure the data is saved if the window is closed
  focus(e) {
    console.log("Focused on thing");
    $(window).on("beforeunload", function() {
      save();
    });
  }

  blur(e) {
    $(window).off("unload");
  }
</entry>
