import { useEffect, useRef, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchStats } from '../api/agents';

/**
 * One agent's stats, `stats` at the path the role fixes, read once on
 * mount and whenever the id changes, and again when the event stream
 * opens fresh or answers `reset`, the shape of `useSidebarBadges`;
 * `loaded` answers true once the named agent has answered or failed.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ stats: Object|null, loaded: boolean, failed: boolean }} The stats
 */
export const useHostStats = (status, id) => {
  const [state, setState] = useState({ key: '', stats: null, failed: false });

  const read = () => {
    fetchStats(status, id)
      .then(stats => setState({ key: id, stats, failed: false }))
      .catch(error => {
        log.api.error('Error fetching host stats', { id, error: error.message });
        setState({ key: id, stats: null, failed: true });
      });
  };

  const readRef = useRef(read);

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    readRef.current();
  }, [id]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      readRef.current();
    }
  });

  useEventStream('reset', () => readRef.current());

  return { stats: state.stats, loaded: state.key === id, failed: state.failed };
};
