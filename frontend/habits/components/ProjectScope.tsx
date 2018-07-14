import * as React from 'react';
import * as moment from 'moment';
import { ModalProvider, modalContext } from '../../common/modal';

import { TaskNew } from '../api';
import * as common from '../../common';
import { Scope } from '../state';
import { createCTask } from './Task';
import { OcticonButton } from '../../common/components/OcticonButton';
import { OcticonPlus } from '../../common/octicons';

export interface ProjectScopeProps {
  currentDate: moment.Moment;
  scope: Scope;
  projectStatsDays: number;
}

/**
 * Display a project with tasks.
 */
export class ProjectScope extends React.PureComponent<ProjectScopeProps> {
  constructor(props: ProjectScopeProps) {
    super(props);
  }

  changeProject(e: React.SyntheticEvent<HTMLSelectElement>) {
    e.persist();
    const projectID = parseInt(e.currentTarget.value, 10);

    if (isNaN(projectID)) return;

    route(`view/${this.props.currentDate.format(common.MONTH_FORMAT)}/${projectID}`);
  }

  addTask = (modal: ModalProvider) => {
    return modal.openModalPrompt('Enter task name', 'New task', (Name) => {
      if (Name) {
        TaskNew({
          Name,
          Date: this.props.scope.Date,
          Scope: this.props.scope.Scope,
        });
      }
    });
  }

  render() {
    const tasks = this.props.scope.Tasks.map(t => createCTask(t));

    return (
      <section className="scope bg-gray">
        <div className="scope-header d-flex flex-row flex-justify-between p-1 ">
          <h3 className="scope-title border-bottom ">
            <span><a href={`#view/${this.props.currentDate.format(common.MONTH_FORMAT)}/0`}>
              Projects</a></span>
            <span> &gt; {this.props.scope.Name}</span></h3>

          <modalContext.Consumer>
            {modal =>
              <OcticonButton
                className="flex-self-center"
                icon={OcticonPlus}
                tooltip="New task"
                onClick={this.addTask(modal)}
              />
            }
          </modalContext.Consumer>

        </div>

        {...tasks}
      </section>
    );
  }
}
