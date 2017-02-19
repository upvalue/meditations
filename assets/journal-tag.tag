<entries>
  <span> 
    <button if={opts.date} class="btn btn-link btn-sm octicon octicon-triangle-left" title="Last year" onclick={last_year}></button>
    <button if={opts.date} class="btn btn-link btn-sm octicon octicon-chevron-left" title="Last month" onclick={last_month}></button>
  </span>
  <h3 if={opts.date} id=entries-title>{opts.title}</h3>
  <h3 if={!opts.date} id=entries-title>Tag: {opts.title}</h3>
  <span>
    <button if={!opts.date} class="btn btn-link btn-sm octicon octicon-arrow-left" title="Back to journal" onclick={remove_tag}></button>
    <button if={opts.date} class="btn btn-link btn-sm octicon octicon-chevron-right" title="Next month" onclick={next_month}></button>
    <button if={opts.date} class="btn btn-link btn-sm octicon octicon-triangle-right" title="Next year" onclick={next_year}></button>
  </span>
  <entry each={opts.entries}></entry>

  var self = this;

  this.on('mount', function() {
    if(opts.thunk) { 
      // Give some time for rendering before scroll (TODO: Is there a riot callback for after rendering is done?)
      setTimeout(function() { opts.thunk(self.root); }, 1000);
    }
  });

  last_year() {
    route("view/"+opts.date.clone().subtract(1, 'year').format('YYYY-MM'));
  }

  last_month() {
    route("view/"+opts.date.clone().subtract(1, 'month').format('YYYY-MM'));
  }

  next_month() {
    route("view/"+opts.date.clone().add(1, 'month').format('YYYY-MM'));
  }

  next_year() {
    route("view/"+opts.date.clone().add(1, 'year').format('YYYY-MM'));
  }

  remove_tag() {
    history.back();
  }
</entries>

<entry-single>
  <entry each={opts.entry_array}></entry>
</entry-single>

<entry id={"entry-"+ID}>
  <h5 class=entry-title ref=title if={Seen == 1 || Name}>{title}</h5>
  <span class="journal-controls pull-xs-right">
    <span class=pull-xs-right>
      <button if={!NoContext} class="journal-control btn btn-link btn-sm" title="Context">
        <a href="#view/{moment(this.Date, 'YYYY-MM-DD').format('YYYY-MM')}"><span class="octicon octicon-link"></span></a>
      </button>
      <button class="journal-control btn btn-link btn-sm octicon octicon-text-size" title="Edit name" onclick={name_entry}></button>
      <button class="journal-control btn btn-link btn-sm octicon octicon-tag" title="Add tag" onclick={add_tag}></button>
      <!-- this should be last -->
      <button class="journal-control btn btn-link btn-sm octicon octicon-x" title="Delete" onclick={delete_entry}></button>
    </span>
    <br>
    <div class="journal-timestamp pull-xs-right">
      <a href="#view/{Context}/{ID}"><em>{moment(CreatedAt, 'YYYY-MM-DD\Thh:mm').format('hh:mm A')}</em></a>
    </div>
    <div class="journal-tags pull-xs-right">
      <span class="journal-tag pull-xs-right" each={Tags}>
        <a href ="#tag/{Name}">#{Name}</a>
        <button class="btn btn-xs octicon octicon-x" onclick={remove_tag} data-name="{Name}"></button>
      </span>
    </div>
  </span>

  <div id={"entry-body-"+ID} ref=body class="entry-body">
  
  </div>

  <hr>

  var self = this

  var save = function() {
    RiotControl.trigger('journal-update', {
      ID: self.ID,
      Body: $("#entry-body-"+self.ID).html()
    });
  }

  self.one('mount', function() {
    var date = moment(this.Date, "YYYY-MM-DD");
    // Due to somewhat more complex formatting logic, dates are calculated here
    $(this.refs.title).append(
      this.Name ? '<strong>'+this.Name+'</strong>&nbsp;' : '',
      date.format('dddd, '),
      $('<a/>', {href: "journal#view/"+date.format('YYYY-MM'), text: date.format('MMM')}),
      date.format(' Do')
    );

    $(this.refs.body).html(this.Body);
    self.editor = window.Common.make_editor('#'+this.refs.body.id, save, save);
  });

  RiotControl.on('journal-updated', function(data) {
    if(data.ID == self.__.item.ID) {
      self.update(data);
    }
  });

  add_tag(e) {
    e.preventDefault();
    var tag = window.prompt("Enter the tag's name (do not include #)");
    if(tag && tag.length > 0) {
      RiotControl.trigger('add-tag', self.ID, tag);
    }
  }

  remove_tag(e) {
    var name = $(e.target).attr("data-name");
    if(window.confirm("Are you sure you want to remove the tag #"+name)) {
      RiotControl.trigger('remove-tag', self.ID, name);
    }
  }

  name_entry(e) {
    var name = window.prompt("What would you like to name this entry? (leave empty to delete)", self.Name);
    RiotControl.trigger('name-entry', self.ID, name);
  }

  promote_entry(e) {
    RiotControl.trigger('promote-entry', self.ID);
  }

  delete_entry(e) {
    if(window.confirm("Are you sure you want to remove this entry?")) {
      RiotControl.trigger('delete-entry', self.ID);
    }
  }

  browse_tag(e) {
    RiotControl.trigger("browse-tag", $(e.target).attr("data-name"));
  }
</entry>

<title-nav-sub>
  
</title-nav-sub>

<title-nav>
  <ul id=alphabetical-top-list class="list-group navigation-list">
    <li each={opts.links}>
      <span if={typeof sub == "undefined" && name}>{name}</span>
      <span if={typeof sub != "undefined"}>
        <a href="#">{name}</a>
        <ul>

        </ul>
      </span>
    </li>
  </ul>

  this.on('mount', function() {
    console.log(opts.links);
  });
</title-nav>
