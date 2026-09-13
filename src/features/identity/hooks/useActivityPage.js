import { useMemo, useState } from 'react';

import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { exportUrl } from '../api/activity';

import { useAdminRead } from './useAdminRead';

const FILTER_KEYS = ['success', 'start_date', 'end_date'];
const NO_KEYS = [];

const without = (values, keys) =>
  Object.fromEntries(Object.entries(values).filter(([key]) => !keys.includes(key)));

/**
 * The state of one Activity page: the `username` query and the
 * `success`, `start_date` and `end_date` filters in the URL through
 * `useUrlNarrowing`, beside the page's `clientKeys`, the URL keys of the
 * groups that narrow the loaded rows client-side and never reach the
 * list; the zero-based page held here and reset to 0 on every change of
 * the list's narrowing or of `size`, the page's own size, kept in the
 * navbar panel's Per page group by the caller and handed in here, the
 * paged read over it with the contract's example on a 404, and the
 * handlers to set a filter, the date range, clear, page and export.
 *
 * @param {Object} options - The page
 * @param {Function} options.read - Answers the paged list for the parameters
 * @param {Object} options.example - The contract's example payload
 * @param {string} options.exportName - The export attachment's name
 * @param {number} options.size - The page size the list answers
 * @param {string[]} [options.clientKeys] - The URL keys of the client-side groups
 * @returns {Object} `applied`, `narrowed`, `query`, `setQuery`, `setFilter`, `setRange`, `clear`, `data`, `loading`, `reload`, `setPage`, `doExport`
 */
export const useActivityPage = ({ read, example, exportName, size, clientKeys = NO_KEYS }) => {
  const filterKeys = useMemo(() => [...FILTER_KEYS, ...clientKeys], [clientKeys]);
  const url = useUrlNarrowing({ queryKey: 'username', filterKeys });
  const narrowed = useMemo(() => without(url.narrowed, clientKeys), [url.narrowed, clientKeys]);
  const [page, setPage] = useState(0);
  const [pagedFor, setPagedFor] = useState({ narrowed, size });

  if (pagedFor.narrowed !== narrowed || pagedFor.size !== size) {
    setPagedFor({ narrowed, size });
    setPage(0);
  }

  const request = useMemo(() => ({ ...narrowed, page, size }), [narrowed, page, size]);

  const { data, loading, reload } = useAdminRead({
    read: () => read(request),
    example,
    key: JSON.stringify(request),
  });

  return {
    applied: url.applied,
    narrowed,
    query: url.query,
    setQuery: url.setQuery,
    setFilter: url.setFilter,
    setRange: range => url.setFilters({ start_date: range.start, end_date: range.end }),
    clear: url.clearFilters,
    data,
    loading,
    reload,
    setPage,
    doExport: () => window.location.assign(exportUrl(exportName, narrowed)),
  };
};
