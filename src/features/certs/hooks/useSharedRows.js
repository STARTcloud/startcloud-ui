import { useCallback, useEffect, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchCerts } from '../api/certsStore';

const IDLE = { rows: [], loaded: false, failed: false };

/**
 * The rows of a store the person reads, the backend's by default: one
 * `GET /api/certs` an organization the person belongs to, or one under
 * no organization while they belong to none, each row once, read on
 * open, on `read` and on the `certs` topic's `cert-updated` and
 * `cert-removed` while `enabled`, nothing read otherwise; `fetchRows`
 * names another store's read, the identity provider's.
 *
 * @param {Array<{ name: string }>} organizations - The person's organizations
 * @param {boolean} [enabled] - Whether the store is read at all
 * @param {Function} [fetchRows] - The store's read of one organization's rows
 * @returns {{ rows: Array<Object>, loaded: boolean, failed: boolean, read: Function }} The rows
 */
export const useSharedRows = (organizations, enabled = true, fetchRows = fetchCerts) => {
  const [state, setState] = useState(IDLE);
  const names = organizations.map(organization => organization.name).join(',');

  const read = useCallback(() => {
    if (!enabled) {
      return;
    }
    const list = names ? names.split(',') : [''];
    Promise.all(list.map(name => fetchRows(name).catch(() => [])))
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
  }, [names, enabled, fetchRows]);

  useEffect(() => {
    read();
  }, [read]);

  useEventStream('cert-updated', () => read());
  useEventStream('cert-removed', () => read());

  return { ...state, read };
};
