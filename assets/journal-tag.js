riot.tag2('entries', '<span> <button if="{opts.date}" class="btn btn-link btn-sm octicon octicon-triangle-left" title="Last year" onclick="{last_year}"></button> <button if="{opts.date}" class="btn btn-link btn-sm octicon octicon-chevron-left" title="Last month" onclick="{last_month}"></button> </span> <h3 if="{opts.date}" id="entries-title">{opts.title}</h3> <h3 if="{!opts.date}" id="entries-title">Tag: {opts.title}</h3> <span> <button if="{!opts.date}" class="btn btn-link btn-sm octicon octicon-arrow-left" title="Back to journal" onclick="{remove_tag}"></button> <button if="{opts.date}" class="btn btn-link btn-sm octicon octicon-chevron-right" title="Next month" onclick="{next_month}"></button> <button if="{opts.date}" class="btn btn-link btn-sm octicon octicon-triangle-right" title="Next year" onclick="{next_year}"></button> </span> <entry each="{opts.entries}"></entry>', '', '', function(opts) {
  this.on('mount', function() {
    console.log(opts);
    if(opts.thunk) {
      opts.thunk(this.root);
    }
  });

  this.last_year = function() {
    riot.route("view/"+opts.date.clone().subtract(1, 'year').format('YYYY-MM'));
  }.bind(this)

  this.last_month = function() {
    riot.route("view/"+opts.date.clone().subtract(1, 'month').format('YYYY-MM'));
  }.bind(this)

  this.next_month = function() {
    riot.route("view/"+opts.date.clone().add(1, 'month').format('YYYY-MM'));
  }.bind(this)

  this.next_year = function() {
    riot.route("view/"+opts.date.clone().add(1, 'year').format('YYYY-MM'));
  }.bind(this)

  this.remove_tag = function() {
    history.back();
  }.bind(this)
});

riot.tag2('entry-link', '<h4><a href="/journal#wiki/{Name}">{Name}</a></h4>', '', '', function(opts) {
});

riot.tag2('wiki-entries', '<h3>Wiki</h3> <entry-link each="{opts.entries}"></entry-link>', '', '', function(opts) {

  this.on('mount', function() {
    console.log(opts);
  });
});

riot.tag2('entry-single', '<entry each="{opts.entry_array}"></entry>', '', '', function(opts) {
});

riot.tag2('entry', '<h4>{title} <button class="btn btn-sm octicon octicon-x" onclick="{delete_entry}"></button> <button class="btn btn-sm octicon octicon-text-size" onclick="{name_entry}"></button> <button if="{!Wiki}" class="btn btn-sm octicon octicon-cloud-upload" onclick="{promote_entry}"></button> </h4> <div id="{⁗entry-body-⁗+ID}" class="entry-body"></div> <span class="entry-tags"> <div class="form-inline"> <span each="{Tags}"> <button class="btn btn-sm" onclick="{browse_tag}" data-name="{Name}"> {Name} <button class="btn btn-sm btn-link octicon octicon-x" onclick="{remove_tag}" data-name="{Name}"></button> </button> </span> <form class="entry-tag-form" onsubmit="{new_tag}"> <input type="text" class="form-control tag-name" size="10" placeholder="New tag"> <button class="btn btn-sm btn-link octicon octicon-plus" title="Add tag" onclick="{new_tag}"></button> </form> </div> </span>', '', 'id="{⁗entry-⁗+ID}"', function(opts) {

  var self = this

  var save = function() {
    RiotControl.trigger('journal-update', {
      ID: self.ID,
      Body: $("#entry-body-"+self.ID).html()
    });
  }

  self.one('mount', function() {
    var date = moment(this.Date, "YYYY-MM-DD");
    $(this.root).children("h4").append(
      this.Name ? '<strong>'+this.Name+'</strong>' : '',
      '&nbsp;',
      date.format('dddd, '),
      $('<a/>', {href: "journal#view/"+date.format('YYYY-MM'), text: date.format('MMM')}),
      date.format(' Do')
    )

    $(this.root).children(".entry-body").html(this.Body);
    self.editor = window.Common.make_editor("#entry-body-" + this.ID, save, save);
  });

  RiotControl.on('journal-updated', function(data) {
    if(data.ID == self._item.ID) {
      self.update(data);
    }
  });

  this.new_tag = function() {
    RiotControl.trigger('add-tag', self.ID, $(this.root).find(".tag-name").val());
  }.bind(this)

  this.remove_tag = function(e) {
    if(window.confirm("Are you sure you want to remove this tag?")) {
      RiotControl.trigger('remove-tag', self.ID, $(e.target).attr("data-name"))
    }
  }.bind(this)

  this.name_entry = function(e) {
    var name = window.prompt("What would you like to name this entry?");
    if(name) {
      RiotControl.trigger('name-entry', self.ID, name);
    }
  }.bind(this)

  this.promote_entry = function(e) {
    RiotControl.trigger('promote-entry', self.ID);
  }.bind(this)

  this.delete_entry = function(e) {
    if(window.confirm("Are you sure you want to remove this entry?")) {
      RiotControl.trigger('delete-entry', self.ID);
    }
  }.bind(this)

  this.browse_tag = function(e) {
    RiotControl.trigger("browse-tag", $(e.target).attr("data-name"));
  }.bind(this)
});

riot.tag2('tag-cloud', '<h1>Tags</h1> <span each="{opts.tags}"> <button class="btn btn-sm" onclick="{browse_tag}" data-name="{Tag.Name}" riot-style="font-size:{Size}px;"> {Tag.Name} </button> </span>', '', '', function(opts) {

  this.browse_tag = function(e) {
    RiotControl.trigger("browse-tag", $(e.target).attr("data-name"));
  }.bind(this)
});
