# tekne

Tekne is a freestyle productivity application structured as an outline editor
(like Logseq) which allows users to tag chunks of text, record structured data
(such as time spent on a task) and search or navigate through that data easily.

# Architecture

- Written in React
- Bundled with Vite and uses [Tanstack Router](https://tanstack.com/router/latest) as the
  router.
- [Jotai](https://jotai.org/docs) for state management
- pnpm as the package manager (do not use normal npm)
- Postgres/kysely for databases
- TRPC for communication between frontend and backend

# File structure

- The application is organized by feature. For example, components for the
  editor feature are all under `./src/editor`. New features should follow this
  convention.
- The routes are defined in `./src/routes` and use the convention browser routes
  should be reflected in directories and filenames. For example, a user viewing
  `/n/2025-07-20` is visiting the route defined at `./src/route/n/$title.tsx`
- Tests should be placed in the same directory as the file they test, not in a separate
  tests folder. For example `./src/editor/schema.ts` is tested by
  `./src/editor/schema.test.ts`

# Frontend design

# Editor

Its primary interface is a document editor written on top of CodeMirror, and the code for
this editor lives in `src/editor`.

The editor edits a document, which is a collection of lines stored as a flat array. Lines
can be indented or dedented which is rendered as a tree-like interface for the user (and
the document can be converted into a tree for analysis if necessary)

Major components of the editor are:

- `src/editor/schema.ts` - Zod-defined schema for documents and lines
- `src/editor/state.ts` - Defines the Jotai atoms where state is stored.
  Depending on where the editor is mounted, the editor
- `src/editor/line-editor.ts` Which contains most of the code relating to Codemirror. The
  line editor edits individual lines in a document, currently handles all key bindings. It
  can also change overall editor state by changing Jotai: for example, if the user enters a
  new line by pressing enter, this appends a new line to the document's `children` array.
- `src/editor/TEditor.tsx` overall document editor
- `src/editor/ELine.tsx` React wrapper of the Codemirror editor

The synchronization between Codemirror (which has its own DOM rendering and management
system) and React is custom:

- lines can update the overall editor state by changing Jotai atoms
- changes to the overall editor state are synchronized to Codemirror by glue
  code which destroys and recreates Codemirror when the line changes externally
- any changes on the individual line content change React state via a codemirror plugin
- Vanilla JS components written in Codemirror may emit CustomEvents, which can
  be listened to higher in the render tree

Additional features of the editor:

- Slash commands allow the user to autocomplete useful commands while directly in the
  editor interface. For example, typing `/date` and then selecting the autocomplete for this
  command will insert today's date in `YYYY-MM-DD` format.

The editor has a standalone route at `/lab` -- this can be useful for testing the document
editor in isolation from other features from the application.

# Running the application

You can run the application with `pnpm run client:dev`. Although the application does have
a server, it is also capable of running completely in the client, including fully
functional TRPC endpoints and SQL queries. Prefer to do this unless the changes make it
seem necessary to run the server.

# Database structure

The database is managed with Kysely, which can be run with `pnpm kysely` in server mode.
Note that when the application is run in client-only mode, migrations are automatically
applied when the page is loaded.

# Testing changes

After making changes

> pnpm types

To ensure there are no type errors and

> pnpm test

if you changed a file with tests that should be testd

If there are any tests present for a specific file, you can run them with

> pnpm run test filename

Once this is done, use the Playwright MCP to interact with the running application. Use
browser snapshots to confirm that the page content has changed in a way that
reflects the change being made.

Prefer to use the browser_snapshot tool to observe changes, and only use the
screenshot tool to verify styling changes.
