#!/usr/bin/env python3
# gentestdb.py - Generate test database data for debugging and automated tests
import random, sys, os
from datetime import datetime, timedelta

TIME_FORMAT = "%Y-%m-%d %H:%M:%S"

def now():
    return datetime.now().strftime(TIME_FORMAT)

SCOPE_BUCKET = 0
SCOPE_DAY = 1
SCOPE_MONTH = 2
SCOPE_YEAR = 3

STATUS_UNSET = 0
STATUS_COMPLETE = 1
STATUS_INCOMPLETE = 2

class Task(object):
    COUNT = 1

    def __init__(self, name, date, status, scope, order, minutes, comment_fn = None):
        self.id = Task.COUNT
        Task.COUNT += 1

        self.name = name
        self.created_at = now()

        self.date = (date - timedelta(0, seconds = date.second, minutes=date.minute, hours=date.hour)).strftime(TIME_FORMAT)

        self.status = status
        self.scope = scope
        self.order = order
        self.minutes = minutes
        
        self.comment = Comment("<p>Task %s</p>" % self.id if not comment_fn else comment_fn(self), 0, self.id)

    def __repr__(self):
        return('INSERT INTO "tasks" VALUES({0.id}, "{0.created_at}", "{0.created_at}", NULL, "{0.name}", "{0.date}", {0.status}, {0.scope}, {0.order}, 0, {0.minutes});\n{0.comment}'.format(self))

class Comment(object):
    COUNT = 1

    def __init__(self, body, scope, task_id):
        self.id = Comment.COUNT
        Comment.COUNT += 1

        self.created_at = now()
        self.body = body
        self.task_id = task_id

    def __repr__(self):
        return('INSERT INTO "comments" VALUES({0.id}, "{0.created_at}", "{0.created_at}", NULL, "{0.body}", {0.task_id});'.format(self))

def daterange(start_date, end_date):
    for n in range(int ((end_date - start_date).days)):
        yield start_date + timedelta(n)

def gen_tasks(name, days=90, order=0, status = None, minutes = "NULL", comment_fn = None):
    end = datetime.now() + timedelta(days =12)
    "Generate months worth of example tasks"
    month = None
    for date in daterange(end - timedelta(days), end):
        status_n = status
        if not status:
            status_n = random.randint(1, 2)
        if not month:
            month = date
            yield Task(name, date, status_n, SCOPE_MONTH, order, minutes, comment_fn)
        elif month.month != date.month or month.year != date.year:
            if month.year != date.year:
                yield Task(name, date, status_n, SCOPE_YEAR, order, minutes, comment_fn)
            month = None
        yield Task(name, date, status_n, SCOPE_DAY, order, minutes, comment_fn)

class Entry(object):
    COUNT = 1

    def __init__(self, date, body_fn):
        self.id = Entry.COUNT
        Entry.COUNT += 1

        self.created_at = now()
        self.date = date
        self.name = date.strftime("Entry %Y/%m/%d")
        self.body = body_fn(self)

    def __repr__(self):
        return ('INSERT INTO "entries" values({0.id}, "{0.date}", NULL, NULL, "{0.date}", "{0.name}", "{0.body}", NULL);\n'\
                'INSERT INTO entry_tags values({0.id}, 1);'.format(self))

random.seed("Not really random!")

def gen_entries(body_fn, days=90):
    end = datetime.now() + timedelta(days = 1)
    for date in daterange(end - timedelta(days), end):
        yield Entry(date, body_fn)

created_at = now()
print('BEGIN TRANSACTION;')
print('DELETE FROM comments; DELETE FROM tasks; DELETE FROM entries; DELETE FROM entry_tags; DELETE FROM tags;')

def exercise_comment(task):
    if task.scope == SCOPE_DAY:
        task.minutes = random.randint(20,40)
        return "<p>Ran %s minutes</p>" % task.minutes
    return "<p>Goal: run every day</p>"

[print(task) for task in gen_tasks("Exercise", status = STATUS_COMPLETE, minutes = 30, comment_fn = exercise_comment)]

def diet_comment(task):
    if task.scope == SCOPE_DAY:
        return "<p>%s calories</p>" % (random.randint(2000, 2450) if task.status == STATUS_COMPLETE else random.randint(2550, 3000))
    return "<p>Goal: Eat <2500 calories daily</p>"

[print(task) for task in gen_tasks("Diet", order = 1, comment_fn = diet_comment)]

print("INSERT INTO \"tags\" values(1, \"%s\", \"%s\", NULL, \"aeneid\");")

# Create journal entries from Tom Sawyer
lines = [x.replace('"', '\'') for x in filter(lambda x: x != "", open(os.path.join(os.path.dirname(__file__), 'gentestdb-journal.txt')).read().split("\n"))]
def gen_entry_body(entry):
    line = lines.pop(0)
    entry.name = ' '.join(line.split(" ")[:3])
    return line

[print(e) for e in gen_entries(gen_entry_body)]
print('END TRANSACTION;')
