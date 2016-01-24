<entries>
  <h3>{opts.date.format("MMMM YYYY")}</h3>
  <entry each={opts.entries}></entry>

  this.on('mount', function() {
    console.log(opts.entries);
    var today = moment();
    if(opts.thunk) { 
      opts.thunk();
    }
  });
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
