<entries>
  <h3>{opts.date.format("MMMM YYYY")}</h3>
  <span> 
    <button class="btn btn-xs octicon octicon-triangle-left" title="Last year" onclick={last_year}></button>
    <button class="btn btn-xs octicon octicon-chevron-left" title="Last month" onclick={last_month}></button>
    <button class="btn btn-xs octicon octicon-chevron-right" title="Next month" onclick={next_month}></button>
    <button class="btn btn-xs octicon octicon-triangle-right" title="Next year" onclick={next_year}></button>
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
</entries>

<entry id={"entry-"+ID}>
  <h4>{title}</h4>
  <div id={"entry-body-"+ID} class=entry-body>
  </div>

  var self = this;

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
