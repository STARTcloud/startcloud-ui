import { useCallback, useEffect, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchCerts } from '../api/certsStore';

const IDLE = { rows: [], loaded: false, failed: false };

/**
 * The rows of the backend's store the person reads: one `GET /api/certs`
 * an organization the person belongs to, or one under no organization
 * while they belong to none, each row once, read on open, on `read` and
 * on the `certs` topic's `cert-updated` and `cert-removed` while
 * `enabled`, nothing read otherwise.
 *
 * @param {Array<{ name: string }>} organizations - The person's organizations
 * @param {boolean} [enabled] - Whether the store is read at all
 * @returns {{ rows: Array<Object>, loaded: boolean, failed: boolean, read: Function }} The rows
 */
export const useSharedRows = (organizations, enabled = true) => {
  const [state, setState] = useState(IDLE);
  const names = organizations.map(organization => organization.name).join(',');

  const read = useCallback(() => {
    if (!enabled) {
      return;
    }
    const list = names ? names.split(',') : [''];
    Promise.all(list.map(name => fetchCerts(name).catch(() => [])))
      .then(answers => {
        const seen = new Set();
        const rows = answers
          .flat()
          .filter(row => Array.isArray(answers) && row && !seen.has(row.id) && seen.add(row.id));
        setState({ rows, loaded: true, failed: false });
      })
      .catch(error => {
        log.api.error('Error fetching shared certificates', { error: error.message });
        setState(current => ({ ...current, loaded: true, failed: true }));
      });
  }, [names, enabled]);

  useEffect(() => {
    read();
  }, [read]);

  useEventStream('cert-updated', () => read());
  useEventStream('cert-removed', () => read());

  return { ...state, read };
};
