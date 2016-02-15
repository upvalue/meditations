<index>
  <p each={pages}>page</p>
</index>

<page>
  <h1>{opts.title}</h1>
  <p>{opts.body</p>
</page>

<controls>
  <button class="btn btn-sm btn-primary" onclick={add_page}>Add Page</button>

  add_page() {
    var title = window.prompt("Page title");
    RiotControl.trigger("add-page", title);
  }

</controls>
