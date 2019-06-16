// useSubscription.tsx - manage store through subscriptions with mutations automatically dispatching
// updates as though they came from a subscription

// https://github.com/apollographql/subscriptions-transport-ws/blob/maser/PROTOCOL.md

import React, { useEffect, useReducer, useRef, useContext, useCallback } from 'react';
import { request } from '../api/request';

type Variables = { [key: string]: any };

export type SocketProviderProps = {
  children?: React.ReactNode;
}

/**
 * Given the result of a GraphQL query, return the resulting object
 * without the query name
 * @param result 
 */
const stripQueryName = (result: any) => {
  // Remove query name 
  const key = Object.keys(result)[0];
  return result[key];
}

// Things needed to happen

// useSubscription hook triggers an actual subscription message (and unsubscribe message if necessary,
// we won't worry about multiple subscriptions at least to start)

// useSubscription does this by getting subscribe callback from context

// useSubscription takes the GQL query and a second argument, the function that takes subscription
// values

type SocketProviderState = {
  subscribe: (query: string, onUpdate: (x: any) => void) => void;
  unsubscribe: () => void;
  onUpdate: (x: any) => void;
  subscribed: string | false,
  sessionId: number,
}

const initialState: SocketProviderState = {
  subscribe: (): void => undefined,
  unsubscribe: (): void => undefined,
  onUpdate: (x: any): void => undefined,
  subscribed: false,
  sessionId: -1,
}

export const SocketContext =
  React.createContext<typeof initialState>(null as any as typeof initialState);

type InitialAction = {
  type: 'INITIALIZE';
  subscribe: (query: string, onUpdate: (x: any) => void) => undefined;
  unsubscribe: () => undefined;
}

type SubscribeAction = {
  type: 'SUBSCRIBE';
  onUpdate: (x: any) => void;
  query: string;
}

type UnsubscribeAction = {
  type: 'UNSUBSCRIBE';
}

/**
 * Dispatched when a unique session ID is obtained
 */
type RegisterAction = {
  type: 'REGISTER';
  sessionId: number;
}

type Action = InitialAction | SubscribeAction | UnsubscribeAction | RegisterAction;

const reducer = (
  state: typeof initialState,
  action: Action
): typeof initialState => {
  switch (action.type) {
    case 'INITIALIZE': {
      return {
        ...state,
        subscribe: action.subscribe,
      };
    }
    case 'SUBSCRIBE': {
      if (state.subscribed !== false) {
        console.warn('Only one subscription may be active at a time. Make sure to unsubscribe in cleanup before mounting another subscription component');
      }
      return {
        ...state,
        subscribed: action.query,
        onUpdate: action.onUpdate,
      };
    }
    case 'UNSUBSCRIBE':
      return {
        ...state, subscribed: false
      }
    case 'REGISTER':
      return {
        ...state, sessionId: action.sessionId
      }
  }
  return state;
}

export const SocketProvider = (props: SocketProviderProps) => {
  // Initial subscription - in case a subscription component is mounted
  // before WebSocket even has a chance to connect
  const initialSubscription = useRef<any>(null);

  const subscriptionId = useRef(-1);

  // Callback for when subscription update is received
  const onUpdate = useRef((x: any): void => undefined);

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    subscribe: (query: string, onUpdateCb: (x: any) => void) => {
      initialSubscription.current = [query, onUpdateCb];
    }
  });

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:4000/graphql`, 'graphql-subscriptions');

    const subscribe = (query: string, onUpdateCb: (x: any) => void) => {
      dispatch({
        type: 'SUBSCRIBE',
        query,
        onUpdate: onUpdateCb,
      });

      onUpdate.current = onUpdateCb;

      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'start',
          id: 'taskEvents',
          payload: {
            query,
          }
        }))
      } else {
        console.warn('Failed to SUBSCRIBE because WebSocket is closed');
      }
      return undefined;
    };

    dispatch({
      type: 'INITIALIZE',
      subscribe,
      unsubscribe: () => {
        dispatch({ type: 'UNSUBSCRIBE' });
        return undefined;
      },
    });

    ws.addEventListener('open', e => {
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {}
      }));

      if (initialSubscription.current !== null) {
        const [query, onUpdateCb] = initialSubscription.current;
        subscribe(query, onUpdateCb);
        initialSubscription.current = null;
      }
    })

    ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'data') {
        onUpdate.current(stripQueryName(msg.payload.data));
      }
    });

    ws.addEventListener('error', e => {
      console.error(e);
    });
  }, []);

  return (
    <SocketContext.Provider value={state}>
      {props.children}
    </SocketContext.Provider>
  );
}

export const useSubscription = <T extends {}>(query: string, onUpdate: (obj: T) => void) => {
  const socketContext = useContext(SocketContext);

  useEffect(() => {
    socketContext.subscribe(query, onUpdate);

    return () => socketContext.unsubscribe();
  }, []);
}

/**
 * Returns a callback that fires off a mutation query whose return value interacts with the 
 * subscription onUpdate callback as though it were returned from a subscription
 */
export const useMutation = (query: string) => {
  const { onUpdate } = useContext(SocketContext);

  return useCallback((variables?: Variables) => {
    request(query, variables)
      .then((res: any) => {
        // Remove query name 
        onUpdate(stripQueryName(res));
      });
  }, [query, onUpdate])
}