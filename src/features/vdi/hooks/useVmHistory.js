import { useEffect, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchHistory, fetchStats } from '../api/fleet';

export const SINCE_OPTIONS = ['1h', '6h', '24h', '7d', '30d'];
const HISTORY_LIMIT = 100;
const EMPTY = { key: '', events: [], stats: null, failed: false };

/**
 * The event history and the statistics of one VM over the chosen window:
 * `/api/vdi/vms/{id}/history` and `/stats` for `since`, fetched while
 * `enabled`, refetched when the window changes, on `refresh`, and when a
 * `vm-events` frame names the VM.
 *
 * @param {string} instanceId - The VM's instance id
 * @param {Object} [options] - The fetch gate
 * @param {boolean} [options.enabled] - Whether to fetch at all
 * @returns {{ since: string, setSince: Function, events: Array, stats: Object|null, loading: boolean, failed: boolean, refresh: Function }} The history
 */
export const useVmHistory = (instanceId, { enabled = true } = {}) => {
  const [since, setSince] = useState('24h');
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState(EMPTY);
  const key = `${instanceId}|${since}|${nonce}`;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let mounted = true;
    Promise.all([
      fetchHistory(instanceId, { since, limit: HISTORY_LIMIT }),
      fetchStats(instanceId, { since }),
    ])
      .then(([history, stats]) => {
        if (mounted) {
          setData({ key, events: history.events || [], stats, failed: false });
        }
      })
      .catch(error => {
        log.api.error('Error fetching VM history', { instanceId, error: error.message });
        if (mounted) {
          setData({ key, events: [], stats: null, failed: true });
        }
      });
    return () => {
      mounted = false;
    };
  }, [enabled, key, instanceId, since]);

  const refresh = () => setNonce(current => current + 1);

  useEventStream('vm-events', frame => {
    if (frame.instance_id === instanceId) {
      refresh();
    }
  });

  return {
    since,
    setSince,
    events: data.events,
    stats: data.stats,
    loading: enabled && data.key !== key,
    failed: data.failed,
    refresh,
  };
};
