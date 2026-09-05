import { useEffect, useRef, useSyncExternalStore } from 'react';

import { eventHub } from '../lib/runtime';

/**
 * Subscribe a component to one named event of the tab's event stream for
 * as long as it is mounted; the newest handler is called, so a handler
 * closing over state never goes stale.
 *
 * @param {string} name - The event name, e.g. `vm-updated`
 * @param {(data: unknown, id: string|null) => void} handler - Called with the event's data
 */
export const useEventStream = (name, handler) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => eventHub.subscribe(name, (data, id) => handlerRef.current(data, id)), [name]);
};

/**
 * The connection state of the tab's event stream: `connecting`, `live`,
 * `reconnecting`, `paused` or `stopped`.
 *
 * @returns {string} The state
 */
export const useEventStreamStatus = () => useSyncExternalStore(eventHub.onStatus, eventHub.status);
