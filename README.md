<p align="center"><img src="assets/horizontal.png" alt="meditations" height="80px"></p>

![Have a nice day badge](https://img.shields.io/badge/have%20a-nice%20day-0099dd.svg)
![CircleCI Badge](https://circleci.com/gh/upvalue/meditations.png?circle-token=:circle-token&style=shield)

meditations is an application for tracking progress towards goals that builds on habit formation and long term
thinking.

### Note: active development is ongoing in the `feature/ng` branch!

Originally a Trello board, meditations simply keeps track of how often you complete tasks, and how much time you spend
on them (optionally). It's fairly minimalist compared to more complex time management systems, and leave the structure
of your day entirely up to you. The goal of meditations is to get an objective, long-term view of how you are doing.

In addition, it has a note-taking application that supports tagging and organizing entries by named categories.

![sample usage video](http://i.imgur.com/gmFSRK4.gif)

## [> Live Demo <](https://meditations.upvalue.io)

# Manual

For information on how to use Meditations as well as some documentation of its architecture, see
[the documentation](https://upvalue.github.io/meditations). Also available in your local install
under the `docs` directory.

## Running from command line

    $ go get github.com/upvalue/meditations
    
Go to your workspace's source.

Make sure to use NPM instead of yarn due to the following issue: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18484#issuecomment-319968097

    $ go build
    $ npm i

Run the following command if you'd like to seed the application with some example data.

    $ ./meditations seed 2018-02-22 # put in today's date

    $ ./meditations serve --port 8080 --database sample.sqlite3 --migrate 

## Doc rewrite

Below is an initial rewrite of the docs, still under construction.

## Philosophy and usage

Meditations is based around the concept of using habit formation to accomplish long-term
results. Normally people think about things in terms of the goals they would like to achieve,
such as "I want to run a mile in under 5 minutes," and "I want to write a novel."

The problem is that these goals require quite a bit of work, and it's easy to lose sight of
that or get discouraged when one is starting from scratch.

The idea of meditations is that you can break your day down into daily habits that will eventually
result in long-term progress towards these goals, logging relevant statistics and creating a positive
feedback loop. Meditations does this in a simple manner by tracking tasks based on their names.

So for example, if your goal is to become an accomplished runner, you might start a series of tasks
called "Run." You'd add a "Run" task for the current year, the current month, and then copy it over
to the day each day you want to run. You'll note success or failure by clicking on the daily "Run"
task. When you start logging daily completions, meditations will track your overall completion rate
as well as your completion streaks.

This is a very loose and non-prescriptive way of logging things, which is what I've found to work
best. It works well for establishing new habits as well as tracking existing progress. For example,
if you generally stick to a diet, but have occasional "cheat days," it's easy to get a sense of
whether you're going too far by glancing at the success percentage. If you stick to your diet 90%
of the time, then you're probably going to be just fine. If it starts sliding below 85% or 80%,
maybe it's time to focus more on it. Want to exercise 3 days a week, and miss a day? No problem,
just delete the task and add one for the next day. Figuring out your success criteria is entirely
up to you -- meditations just handles the boring tracking part of it.

## API

Meditations has an API to enable external programs to interact with it. Examples of external
programs interacting with meditations might be:

- A program that tracks internet usage and automatically adds a daily 'Internet' task with usage
    time

- A phone/smartwatch run tracking program that adds or updates a daily 'Exercise' task with a
    comment reflecting run/location, statistics, and time spent

For API documentation, see `habits/model.ts` for type definitions and `habits/api.ts` for API
details. Note that any non-GET API method (POST, PUT, PATCH, DELETE) will cause a UI update to be
sent to all connected clients.

### Consistent things

All dates have the internal format of YYYY-MM-DD or YYYY-MM-DDZHH:MM:SS.

All objects returned by meditations have a CreatedAt, UpdatedAt, and DeletedAt field. These are
managed by the ORM. In the case of objects where dates are important, like tasks, the date is
determined by an additional Date field. This is because tasks might be added in advance or logged
after the fact.

### Tasks

Tasks are the main item of interest in meditations. Each task has the following fields:

| Name   | Type   | Description                                             |
|--------|--------|---------------------------------------------------------|
| ID     | int    | Task ID                                                 |
| Name   | string | Task name                                               |
| Scope  | int    | Task scope (1 = day, 2 = month, 3 = year, 4+ = project) |
| Status | int    | 0 = unset, 1 = success, 2 = failure                     |
| Order  | int    | Order within scope                                      |

Tasks also have a one-to-one relationship with comments, which have the following fields

```
ID: number
TaskID: number
Body: string (HTML)
```

Note that `Date` is the field that meditations uses to determine where a task should be.
CreatedAt, UpdatedAt and DeletedAt are internal fields maintained by the ORM, and only DeletedAt
will effect the functionality of meditations (if it's set, the row will be ignored).

### API Methods

#### GET /tasks

Accepts the following query string parameters: `scope`, `name`. You can pass `date` to get tasks
from a specific date, or `from` and `to` to fetch a range of dates, inclusively.

#### POST /tasks

Given a new task in JSON format, add a new task.

#### PUT /tasks/:taskid:int

Update an existing task. If given a comment, this will also add or update a comment as necessary.

```json
{
    "ID": 4,
    "Name": "Exercise",
    "Status": 1,
    "Comment": {
        "Body": "<p>ran 3 miles</p>"
    }
}
```

#### DELETE /tasks/:taskid:int

Delete a task by ID.

## Dependencies

- Go libraries: See Godeps/Godeps.json
- JS libraries: See package.json
- Programs: Pandoc (only necessary for exporting markdown/plaintext descriptions of progress)
- Browser: Meditations relies on modern browser features like `fetch,` and does not include
polyfills. It is developed against the latest version of Chrome, but should work on other
evergreen browsers.

## Attribution

The favicon.ico was used under public domain from [Tango](http://tango.freedesktop.org)
The logo at the top of the file was created by [@reallinfo](https://github.com/reallinfo). Thank you! :)
