![CircleCI Badge](https://circleci.com/gh/ioddly/meditations.png?circle-token=:circle-token&style=shield)

meditations is an application for tracking life progress that builds on habit formation and long term thinking.

It's fairly minimalist compared to complex time management systems; it leaves the structure of your day entirely up to
you, but it is a great way to get a much more objective, overarching view of how you are doing.

![image](http://ioddly.com/images/meditations.png)

## [Live Demo & Tutorial](http://meditations.ioddly.com)

# Usage

    $ go build
    $ yarn
    OR
    $ npm install
    $ ./meditations --port [PORT] --database [PATH] --migrate --tutorial --webpack

# Dependencies

- Go libraries: See Godeps/Godeps.json
- JS libraries: See package.json
- Programs: Pandoc (only necessary for exporting markdown/plaintext descriptions of progress)

# Attribution

The favicon.ico was used under public domain from [Tango](http://tango.freedesktop.org)
