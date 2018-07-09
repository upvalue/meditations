import * as React from 'react';
import { CommonState } from '../index';
import { ModalProvider } from '../modal';

const IntroMessage = () => {
  return (
    <>
      <p><strong>Welcome to meditations!</strong></p>

      <p>Meditations is a daily task manager based on the principles of habit formation.</p>

      <p>
        If you'd like to read more about meditations and how to use it,
        the best place to start is its README:
      </p>
      <p>
        <a href="https://github.com/ioddly/meditations">https://github.com/ioddly/meditations</a>
      </p>

      <p>
        If you'd like to learn more about its creator or need a similar application developed,
        visit <a href="https://upvalue.io">https://upvalue.io</a>.</p>

      <p>Enjoy.</p>

    </>
  );
};

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
              {n.message === 'INTRO' ?
                <IntroMessage />
              :
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {n.message}
                </pre>
              }
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
