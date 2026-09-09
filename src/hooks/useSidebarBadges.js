import { useEffect, useRef, useState } from 'react';

import { useUnread } from '../contexts/UnreadContext';
import { client } from '../lib/runtime';
import { hasFeature } from '../utils/capabilities';

import { useEventStream } from './useEventStream';

const BLOCKED_COUNT_PATH = '/api/admin/brute-force/count';

const badgesOf = entries =>
  entries
    .flatMap(group => group.sections || [])
    .flatMap(section => section.items)
    .map(row => row.badge)
    .filter(Boolean);

const countOf = data => Math.max(0, Number(data?.count) || 0);

/**
 * The counts behind the sidebar rows' `badge` names, resolved by the shell
 * and never by an export: `unread` is the notifications feature's one
 * context, the same count the user menu's bell and the inbox page read,
 * read once from the notifications adapter's `unreadCount()` when the
 * stream connects and kept by the `notifications` topic's `unread-count`
 * event; `blockedCount` read once from `GET /api/admin/brute-force/count`
 * when the stream connects and kept by the `admin` topic's `blocked-count`
 * event. On a host without a stream each is read once on mount; no timer
 * runs, and a name no mounted row carries is never resolved.
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
  const badges = badgesOf(entries);
  const wanted = badges.join(',');
  const streaming = hasFeature(status, 'events') && Boolean(status.events);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  });

  const wantsUnread = badges.includes('unread');
  const wantsBlocked = badges.includes('blockedCount');

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

  useEventStream('ready', () => {
    readRef.current.readUnread();
    readRef.current.readBlocked();
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

  useEffect(() => {
    if (streaming) {
      return;
    }
    readRef.current.readUnread();
    readRef.current.readBlocked();
  }, [streaming, wanted]);

  return { ...counts, unread };
};
