import { useMemo, useState } from 'react';

import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { exportUrl } from '../api/activity';

import { useAdminRead } from './useAdminRead';

const PAGE_SIZE = 25;
const FILTER_KEYS = ['success', 'start_date', 'end_date'];

/**
 * The state of one Activity page: the `username` query and the
 * `success`, `start_date` and `end_date` filters in the URL through
 * `useUrlNarrowing`, the zero-based page held here and reset to 1 on
 * every change of the narrowing, the paged read over them with the
 * contract's example on a 404, and the handlers to set a filter, the date
 * range, clear, page and export.
 *
 * @param {Object} options - The page
 * @param {Function} options.read - Answers the paged list for the parameters
 * @param {Object} options.example - The contract's example payload
 * @param {string} options.exportName - The export attachment's name
 * @returns {Object} `applied`, `narrowed`, `query`, `setQuery`, `setFilter`, `setRange`, `clear`, `data`, `loading`, `reload`, `setPage`, `doExport`
 */
export const useActivityPage = ({ read, example, exportName }) => {
  const url = useUrlNarrowing({ queryKey: 'username', filterKeys: FILTER_KEYS });
  const [page, setPage] = useState(0);
  const [pagedFor, setPagedFor] = useState(url.narrowed);

  if (pagedFor !== url.narrowed) {
    setPagedFor(url.narrowed);
    setPage(0);
  }

  const request = useMemo(() => ({ ...url.narrowed, page, size: PAGE_SIZE }), [url.narrowed, page]);

  const { data, loading, reload } = useAdminRead({
    read: () => read(request),
    example,
    key: JSON.stringify(request),
  });

  return {
    applied: url.applied,
    narrowed: url.narrowed,
    query: url.query,
    setQuery: url.setQuery,
    setFilter: url.setFilter,
    setRange: range => url.setFilters({ start_date: range.start, end_date: range.end }),
    clear: url.clearFilters,
    data,
    loading,
    reload,
    setPage,
    doExport: () => window.location.assign(exportUrl(exportName, url.narrowed)),
  };
};
