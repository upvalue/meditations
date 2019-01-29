import React from 'react';

export class TestPage extends React.Component {
  componentDidMount() {
    const socket = new WebSocket('ws://localhost:8080/subscriptions', 'graphql-ws');

    socket.addEventListener('open', e => {
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: {},
      }));


    });

    socket.addEventListener('message', e => {
      const msg = JSON.parse(e.data);

      console.log(msg);

      if (msg.type === 'connection_ack') {

        socket.send(JSON.stringify({
          type: 'start',
          id: 'taskEvents',
          payload: {
            query: `
subscription {
  taskEvents {
    Type, Data {
      ... on habitSyncMessage {
        Tasks { ID }
      }
    }
  }
}
          `,
          }
        }))
      }
    });

    socket.addEventListener('error', e => {
      console.log(e);
    });

  }
  render() {
    return <p>howdy</p>
  }
}
