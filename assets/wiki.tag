<index>
  <h1>Wiki Index</h1>
  <h3 each={opts.pages}>
    <a btn-sm btn-primary btn-link" href="#view/{name}">{name}</a>
  </h3>
</index>

<page>
  <h1>{opts.Page.name}</h1>
  <div id="page-body-{opts.Page.ID}" class=page-body></div>

  var save = function() {
    var msg = {
      ID: opts.Page.ID,
      LastRevision: opts.Revision.Number,
      Body: $("#page-body-"+opts.Page.ID).html()
    };
    RiotControl.trigger('edit-page', opts.Page.name, msg);
  }

  this.on('mount', function() {
    this.editor = window.Common.make_editor("#page-body-"+opts.Page.ID, save, save);
    $(this.root).children(".page-body").html(opts.Revision.Body);
  })
</page>

<wiki-controls>
  <button class="btn btn-sm btn-primary" onclick={add_page}>Add Page</button>

  add_page() {
    var title = window.prompt("Page title")
    RiotControl.trigger("add-page", title);
  }

</wiki-controls>
