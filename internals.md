### API documentation

Both the TypeScript and Go APIs are semi-documented. Use `yarn run doc-frontend` and `yarn run
doc-backend` to open them.

### Database

There are three tables relating to habits: tasks, comments (one-to-one relationship with tasks),
and scopes.

In the documentation and code comments, a "scope" is considered a time-based or project-based
container of tasks. So July 3, 2017 could be a daily scope, July 2017 could be a monthly scope,
there could be a project called "Bucket List" which is also referred to as a scope, and so on.

The scope table contains three dummy rows for daily, monthly, and yearly tasks and an unlimited
number of rows after that which are used to store project names.

So a task's scope is, in actuality, a combination of its SCOPE and DATE columns. For example, a
daily task created on July 3, 2017 would have a SCOPE of 1 and a DATE of 2017-07-03, and
meditations would mount it under the daily task column by querying for all tasks with this date
and scope.

This is somewhat confusing and the database is organized this way mostly for historical reasons.

The journal has three tables: entries, tags, and entrytags, whose meaning is self-evident.

### Code organization

Backend code is located in backend/

+ app.go contains the entry point and command line interface
+ database.go contains database migration and repair
+ habits.go contains the bulk of the habits backend code, but
+ habitsweb.go contains the web methods and routing for habits
+ journal.go contains both the backend and web interface of the journal
+ journal_sidebar.go contains the Journal sidebar synchronization code
+ sync.go contains convenience method for establishing WebSockets

Frontend code is located in src/

+ bindings.d.ts - TypeScript type declarations for medium-editor-tables and riot-route
+ entry/ contains the webpack entry points. 
+ common.tsx contains all methods used by both Habits and Journal.

+ habits/ and journal/ contain the frontend code for Habits and Journal respectively.

  Each of them have a 'state.ts' file containing backend type definitions and Redux state, a
  'main.tsx' file containing WebSocket and routing handling, and a 'components.tsx' file
  containing most components. In some cases components are further split up into their own files.

Meditations uses WebSockets to synchronize UI across multiple clients. GET requests result in
JSON data being sent in response, and are used to do things like initialize the UI. POST requests
result in new information being sent over the relevant WebSocket, if any needs to be sent in
response to an action that has occurred. Contra REST, POST methods do not necessarily result in
data being created or modified.

### Reading the source code

To start understanding how meditations works "under the hood," the best place to start would be
the end of habitsweb.go and journal.go, and the main.tsx file for habits/ and journal/, which is
where the routing logic and initialization for the backend and frontend live.
