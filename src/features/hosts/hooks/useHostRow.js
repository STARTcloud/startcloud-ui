import { useMemo } from 'react';

import { useServers } from './useServers';

/**
 * One host's own row of the list `useServers` holds, the registry row on
 * the server role and the one serving agent's on an agent role, the row
 * a host's tokens and hypervisors are read from, found among every row
 * the server answered and never among the ones the chosen organization
 * narrows to; null while the list has not answered or names no such
 * host.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Object|null} The row
 */
export const useHostRow = id => {
  const { held } = useServers();
  return useMemo(() => held.find(row => String(row.id) === String(id)) || null, [held, id]);
};
