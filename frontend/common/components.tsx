// components.tsx - Common components

import * as React from 'react';
import * as moment from 'moment';
import route from 'riot-route';
import * as MediumEditor from 'medium-editor';
import MediumEditorTable from 'medium-editor-tables';

import {
  OcticonData, OcticonTriangleLeft, OcticonChevronLeft, OcticonCalendar, OcticonChevronRight,
  OcticonTriangleRight, OcticonX,
} from './octicons';

import { CommonState } from '../common';

import { modalContext, ModalProvider } from './modal';

export interface EditableState {
  editor: MediumEditor.MediumEditor;
  editorOpen: boolean;
}

/** An item that has an editable body. Used for task comments and journal entries */
export class Editable<Props,
    State extends EditableState = EditableState> extends React.Component<Props, State> {
  /**
   * Reference to the HTML element that the MediumEditor will be installed on; should be set in
   * subclass's render method
   */
  body!: HTMLElement;

  componentWillMount() {
    this.setState({ editorOpen: false });
  }

  /** Abstract method; should compare body against model to determine if an update is warranted */
  editorUpdated() {
    console.error('editorUpdated not implemented');
    return false;
  }

  /** Abstract method; dispatch an asynchronous update of the Editable in question */
  editorSave() {
    console.error('editorSave not implemented');
  }

  /** Lazily create an editor; if it already exists, focus on it */
  editorOpen = (e?: React.MouseEvent<HTMLElement>) => {
    console.log('!!! editorOpen Called');
    if (!this.state.editor) {
      const options = {
        autoLink: true,
        placeholder: true,

        toolbar: {
          buttons: ['bold', 'italic', 'underline',
            'anchor', 'image', 'quote', 'orderedlist', 'unorderedlist',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table'],
        },

        keyboardCommands: false,

        paste: { cleanPastedHTML: true, forcePlainText: false },
        extensions: {
          table: new MediumEditorTable(),
        }};

      const editor = new MediumEditor(this.body, options);

      const listener = function (e: BeforeUnloadEvent) {
        const msg = 'You have unsaved changes';
        e.returnValue = msg;
        return msg;
      };

      editor.subscribe('focus', () => {
        window.addEventListener('beforeunload', listener);
      });

      editor.subscribe('blur', () => {
        window.removeEventListener('beforeunload', listener);
        // It is possible that blur may have been called because copy-paste causes MediumEditor to
        // create a 'pastebin' element, in which case we do not want to trigger a save.
        if (document.activeElement.id.startsWith('medium-editor-pastebin')) {
          return;
        }

        // Called on editor blur, check if anything needs to be updated and call the appropriate
        // method if so.
        const newBody = this.body.innerHTML;

        // Do not update if nothing has changed
        if (!this.editorUpdated()) {
          return;
        }

        this.editorSave();
        this.setState({ editorOpen: false });
      });

      this.setState({ editor, editorOpen: true });
    } else {
      this.setState({ editorOpen: true });
    }

    // Empty comments will have the no-display class added
    this.body.classList.remove('no-display');
    this.body.focus();
  }
}

interface OcticonButtonProps {
  icon: OcticonData;
  title?: string;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  /** Tooltip text */
  tooltip?: string;
  /** Tooltip direction, default w */
  tooltipDirection?: string;
  /** Additional classes to apply */
  className?: string;

  normalButton?: boolean;
  children?: any;

  /** Href for a link, if given */
  href?: string;
  /** If true, just a span, not a button */
  span?: boolean;
}

/**
 * A muted Octicon button. Also used to implement octicon spans.
 */
export const OcticonButton: React.SFC<OcticonButtonProps> =
  (props: OcticonButtonProps) => {
    const { children, icon,
      onClick, href, tooltip, normalButton,
      tooltipDirection, className, span, title } = props;
    let klassName = `${span ? ' ' : 'btn '} ${className} `;

    if (tooltip) {
      klassName = `${klassName} tooltipped tooltipped-${tooltipDirection}`;
    }

    if (!normalButton) {
      klassName = `${klassName} btn-octicon`;
    }

    return React.createElement(span ? 'span' : 'a', {
      href,
      title,
      onClick,
      className: klassName,
      'aria-label': tooltip,
    }, (
        <>
          <svg
            className="octicon-svg"
            width={icon.width}
            height={icon.height}
            viewBox={icon.viewBox}
          >
            {icon.pathRender()}
          </svg>
      {children}</>));
  };

/**
 * A muted, non-clickable Octicon.
 */
export const OcticonSpan: React.SFC<OcticonButtonProps> =
  props => <OcticonButton {...props} span={true} />;

OcticonButton.defaultProps = {
  tooltip: undefined,
  tooltipDirection: 'w',
  className: '',
  normalButton: false,
};

interface TimeNavigatorProps {
  /** Returns a page-appropriate route string for navigation */
  getRoute: (operation: 'subtract' | 'add' | 'reset', unit?: 'month' | 'year' | 'day') =>
    string | undefined;

  /** Date to work off of */
  currentDate: moment.Moment;

  /**
   * If true, only one set of arrows is available and it navigates days rather than
   * months and years.
   */
  daysOnly: boolean;
}

/** Navigate by months or years */
export class TimeNavigator extends React.PureComponent<TimeNavigatorProps> {
  navigate(e: React.MouseEvent<HTMLElement> | undefined,
      operation: 'subtract' | 'add' | 'reset', unit?: 'year' | 'month' | 'day') {

    if (e) {
      e.preventDefault();
    }

    const routestr = this.props.getRoute(operation, unit);
    if (routestr) {
      route(routestr);
    }
  }

  render() {
    const smallunit = this.props.daysOnly ? 'day' : 'month';
    return (
      <div className="d-flex flex-justify-between flex-md-row flex-column mb-1">
        <div className="d-flex flex-row">
          {!this.props.daysOnly &&
            <OcticonButton
              icon={OcticonTriangleLeft}
              tooltip="Go back one year"
              className="mr-md-1 d-flex flex-items-center"
              normalButton={true}
              href={`#${this.props.getRoute('subtract', 'year')}`}
              onClick={e => this.navigate(e, 'subtract', 'year')}
              tooltipDirection="e"
            />}

          <OcticonButton
            icon={OcticonChevronLeft}
            tooltip={`Go back one ${smallunit}`}
            tooltipDirection="e"
            className="mr-md-1 d-flex flex-items-center"
            normalButton={true}
            href={`#${this.props.getRoute('subtract', smallunit)}`}
            onClick={e => this.navigate(e, 'subtract', smallunit)}
          />

          <OcticonButton
            icon={OcticonCalendar}
            tooltip="Go to current date"
            tooltipDirection="e"
            className="mr-md-1 d-flex flex-items-center"
            normalButton={true}
            href={`#${this.props.getRoute('reset')}`}
            onClick={e => this.navigate(e, 'reset')}
          />

          <OcticonButton
            icon={OcticonChevronRight}
            tooltip={`Go forward one ${smallunit}`}
            tooltipDirection="e"
            className="mr-md-1 d-flex flex-items-center"
            normalButton={true}
            href={`#${this.props.getRoute('add', smallunit)}`}
            onClick={e => this.navigate(e, 'add', smallunit)}
          />

          {!this.props.daysOnly &&
            <OcticonButton
              icon={OcticonTriangleRight}
              tooltip="Go forward one year"
              className="mr-md-1 mr-0 d-flex flex-items-center"
              normalButton={true}
              tooltipDirection="e"
              href={`#${this.props.getRoute('add', 'year')}`}
              onClick={e => this.navigate(e, 'add', 'year')}
            />}
        </div>

        <h2 className="navigation-title ml-1">{this.props.currentDate.format('MMMM YYYY')}</h2>
      </div>
    );
  }
}

/** Simple CSS loading spinner */
export const Spinner = (props: any) => {
  return (
    <div className="spinner">
      <div className="bounce1" />
      <div className="bounce2" />
      <div className="bounce3" />
    </div>
  );
};

/**
 * Common UI elements (currently just a notification bar that appears at the top)
 */
export class CommonUI extends React.Component<CommonState, {}> {
  reconnect = () => {
    this.props.socketReconnect();
  }

  renderPopups() {
    if (!this.props.notifications && !this.props.socketClosed) {
      return <span />;
    }

    return (
      <div id="notifications" className="bg-gray border border-gray-dark p-2">
        <h3>Notifications
          {this.props.notifications &&
            <span className="float-right Label Label--gray-darker">
              {this.props.notifications.length}
            </span>
          }
        </h3>

        {this.props.socketClosed && <div>
          <div className="notification flash flash-error mb-2">
            <p>WebSocket connection failed!</p>
            <button className="btn btn-primary" onClick={this.reconnect}>
              Attempt reconnection
            </button>
          </div>
        </div>}

        {this.props.notifications &&
          <button className="btn btn-block mb-2" onClick={this.props.dismissNotifications}>
            Dismiss all notifications
          </button>}

        {this.props.notifications && this.props.notifications.map((n, i) => {
          return (
            <div
              key={i}
              className={`notification flash
              flash-with-icon mb-2 ${n.error ? 'flash-danger' : ''}`}
            >
              {n.message}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    return (
      <div>
        {this.renderPopups()}
        <ModalProvider socketClosed={this.props.socketClosed}>
          {this.props.children}
        </ModalProvider>
      </div>
    );
  }
}
