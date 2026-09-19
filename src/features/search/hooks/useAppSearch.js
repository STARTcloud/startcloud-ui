import { useMemo } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { searchServer } from '../api/search';

/**
 * The app-wide search behind the navbar and the search page: the host's
 * own `GET /api/search`, reached only where the host lists the `search`
 * feature token (the navbar's box and panel and the `/search` route each
 * gate on it); the mounted collections, the host's `role` and whether the
 * person is a global `admin` ride along for the row-to-path mapping.
 *
 * @param {Array<Object>} collections - The collections the host mounts
 * @param {boolean} admin - Whether the person holds `ROLE_ADMIN`
 * @returns {{ search: Function, collections: Array<Object>, role: string, admin: boolean }} The app search
 */
export const useAppSearch = (collections, admin) => {
  const status = useStatus();
  return useMemo(
    () => ({ search: searchServer, collections, role: status.role, admin }),
    [status, collections, admin]
  );
};
