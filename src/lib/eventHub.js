import { openEventStream } from './sse';

/**
 * The one event stream of a tab: pages and the chrome subscribe to named
 * events, the app connects the stream once the host advertises `events`
 * and a session exists, and the connection state is observable for a
 * live indicator. A handler is called with the event's data and a second
 * argument: the frame's id for a named event, `null` for `reset`, and for
 * `ready` whether the connection resumed from a last id, so a subscriber
 * reads its snapshot on a fresh connection and never on an in-ring
 * reconnect.
 *
 * @returns {{ subscribe: Function, connect: Function, disconnect: Function, status: Function, onStatus: Function }} The hub
 */
export const createEventHub = () => {
  const handlers = new Map();
  const statusListeners = new Set();
  let stop = null;
  let state = 'stopped';

  const setState = next => {
    state = next;
    statusListeners.forEach(listener => listener(next));
  };

  const dispatch = (name, data, id) => {
    [...(handlers.get(name) || [])].forEach(handler => handler(data, id));
  };

  const subscribe = (name, handler) => {
    if (!handlers.has(name)) {
      handlers.set(name, new Set());
    }
    handlers.get(name).add(handler);
    return () => {
      handlers.get(name)?.delete(handler);
    };
  };

  const disconnect = () => {
    if (stop) {
      stop();
      stop = null;
    }
  };

  const connect = ({ url, topics, headers, onUnauthorized }) => {
    disconnect();
    stop = openEventStream({
      url,
      topics,
      headers,
      onEvent: dispatch,
      onReady: (data, resumed) => dispatch('ready', data, resumed),
      onReset: data => dispatch('reset', data, null),
      onStatus: setState,
      onUnauthorized,
    });
  };

  const onStatus = listener => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  };

  return { subscribe, connect, disconnect, status: () => state, onStatus };
};
