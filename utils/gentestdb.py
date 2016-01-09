#!/usr/bin/env python
# gentestdb.py - Generate test database data for debugging and automated tests
import random
from datetime import datetime, timedelta

import bcrypt

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

SCOPE_DAY = 0
SCOPE_MONTH = 1
SCOPE_YEAR = 2
SCOPE_UNSET = 3
SCOPE_BUCKET = 4

STATUS_UNSET = 0
STATUS_COMPLETE = 1
STATUS_INCOMPLETE = 2

class Task(object):
    COUNT = 1

    def __init__(self, name, date, status, scope, order):
        self.id = Task.COUNT + 1
        Task.COUNT += 1
        self.name = name
        self.created_at = now()
        self.date = date
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

print(Task("Hello", now(), STATUS_UNSET, SCOPE_DAY, 0))
