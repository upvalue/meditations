<entries>
  <span> 
    <button if={opts.date} class="btn btn-xs octicon octicon-triangle-left" title="Last year" onclick={last_year}></button>
    <button if={opts.date} class="btn btn-xs octicon octicon-chevron-left" title="Last month" onclick={last_month}></button>
    <button if={opts.date} class="btn btn-xs octicon octicon-chevron-right" title="Next month" onclick={next_month}></button>
    <button if={opts.date} class="btn btn-xs octicon octicon-triangle-right" title="Next year" onclick={next_year}></button>
  </span>
  <h3 id=entries-title>{opts.title}</h3>
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
</entries>

<entry id={"entry-"+ID}>
  <h4>{title}</h4>
  <div id={"entry-body-"+ID} class=entry-body></div>
  <span class=entry-tags>
    <div class=form-inline>
      <span each={Tags}>
        <button class="btn btn-xs" onclick={browse_tag} data-name="{Name}">
          {Name}
          <button class="btn btn-xs octicon octicon-x" onclick={remove_tag} data-name="{Name}"></button>
        </button>
      </span>
      <input type=text class="form-control tag-name" size=10 placeholder="New Tag" />
      <button class="btn btn-xs octicon octicon-plus" title="Add tag" onclick={new_tag}></button>
    </div>
  </span>

  var self = this

  new_tag() {
    RiotControl.trigger('add-tag', self._item.ID, $(this.root).find(".tag-name").val());
  }

  remove_tag(e) {
    RiotControl.trigger('remove-tag', self._item.ID, $(e.target).attr("data-name"))
  }

  browse_tag(e) {
    RiotControl.trigger("browse-tag", $(e.target).attr("data-name"));
  }

  RiotControl.on('journal-updated', function(data) {
    if(data.ID == self._item.ID) {
      self.update(data);
    }
  });

  this.on('mount', function() {
    $(this.root).children("h4").text(moment(this.Date, "YYYY-MM-DD").format("Do"));
    $(this.root).children(".entry-body").html(this.Body);
    self.editor = window.Common.make_editor("#entry-body-" + this.ID);
    self.editor.subscribe("blur", function() {
      console.log("Journal update");
      RiotControl.trigger('journal-update', {
        ID: self.ID,
        Body: $("#entry-body-"+self.ID).html()
      });
    });
  });
</entry>
