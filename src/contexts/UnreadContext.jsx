import PropTypes from 'prop-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useEventStream } from '../hooks/useEventStream';
import { streamsNotifications } from '../lib/streamTarget';

import { useStatus } from './StatusContext';

const UnreadContext = createContext(null);

const NO_PROVIDER = {
  unread: 0,
  live: false,
  set: () => undefined,
  adjust: () => undefined,
  read: () => undefined,
  observe: () => undefined,
  watchRows: () => () => undefined,
};

const countOf = data => Math.max(0, Number(data?.count) || 0);

/**
 * The notifications feature's one context and the shell's inbox reader,
 * mounted at the shell from boot: while `notifications` is handed, the
 * adapter of a signed-in person on a host that lists `notifications`, it
 * reads `unreadCount()` once as the person is signed in, the `ready` of
 * the connection that sign-in opens reading nothing more, again on a
 * later fresh `ready` and on `reset` where the stream carries the
 * `notifications` topic, and keeps the count by its `unread-count`
 * event; `live` says the topic is streamed, so the menu row reads again
 * on a menu open and after the person's own action only where it is
 * not. The user menu's avatar badge and row, the sidebar's Inbox badge,
 * the modal and the inbox page read the one count; `set(count)` writes a
 * read, `adjust(delta)` follows the person's own action (`-Infinity`
 * clears it), and `observe(rows)` hands the rows a read of the inbox
 * answered to every `useInboxRows` watcher. No timer runs.
 */
export const UnreadProvider = ({ notifications = null, children }) => {
  const status = useStatus();
  const live = streamsNotifications(status);
  const active = Boolean(notifications);
  const [unread, setUnread] = useState(0);
  const notificationsRef = useRef(notifications);
  const seededRef = useRef(false);
  const watchersRef = useRef(new Set());

  useEffect(() => {
    notificationsRef.current = notifications;
  });

  const set = useCallback(count => setUnread(Math.max(0, Number(count) || 0)), []);

  const adjust = useCallback(
    delta => setUnread(count => (delta === -Infinity ? 0 : Math.max(0, count + delta))),
    []
  );

  const read = useCallback(() => {
    const adapter = notificationsRef.current;
    if (!adapter) {
      return;
    }
    adapter
      .unreadCount()
      .then(data => setUnread(countOf(data)))
      .catch(() => null);
  }, []);

  useEffect(() => {
    seededRef.current = active && live;
    if (active) {
      read();
    }
  }, [active, live, read]);

  useEventStream('ready', (data, resumed) => {
    if (!live || !data || resumed || !notificationsRef.current) {
      return;
    }
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    read();
  });

  useEventStream('reset', () => {
    if (live) {
      read();
    }
  });

  useEventStream('unread-count', data => {
    if (notificationsRef.current) {
      setUnread(countOf(data));
    }
  });

  const observe = useCallback(rows => {
    watchersRef.current.forEach(watcher => watcher(rows));
  }, []);

  const watchRows = useCallback(watcher => {
    watchersRef.current.add(watcher);
    return () => {
      watchersRef.current.delete(watcher);
    };
  }, []);

  const value = useMemo(
    () => ({ unread: active ? unread : 0, live, set, adjust, read, observe, watchRows }),
    [active, unread, live, set, adjust, read, observe, watchRows]
  );
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
};

UnreadProvider.propTypes = {
  notifications: PropTypes.shape({ unreadCount: PropTypes.func.isRequired }),
  children: PropTypes.node.isRequired,
};

/**
 * The shared unread count, whether the stream carries it, and its
 * writers; a component outside the provider reads zero and its writes go
 * nowhere.
 *
 * @returns {{ unread: number, live: boolean, set: Function, adjust: Function, read: Function, observe: Function, watchRows: Function }}
 */
export const useUnread = () => useContext(UnreadContext) || NO_PROVIDER;

/**
 * Call `watcher` with the rows each read of the inbox answers, the modal's
 * and the inbox page's, for as long as the component is mounted; the
 * newest watcher is called.
 *
 * @param {(rows: Array<Object>) => void} watcher - Called once per read
 */
export const useInboxRows = watcher => {
  const { watchRows } = useUnread();
  const watcherRef = useRef(watcher);

  useEffect(() => {
    watcherRef.current = watcher;
  });

  useEffect(() => watchRows(rows => watcherRef.current(rows)), [watchRows]);
};
