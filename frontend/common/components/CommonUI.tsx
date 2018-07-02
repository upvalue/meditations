import * as React from 'react';
import { CommonState } from '..';
import { ModalProvider } from '../modal';

/**
 * Common UI elements (currently just a notification bar that appears at the top)
 */
export class CommonUI extends React.Component<CommonState> {
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
