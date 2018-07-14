// components.tsx -- habits components
import * as moment from 'moment';
import * as React from 'react';
import { times } from 'lodash';

import * as common from '../../common';
import { OcticonButton, OcticonSpan }
  from '../../common/components/OcticonButton';
import {
  OcticonPlus, OcticonFlame, OcticonClippy, OcticonTrashcan, OcticonPin, OcticonCheck,
  OcticonClock, OcticonArchive, OcticonArrowRight, OcticonArrowDown,
} from '../../common/octicons';

import {
  ScopeType, Project, dispatchProjectListUpdate,
  ProjectVisibility,
} from '../state';
import { urlForView } from '../main';

import { storeUIState, fetchStoredUIState } from '../../common/storage';
import { modalContext, ModalProvider } from '../../common/modal';

/**
 * Project activity indicator. Returns flame icons with repeated flames and
 * redder colors for more activity.
 *
 * @param p Project
 * @param days Number of days
 */
const projectActivityIcon = (p: Project, days: number) => {
  const projectActivityClass = Math.min(p.CompletedTasks, 23);

  const flameCount = projectActivityClass / 4;

  return (
    <>
    {times(Math.max(1, flameCount), (i) => {
      return <OcticonSpan
        key={i}
        icon={OcticonFlame}
        className={`project-activity-${projectActivityClass}`}
        title={`${p.CompletedTasks} in the last ${days} days`}
      />;
    })}
    </>
  );
};

export interface ProjectListProps {
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  hiddenProjects: Project[];
  projectStatsDays: number;
}

export interface ProjectListState {
  showHiddenProjects: boolean;
}

/**
 * List of projects that allows hiding, pinning and displays project statistics.
 */
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

    return (
      <div key={project.ID} className="d-flex flex-row flex-justify-between">
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

          <OcticonButton
            icon={OcticonClippy}
            tooltip="Copy to left"
            onClick={() => this.copyLeft(project)}
          />

          {project.Visibility !== ProjectVisibility.Hidden &&
            <OcticonButton
              icon={OcticonPin}
              tooltip={
                project.Visibility === ProjectVisibility.Pinned ? 'Unpin project' : 'Pin project'
              }
              onClick={() => this.pinProject(project)}
            />
          }

          {project.Visibility !== ProjectVisibility.Pinned &&
            <OcticonButton
              icon={OcticonArchive}
              tooltip="(Un)hide project"
              onClick={() => this.hideProject(project)}
            />
          }

          <OcticonButton
            icon={OcticonTrashcan}
            tooltip="Delete project"
            onClick={this.deleteProject(modal, project.ID)}
          />
        </div>
      </div>
    );
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
    return (
      <modalContext.Consumer>
        {modal =>
          <section className="project-list border bg-gray ">
            <div
              className="d-flex flex-row flex-justify-between border-bottom scope-header pl-1 pr-1"
            >
              <h3 className="scope-title">Projects</h3>
              <div className="scope-controls pr-1 pt-1 flex-self-center">
                <OcticonButton
                  icon={OcticonPlus}
                  tooltip="Add new project"
                  onClick={this.addProject(modal)}
                />
              </div>
            </div>

            <div className="pl-1 pr-1 pt-1">
              {this.props.pinnedProjects.map(p => this.renderProjectLink(modal, p))}
            </div>

            <hr className="mt-1 mb-1" />

            <div className="pl-1 pr-1">
              {this.props.unpinnedProjects.map(p => this.renderProjectLink(modal, p))}
            </div>

            <div className="d-flex flex-row pt-1 pl-1">
              <h4
                onClick={this.toggleDisplayHidden}
                style={{ cursor: 'pointer' }}
              >
                <OcticonButton
                  icon={this.state.showHiddenProjects ? OcticonArrowDown : OcticonArrowRight}
                />
                &nbsp;Inactive projects
              </h4>
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
              <div className="d-flex flex-column flex-md-row flex-justify-between">
                <div>
                  Showing stats for last <button className="btn btn-sm ">
                    {this.props.projectStatsDays}
                  </button> days
                </div>
                <div className="pt-1 pt-md-0">
                  <input
                    ref={(ref) => { if (ref) this.projectStatsDaysInput = ref; }}
                    type="text"
                    size={2}
                    placeholder="Enter days"
                    className="mr-1 form-control input-sm"
                    onBlur={() => this.statsFromInput()}
                  />
                  <button
                    className="btn btn-sm btn-secondary mr-1"
                    onClick={() => this.statsFromStartOfYear()}
                  >
                    Start of year
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => this.statsFromForever()}
                  >
                    Forever
                  </button>
                </div>
              </div>

            </div>
          </section>
        }
      </modalContext.Consumer>
    );
  }
}
