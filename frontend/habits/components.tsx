// components.tsx -- habits components
import * as moment from 'moment';
import * as React from 'react';
import route from 'riot-route';
import { times } from 'lodash';

import * as common from '../common';
import { OcticonButton, TimeNavigator, CommonUI, Spinner, OcticonSpan }
  from '../common/components';
import {
  OcticonPlus, OcticonFlame, OcticonClippy, OcticonTrashcan, OcticonPin, OcticonCheck,
  OcticonClock, OcticonThreeBars, OcticonArchive,
} from '../common/octicons';

import {
  ScopeType, FilterState, Scope, Project, HabitsState, dispatch, dispatchProjectListUpdate,
  ProjectVisibility,
} from './state';
import { routeForView, urlForView } from './main';

import { createCTask } from './components/Task';
import { storeUIState, fetchStoredUIState } from '../common/storage';
import { modalContext, ModalProvider } from '../common/modal';

/** Returns project activity indicator */
const projectActivityIcon = (p: Project, days: number) => {
  const projectActivityClass = Math.min(p.CompletedTasks, 23);

  const flameCount = projectActivityClass / 4;

  return (<>
    {times(Math.max(1, flameCount), (i) => {
      return <OcticonSpan
        key={i}
        icon={OcticonFlame}
        className={`project-activity-${projectActivityClass}`}
        title={`${p.CompletedTasks} in the last ${days} days`} />;
    })}
    </>);
};

export interface ProjectScopeProps {
  currentDate: moment.Moment;
  scope: Scope;
  projectStatsDays: number;
}

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
    return modal.openModalPrompt('Enter task name', 'New task', (name) => {
      if (name) {
        common.post(`/habits/new`, {
          name,
          date: this.props.scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
          scope: this.props.scope.Scope,
        });
      }
    });
  }

  render() {
    const tasks = this.props.scope.Tasks.map(t => createCTask(t));

    return <section className="scope bg-gray">
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
              tooltip="New task" onClick={this.addTask(modal)} />
          }
        </modalContext.Consumer>

      </div>

      {...tasks}
    </section>;
  }
}

export interface ProjectListProps {
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  hiddenProjects: Project[];
  projectStatsDays: number;
}

export interface ProjectListState {
  showHiddenProjects: boolean;
}

export class ProjectList extends React.PureComponent<ProjectListProps, ProjectListState> {
  projectStatsDaysInput!: HTMLInputElement;

  constructor(props: ProjectListProps) {
    super(props);

    this.state = {
      showHiddenProjects: fetchStoredUIState().showHiddenProjects,
    };
  }

  deleteProject(modal: ModalProvider, id: number) {
    return modal.openModalConfirm(
      'Are you sure you want to delete this project?', 'Delete this project!',
      () => {
        common.post(`/habits/projects/delete/${id}`);
      });
  }

  pinProject(p: Project) {
    common.post(`/habits/projects/toggle-pin/${p.ID}`);
  }

  hideProject(p: Project) {
    common.post(`/habits/projects/toggle-hide/${p.ID}`);
  }

  copyLeft(p: Project) {
    const task = {
      Name: p.Name,
      Scope: ScopeType.DAY,
      Date: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
    };

    common.post('/habits/new', task);
  }

  renderProjectLink = (modal: ModalProvider, project: Project) => {
    const hours = Math.floor(project.Minutes / 60);
    const minutes = project.Minutes % 60;

    let timeString = hours > 0 ? `${hours}h${minutes > 0 ? ' ' : ''}` : '';
    timeString = minutes > 0 ? `${timeString}${minutes}m` : `${timeString}`;

    return <div key={project.ID} className="d-flex flex-row flex-justify-between">
      <div>
        {project.Visibility === ProjectVisibility.Pinned &&
          projectActivityIcon(project, this.props.projectStatsDays)}

        <a href={urlForView('current', project.ID)}>{project.Name}</a>
      </div>

      <div className="project-controls d-flex flex-items-center">
        {(project.CompletedTasks > 0) &&
          <OcticonSpan icon={OcticonCheck} tooltip="Completed tasks">
            {project.CompletedTasks}
          </OcticonSpan>}

        {(hours > 0 || minutes > 0) &&
          <span className="mr-1 tooltipped tooltipped-w" aria-label="Time">
            <OcticonSpan icon={OcticonClock} tooltip="Time" className="ml-1">
              {hours > 0 && `${hours}h${minutes > 0 ? ' ' : ''}`}
              {minutes > 0 && `${minutes}m`}
            </OcticonSpan>
          </span>}

        &nbsp;

        <OcticonButton icon={OcticonClippy} tooltip="Copy to left"
          onClick={() => this.copyLeft(project)} />

        {project.Visibility !== ProjectVisibility.Hidden &&
          <OcticonButton icon={OcticonPin}
            tooltip={
              project.Visibility === ProjectVisibility.Pinned ? 'Unpin project' : 'Pin project'
            }
            onClick={() => this.pinProject(project)} />
        }

        {project.Visibility !== ProjectVisibility.Pinned &&
          <OcticonButton
            icon={OcticonArchive}
            tooltip="(Un)hide project"
            onClick={() => this.hideProject(project)} />
        }

        <OcticonButton icon={OcticonTrashcan} tooltip="Delete project"
          onClick={this.deleteProject(modal, project.ID)} />
      </div>
    </div>;
  }

  addProject(modal: ModalProvider) {
    return modal.openModalPrompt('New project name', 'Add new project', (name) => {
      if (name) {
        common.post(`/habits/projects/new/${name}`);
      }
    });
  }

  /** Calculate stats from the beginning of the year */
  statsFromStartOfYear() {
    const days = moment().diff(moment().startOf('year'), 'days');
    dispatchProjectListUpdate(days);
  }

  statsFromForever() {
    dispatchProjectListUpdate(365 * 30);
  }

  statsFromInput() {
    const n = parseInt(this.projectStatsDaysInput.value, 10);
    if (!isNaN(n)) {
      dispatchProjectListUpdate(n);
    }
  }

  toggleDisplayHidden = () => {
    this.setState({
      showHiddenProjects: !this.state.showHiddenProjects,
    });

    storeUIState({
      showHiddenProjects: !this.state.showHiddenProjects,
    });
  }

  render() {
    return <modalContext.Consumer>
      {modal =>
        <section className="project-list border bg-gray ">
          <div
            className="d-flex flex-row flex-justify-between border-bottom scope-header pl-1 pr-1">
            <h3 className="scope-title">Projects</h3>
            <div className="scope-controls pr-1 pt-1 flex-self-center">
              <OcticonButton icon={OcticonPlus} tooltip="Add new project"
                onClick={this.addProject(modal)} />
            </div>
          </div>

          <div className="pl-1 pr-1 pt-1">
            {this.props.pinnedProjects.map(p => this.renderProjectLink(modal, p))}
          </div>

          <hr className="mt-1 mb-1" />

          <div className="pl-1 pr-1">
            {this.props.unpinnedProjects.map(p => this.renderProjectLink(modal, p))}
          </div>

          {this.state.showHiddenProjects &&
            (<>
              <hr className="mt-1 mb-1" />
              <div className="pl-1 pr-1">
                {this.props.hiddenProjects.map(p => this.renderProjectLink(modal, p))}
              </div>
            </>)

          }

          <hr className="mt-1 mb-1" />
          <div className="pl-1 pr-1 pt-1 pb-1">
            <div className="d-flex flex-row flex-justify-between">
              <div>
                Showing stats for last <button className="btn btn-sm ">
                  {this.props.projectStatsDays}
                </button> days
              </div>
              <div>
                <input ref={(ref) => { if (ref) this.projectStatsDaysInput = ref; }}
                  type="text" size={2} placeholder="72" className="mr-1 form-control input-sm"
                  onBlur={() => this.statsFromInput()} />
                <button className="btn btn-sm btn-secondary mr-1"
                  onClick={() => this.statsFromStartOfYear()}>
                  Start of year
                </button>
                <button className="btn btn-sm btn-secondary"
                  onClick={() => this.statsFromForever()}>
                  Forever
                </button>
              </div>
            </div>
            <div className="d-flex flex-row">
              <label>
                <input type="checkbox"
                  checked={this.state.showHiddenProjects}
                  onChange={this.toggleDisplayHidden} />
                &nbsp;Display hidden projects
              </label>
            </div>
          </div>
        </section>
      }
    </modalContext.Consumer>;
  }
}
