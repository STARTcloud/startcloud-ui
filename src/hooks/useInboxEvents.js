import { useEffect, useRef } from 'react';

import { eventHub } from '../lib/runtime';
import { INBOX_EVENTS } from '../utils/inboxEvents';

/**
 * Subscribe a component to the row events of the `notifications` topic,
 * `notification-created`, `notification-read`, `notification-unread`,
 * `notification-dismissed`, `inbox-read-all` and `inbox-cleared`, for as
 * long as it is mounted; the newest handler is called with the event's
 * name and data.
 *
 * @param {(name: string, data: Object) => void} handler - Called once per event
 */
export const useInboxEvents = handler => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const offs = INBOX_EVENTS.map(name =>
      eventHub.subscribe(name, data => handlerRef.current(name, data))
    );
    return () => offs.forEach(off => off());
  }, []);
};
