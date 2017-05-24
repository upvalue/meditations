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

# Development

Note that webpack is required for development. Use `webpack -w`.

# Viewing internal documentation

    $ yarn run jsdoc
    $ yarn run godoc

# Dependencies

- Go libraries: See Godeps/Godeps.json
- JS libraries: See package.json
- Programs: Pandoc (only necessary for exporting markdown/plaintext descriptions of progress)

# Attribution

The favicon.ico was used under public domain from [Tango](http://tango.freedesktop.org)
