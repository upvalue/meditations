#!/usr/bin/env python
# gentestdb.py - Generate test database data for debugging and automated tests
import random
from datetime import datetime, timedelta

import bcrypt

TIME_FORMAT = "%Y-%m-%d %H:%M:%S"

def now():
    return datetime.now().strftime(TIME_FORMAT)

SCOPE_DAY = 0
SCOPE_MONTH = 1
SCOPE_YEAR = 2
SCOPE_BUCKET = 3

STATUS_UNSET = 0
STATUS_COMPLETE = 1
STATUS_INCOMPLETE = 2

class Task(object):
    COUNT = 1

    def __init__(self, name, date, status, scope, order):
        self.id = Task.COUNT
        Task.COUNT += 1

        self.name = name
        self.created_at = now()

        self.date = (date - timedelta(0, seconds = date.second, minutes=date.minute, hours=date.hour)).strftime(TIME_FORMAT)

        self.status = status
        self.scope = scope
        self.order = order

    def __repr__(self):
        return('INSERT INTO "tasks" VALUES({0.id}, "{0.created_at}", "{0.name}", "{0.date}", {0.status}, {0.scope}, {0.order});'.format(self))

class TaskComment(object):
    COUNT = 1

    def __init__(self, name, body, scope, task_id):
        self.id = TaskComment.COUNT
        TaskComment.COUNT += 1

        self.name = name
        self.body = body
        self.scope = scope
        self.task_id = task_id

    def __repr__(self):
        return('INSERT INTO "taskcomments" VALUES({0.id}, "{0.created_at}", "{0.body}", {0.scope}, {0.task_id});'.format(self))

def daterange(start_date, end_date):
    for n in range(int ((end_date - start_date).days)):
        yield start_date + timedelta(n)

def gen_tasks(name, days=90, order=0, status = None):
    end = datetime.now()
    "Generate months worth of example tasks"
    month = None
    for date in daterange(end - timedelta(days), end):
        status_n = status
        if not status:
            status_n = random.randint(1, 2)
        task = Task(name, date, status_n, SCOPE_DAY, order)
        if not month:
            month = date
            yield Task(name, date, status_n, SCOPE_MONTH, order)
        elif month.month != date.month or month.year != date.year:
            month = None
            yield Task(name, date, status_n, SCOPE_YEAR, order)
        yield task

random.seed("Not really random")

print('BEGIN TRANSACTION;')
[print(task) for task in gen_tasks("Exercise")]
[print(task) for task in gen_tasks("Diet", order = 1)]
print('END TRANSACTION;')
