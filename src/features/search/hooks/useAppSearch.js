import { useMemo } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { hasFeature } from '../../../utils/capabilities';
import { searchServer } from '../api/search';
import { searchLocal } from '../utils/searchLocal';

/**
 * The app-wide search behind the navbar and the search page: the host's
 * own `GET /api/search` when it advertises the `search` feature token,
 * else a client-side walk of the data the mounted collections load;
 * `available` when either applies; the host's `role` and whether the
 * person is a global `admin` ride along for the row-to-path mapping.
 *
 * @param {Array<Object>} collections - The collections the host mounts
 * @param {boolean} admin - Whether the person holds `ROLE_ADMIN`
 * @returns {{ search: Function, available: boolean, collections: Array<Object>, role: string, admin: boolean }} The app search
 */
export const useAppSearch = (collections, admin) => {
  const status = useStatus();
  return useMemo(() => {
    const server = hasFeature(status, 'search');
    const local = collections.some(collection => typeof collection.adapter.listAll === 'function');
    return {
      search: server ? searchServer : (query, limit) => searchLocal({ collections, query, limit }),
      available: server || local,
      collections,
      role: status.role,
      admin,
    };
  }, [status, collections, admin]);
};
