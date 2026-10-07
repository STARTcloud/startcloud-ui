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
 * which the shell's inbox reader keeps from boot; `blockedCount` read once
 * from `GET /api/admin/brute-force/count` when the stream opens fresh or
 * answers `reset` and kept by the `admin` topic's `blocked-count` event;
 * an in-ring reconnect replays what was missed and reads nothing. On a
 * host without a stream it is read once on mount; no timer runs, and a
 * name no mounted row carries is never resolved.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Array} options.entries - The mounted features' sidebar groups
 * @returns {Object<string, number>} The counts by badge name
 */
export const useSidebarBadges = ({ status, entries }) => {
  const [counts, setCounts] = useState({});
  const { unread } = useUnread();
  const badges = badgesOf(entries);
  const wanted = badges.join(',');
  const streaming = hasFeature(status, 'events') && Boolean(status.events);
  const wantsBlocked = badges.includes('blockedCount');

  const readBlocked = () => {
    if (!wantsBlocked) {
      return;
    }
    client
      .get(BLOCKED_COUNT_PATH)
      .then(data => setCounts(previous => ({ ...previous, blockedCount: countOf(data) })))
      .catch(() => null);
  };

  const readRef = useRef(readBlocked);

  useEffect(() => {
    readRef.current = readBlocked;
  });

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      readRef.current();
    }
  });

  useEventStream('reset', () => readRef.current());

  useEventStream('blocked-count', data => {
    if (wantsBlocked) {
      setCounts(previous => ({ ...previous, blockedCount: countOf(data) }));
    }
  });

  useEffect(() => {
    if (streaming) {
      return;
    }
    readRef.current();
  }, [streaming, wanted]);

  return { ...counts, unread };
};
