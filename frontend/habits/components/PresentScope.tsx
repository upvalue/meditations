import * as React from 'react';
import * as mousetrap from 'mousetrap';

import * as common from '../../common';
import { modalContext, ModalProvider } from '../../common/modal';
import { Scope } from '../state';
import { OcticonPlus } from '../../common/octicons';
import { OcticonButton } from '../../common/components';
import { KEYSEQ_TASK_ADD } from '../../common/constants';

export interface PresentScopeProps {
  title: string;
  scope: Scope;
  mostRecentDay?: boolean;
}

/**
 * Scope presentation element. Made because time-based and project-based scopes have some different
 * functionality
 */
export class PresentScope extends React.Component<PresentScopeProps> {
  bindAddTask(modal: ModalProvider) {
    // This seems like a bad idea...yet it's the most convenient way to do this with the context
    // modals
    mousetrap.bind(KEYSEQ_TASK_ADD, () => {
      this.addTask(modal)();
      return false;
    });
  }

  componentWillUnmount() {
    if (!this.props.mostRecentDay) return;

    mousetrap.unbind(KEYSEQ_TASK_ADD);
  }

  addTask = (modal: ModalProvider) => {
    const { scope } = this.props;

    return modal.openModalPrompt('Enter name:', 'Add new task', (name: string) => {
      if (name) {
        common.post(`/habits/new`, {
          name,
          date: scope.Date.format('YYYY-MM-DDTHH:mm:ssZ'),
          scope: scope.Scope,
        });
      }
    });
  }

  render() {
    const { title, children } = this.props;

    return <modalContext.Consumer>
      {modal =>
        <section className="scope bg-gray mb-2">
          { this.props.mostRecentDay && this.bindAddTask(modal) }
          <div className="scope-header border-bottom d-flex flex-row flex-justify-between">
            <h3 className="pl-2">{title}</h3>
            <div className="scope-controls pr-1 pt-1 ">
              <OcticonButton
                className=""
                icon={OcticonPlus}
                onClick={this.addTask(modal)}
                tooltip="Add task" />
            </div>
          </div>

          <div className="scope-tasks mt-1">
            {children}
          </div>
        </section>
      }
    </modalContext.Consumer>;
  }
}
