![CircleCI Badge](https://circleci.com/gh/ioddly/meditations.png?circle-token=:circle-token&style=shield)

meditations is an application for tracking life progress that builds on habit formation and long term thinking.

Originally a Trello board, meditations simply keeps track of how often you complete tasks, and how much time you spend
on them (optionally). It's fairly minimalist compared to more complex time management systems, and leave the structure
of your day entirely up to you. The goal of meditations is to get an objective, long-term view of how you are doing.

![sample image](http://i.imgur.com/msy5Wnc.png)

## [Live Demo & Tutorial](http://meditations.ioddly.com)

# Usage

    $ go build
    $ yarn
    $ ./meditations --port [PORT] --database [PATH] --migrate --tutorial 

# SSL

To use SSL, you'll need to set up nginx (or another webserver) as a proxy. 

# Dependencies

- Go libraries: See Godeps/Godeps.json
- JS libraries: See package.json
- Programs: Pandoc (only necessary for exporting markdown/plaintext descriptions of progress)
- Browser: Meditations relies on modern browser features like `fetch,` and does not include polyfills. Please use an up to date version of a consumer browser.

# Development

Note that webpack is required for development. Use `webpack -w`.

Although this is a Go package, it is intended to be run directly from the repo and not installed with `go get`.

# Internals

## Viewing internal documentation

    $ yarn run typedoc
    $ yarn run godoc

## Directories and files of interest

- `backend/` Go backend code
- `src/` Frontend code
- `main.go` Go command entry point

# Attribution

The favicon.ico was used under public domain from [Tango](http://tango.freedesktop.org)
