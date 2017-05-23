import moment from 'moment';
import Common from './common-es6';

let current_bucket = 0;

/** Task store, for interacting with Tasks */
class TaskStore extends Common.Store {
  constructor() {
    super();

    // TODO: Remove, only necessary while this class is being extended rather than replacing TaskStore entirely
    /*
    for(const key of Object.getOwnPropertyNames(TaskStore.prototype)) {
      if(key.slice(0,3) == "on_") {
        this.on(key.slice(3).replace(/_/g, "-"), (task, arg1, arg2) => TaskStore.prototype[key](task, arg1, arg2));
      }
    }
    */
  }

  /**
   * Mounts all days; only called when the month navigation is changed or on startup
   */
  mount_days(date) {
    console.log("TaskStore.mount_days: Mounting all days");
    date = (date == 'string') ? moment.utc(date) : date.clone();
    const today = moment();

    let limit = date.daysInMonth() + 1;

    // If we are mounting the current month, we will not mount dates too far in advance so as to not clutter the screen
    if(today.month() == date.month() && today.year() == date.year()) {
      limit = today.date() + 1;
      // But do mount the next day if it's within 4 hours before midnight
      const next = today.clone();
      next.add(4, 'hours');
      if(next.date() != today.date()) {
        limit++;
      }
    }

    console.log(`TaskStore.mount_days: Getting daily tasks`, date.format('YYYY-MM-DD'), limit);
    $.get(`/habits/in-days?date=${date.format('YYYY-MM-DD')}&limit=${limit}`, (results) => {
      results = results || [];
      for(const result of results) {
        const ddate = moment(result.Date, "YYYY-MM-DD");
        const opts = { date: ddate, scope: Habits.Scope.day, tasks: result.Tasks };
        riot.mount(`#scope-day-${ddate.format('DD')}`, opts);
      }
    });
  }

  mount_scope(scope, date, mount) {
    let fetch;

    if(Habits.Scope.bucketp(scope)) {
      $.get(`/habits/in-bucket/${scope}`, (result) => {
        console.log(result);

        let [scope, tasks] = [result.scope, result.tasks];
        result = riot.mount("#scope-bucket", {
          date: date, scope: scope.ID, tasks: tasks, title: scope.Name, current_bucket: current_bucket
        });
      });
    } else {
      date = (typeof(date) == 'string') ? moment.utc(date) : date.clone();

      // Determine which method to call, which date to call it against, and where to mount the result
      let fetch, fetch_date = date.clone(), mount;
      if(scope == Habits.Scope.day) {
        fetch = "day";
        fetch_date = fetch_date;
        mount = `#scope-day-${date.format('DD')}`;
      } else if(scope == Habits.Scope.month) {
        fetch = "month";
        fetch_date = fetch_date.date(1);
        mount = '#scope-month';
      } else if(scope == Habits.Scope.year) {
        fetch = "year";
        fetch_date = fetch_date.date(1).month(0);
        mount = '#scope-year';
      }

      $.get(`/habits/in-${fetch}?date=${fetch_date.format('YYYY-MM-DD')}`, (tasks) => {
        tasks = tasks || [];
        const opts = { date: date, scope: scope, tasks: tasks, current_bucket: current_bucket };
        const result = riot.mount(mount, opts);
      });
    }
  }

  /**
   * Shorthand for calling a backend function with a single task
   * @param {string} path Path of habits call
   * @param {Object} task Task
   * @param {function(Object)} [thunk] Called after success
   */
  command(path, task, thunk) {
    console.log(`ES6 command ${path}`);
    const request = { url: `/habits/${path}`, data: task };
    if(thunk) {
      request.success = thunk;
    }
    return Common.request(request);
  }

  /**
   * Move a task up in the list
   */
  on_task_order_up(task) { this.command('order-up', task); }

  /** 
   * Move a task down in the list
   */
  on_task_order_down(task) { this.command('order-down', task); }

  /**
   * Save changes to a task
   */
  on_task_update(task) {
    // Do not update comment
    delete task.comment;
    this.command('update', task);
  }

  /**
   * Delete a task
   * @param {Object} Delete a task
   */
  on_task_delete(task) {
    this.command('delete', task, () => {
      // TODO: Using jQuery for this is not right
      $(`#task-${task.ID}`).remove();
    });
  }

  /**
   * Create a new task
   * @param {Habits.Scope} scope Scope of the task
   * @param {string} name 
   * @param {moment} date Moment date object
   */
  on_task_new(scope, task_name, date) {
    Common.request({
      url: "/habits/new",
      scope: scope,
      success: () => {
        this.mount_scope(scope, date);
      },
      data: {
        name: task_name,
        scope: scope,
        date: date.format("YYYY-MM-DDTHH:mm:ssZ"),
      },
    });
  }

  /**
   * Log a task's time
   * @param {Object} task The task
   * @param {string} time Time string (e.g. 5:03 for 5 hours, 3 minutes)
   */
  on_task_log_time(task, time) {
    // Parse something like "5" (5 minutes) or "5:03" (5 hours, 3 minutes)
    time = time.split(":");
    if(time.length == 1) {
      task.hours = 0;
      task.minutes = parseInt(time[0]);
    } else if(time.length == 2) {
      task.hours = parseInt(time[0]);
      task.minutes = parseInt(time[1]);
    } else {
      // TODO: Error reporting
      console.warn("Bad time", time);
    }
    // Do not update comment
    delete task.comment;
    this.command('update', task);
  }

  /**
   * Save changes to a task's comment
   */
  on_comment_update(task, comment) {
    console.log(`ES6 on_comment_update`);
    return Common.request({
      url: "/habits/comment-update",
      data: comment
    });
  }
};

/**
 * Habits frontend functionality
 * @exports habits-es6
 */
const Habits = {
  /**
   * Task scopes
   * @enum {number}
   */
  Scope: {
    /** Represents a bucket */
    bucket: 0,
    /** Daily task */
    day: 1,
    /** Monthly task */
    month: 2, 
    /** Yearly task */
    year: 3,
    /** Used to check whether task is in a custom bucket */
    wrap: 4,
    bucketp: ((scope) => (scope == Habits.Scope.bucket || scope > Habits.Scope.year)),
  },

  /**
   * Task statsues
   * @enum {number}
   */
  Status: {
    /** Task status has not been set */
    unset: 0,
    /** Task is complete */
    complete: 1,
    /** Task is incomplete */
    incomplete: 2,
    wrap: 3
  },

  TaskStore: TaskStore,

  /**
   * Initialize Habits frontend
   */
  /*
  main: () => {
    Common.initialize();
    console.log("Habits: initializing");

  },
  */
};

export default Habits;
