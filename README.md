![CircleCI Badge](https://circleci.com/gh/ioddly/meditations.png?circle-token=:circle-token&style=shield)

meditations is an application for tracking life progress that builds on habit formation and long term thinking.

Originally a Trello board, meditations simply keeps track of how often you complete tasks, and how much time you spend
on them (optionally). It's fairly minimalist compared to more complex time management systems, and leave the structure
of your day entirely up to you. The goal of meditations is to get an objective, long-term view of how you are doing.

In addition, it has a journal that supports tagging and organizing entries by named categories.

![sample usage video](http://i.imgur.com/gmFSRK4.gif)

## [> Live Demo <](https://meditations.upvalue.io)

# Manual

For information on how to use Meditations as well as some documentation of its architecture, see
the manual: [HTML](https://rawgit.com/ioddly/meditations/master/docs/manual.html) |
[org](docs/manual.org) | `yarn run manual-open` from the command line to view your local copy.

## Running from command line

    $ go get github.com/ioddly/meditations
    
Go to your workspace's source.

    $ go build
    $ yarn
    $ ./meditations serve --port 8080 --database sample.sqlite3 --migrate 

## Dependencies

- Go libraries: See Godeps/Godeps.json
- JS libraries: See package.json
- Programs: Pandoc (only necessary for exporting markdown/plaintext descriptions of progress)
- Browser: Meditations relies on modern browser features like `fetch,` and does not include polyfills. It is developed against the latest version of Chrome.

## Attribution

The favicon.ico was used under public domain from [Tango](http://tango.freedesktop.org)
