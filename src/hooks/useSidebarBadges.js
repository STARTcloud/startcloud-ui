import { useEffect, useRef, useState } from 'react';

import { useUnread } from '../features/notifications/context/UnreadContext';
import { client } from '../lib/runtime';
import { hasFeature } from '../utils/capabilities';

import { useEventStream } from './useEventStream';

const BLOCKED_COUNT_PATH = '/api/admin/brute-force/count';

const badgeNamesOf = entries =>
  entries
    .flatMap(group => group.sections || [])
    .flatMap(section => section.items)
    .map(row => row.badge)
    .filter(Boolean);

const countOf = data => Math.max(0, Number(data?.count) || 0);

/**
 * The counts behind the sidebar rows' `badge` names, resolved by the
 * shell and never by an export: `unread` is the notifications feature's
 * one context, the same count the user menu's bell and the inbox page
 * read, written here from the `notifications` topic's `unread-count`
 * event where the host advertises `events` and from the notifications
 * adapter's `unreadCount()` once on mount where it does not;
 * `blockedCount` from the `admin` topic's `blocked-count` event after
 * one read of `GET /api/admin/brute-force/count` when the stream
 * connects. No timer runs; a name no mounted row carries is never
 * resolved.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Array} options.entries - The mounted features' sidebar groups
 * @param {Object|null} options.notifications - The notifications adapter, or null
 * @returns {Object<string, number>} The counts by badge name
 */
export const useSidebarBadges = ({ status, entries, notifications }) => {
  const [counts, setCounts] = useState({});
  const { unread, set: setUnread } = useUnread();
  const wanted = badgeNamesOf(entries).join(',');
  const streaming = hasFeature(status, 'events') && Boolean(status.events);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  });

  const wantsUnread = wanted.split(',').includes('unread');
  const wantsBlocked = wanted.split(',').includes('blockedCount');

  const set = (name, value) => setCounts(previous => ({ ...previous, [name]: value }));

  const readUnread = () => {
    if (!wantsUnread || !notificationsRef.current) {
      return;
    }
    notificationsRef.current
      .unreadCount()
      .then(data => setUnread(countOf(data)))
      .catch(() => null);
  };

  const readBlocked = () => {
    if (!wantsBlocked) {
      return;
    }
    client
      .get(BLOCKED_COUNT_PATH)
      .then(data => set('blockedCount', countOf(data)))
      .catch(() => null);
  };

  const readRef = useRef({ readUnread, readBlocked });

  useEffect(() => {
    readRef.current = { readUnread, readBlocked };
  });

  useEventStream('unread-count', data => {
    if (wantsUnread) {
      setUnread(countOf(data));
    }
  });

  useEventStream('blocked-count', data => {
    if (wantsBlocked) {
      set('blockedCount', countOf(data));
    }
  });

  useEventStream('ready', () => {
    readRef.current.readUnread();
    readRef.current.readBlocked();
  });

  useEffect(() => {
    if (streaming) {
      return;
    }
    readRef.current.readUnread();
    readRef.current.readBlocked();
  }, [streaming, wanted]);

  return { ...counts, unread };
};
