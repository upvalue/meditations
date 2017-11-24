# meditations

## [Meditations on GitHub](https://github.com/ioddly/meditations)
## [Live Demo](https://meditations.upvalue.io)
## [Built by upvalue()](https://upvalue.io)

meditations is an application for tracking life progress that builds on the principles of habit
formation.

Originally a Trello board, meditations simply keeps track of how often you complete tasks, and
how much time you spend on them (optionally). It's fairly minimalist compared to more complex
time management systems, and leave the structure of your day entirely up to you. The goal of
meditations is to get an objective, long-term view of how you are doing.

It's currently divided into two separate pieces of functionality: Habits (a todo list) and
Notes (for note taking, go figure).

## Browser support

Meditations is currently developed against the latest version of Chrome, and does not include
polyfills. Please let me know if this causes any issues.

## Usage

### Command line 

There are several commands available at the command line, which ./meditations --help will detail,
but the only one necessary for end users is ./meditations serve --migrate which starts the
webserver and migrates the database, if necessary.

### Tutorial

There is a built-in walkthrough that can be accessed through the application, which is the best
way to learn the user interface.

### Editing 

Rich text editing is provided by medium-editor, see https://yabwe.github.io/medium-editor/ for
further documentation.

## Architecture

Meditations is written with Go, Macaron and GORM+sqlite3 on the backend, and TypeScript, React
and Redux on the frontend.

### SSL & Encryption

Meditations is intended to be run on a local network; SSL can be achieved using nginx as a
reverse proxy, but this is mainly useful for the demo instance. Meditations does not support
encryption directly, but works fine with an sqlite database mounted on EncFS.

### About

Meditations is developed by [upvalue()](https://upvalue.io)
