import * as React from "react";
import { connect } from "react-redux";

import { HabitsState, Scope, ScopeType } from "../state";
import { PresentScope } from "./PresentScope";
import { client } from "../../common/graphql";

interface Props {
  day: Scope;
  month: Scope;
  title: string;
}

type CheckMap = { [key: number]: boolean };

interface State {
  checked: CheckMap;
}

class CTimeScopeEmpty extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const checked: CheckMap = {};

    for (const task of props.month.Tasks) {
      checked[task.ID] = true;
    }

    this.state = { checked };
  }

  uncheckAll = () => {
    const checked: CheckMap = {};

    for (const task of this.props.month.Tasks) {
      checked[task.ID] = false;
    }

    this.setState({ checked });
  };

  /**
   * Check or uncheck a task
   */
  check = (ID: number) => {
    this.setState(prevState => ({
      checked: {
        ...prevState.checked,
        [ID]: !prevState.checked[ID]
      }
    }));
  };

  get copyableTasks() {
    return this.props.month.Tasks.filter(t => t.CompletedTasks > 0);
  }

  /**
   * Copy over tasks from the monthly scope to the daily one
   */

  copyOver = () => {
    const tasks = this.props.month.Tasks.filter(
      t => this.state.checked[t.ID] && t.CompletedTasks > 0
    );

    const date = this.props.day.Date.clone();

    console.log(date.format());

    client.request(`mutation CopyOverTasks {
        first: addTasks(
          scope: ${ScopeType.DAY},
          date: "${date.format()}",
          names: [${tasks.map(t => `"${t.Name}"`)}]
        )
      }
    `);
  };

  render() {
    // Only display tasks that are used as actual habits, and not just one-off ones
    const tasks = this.copyableTasks;

    return (
      <PresentScope scope={this.props.day} title={this.props.title}>
        <div className="scope-day-empty">
          <p>
            Would you like to copy over tasks from the monthly scope to get
            started? If not, just add a task to dismiss this message.
          </p>
          {tasks.map(t => {
            return (
              <div key={t.ID} className="scope-day-empty-task">
                <label>
                  <input
                    type="checkbox"
                    checked={this.state.checked[t.ID]}
                    className="mr-2"
                    onChange={() => this.check(t.ID)}
                  />
                  {t.Name}
                </label>
              </div>
            );
          })}

          <div className="mt-1">
            <button onClick={this.copyOver} className="btn btn-primary ">
              Copy tasks
            </button>

            <button
              onClick={this.uncheckAll}
              className="btn btn-secondary ml-1"
            >
              Uncheck all
            </button>
          </div>
        </div>
      </PresentScope>
    );
  }
}

export const DayScopeEmpty = connect((state: HabitsState) => ({
  month: state.month
}))(CTimeScopeEmpty);
