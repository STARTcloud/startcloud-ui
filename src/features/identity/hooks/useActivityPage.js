import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { exportUrl } from '../api/activity';

import { useAdminRead } from './useAdminRead';
import { useSettled } from './useListSearch';

const PAGE_SIZE = 25;
const SETTLE_MS = 250;

const pageOf = params => Math.max(0, Number(params.get('page')) || 0);

const filtersOf = params => ({
  username: params.get('username') || '',
  success: params.get('success') || '',
  start_date: params.get('start_date') || '',
  end_date: params.get('end_date') || '',
});

const paramsOf = filters =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));

/**
 * The state of one Activity page whose narrowing lives in its URL, so the
 * Dashboard's cards land on a preset: the applied filters and the
 * zero-based page read from the query, the username query the navbar box
 * edits and writes to the URL once it settles, the setters for one filter
 * and the date range, each re-reading page 1, the paged read over them
 * with the contract's example on a 404, and the handlers to clear, page
 * and export.
 *
 * @param {Object} options - The page
 * @param {Function} options.read - Answers the paged list for the parameters
 * @param {Object} options.example - The contract's example payload
 * @param {string} options.exportName - The export attachment's name
 * @returns {Object} `applied`, `query`, `setQuery`, `setFilter`, `setRange`, `clear`, `data`, `loading`, `reload`, `setPage`, `doExport`
 */
export const useActivityPage = ({ read, example, exportName }) => {
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => filtersOf(params), [params]);
  const page = pageOf(params);
  const [edit, setEdit] = useState(null);
  const editing = edit !== null && edit.base === applied.username;
  const query = editing ? edit.value : applied.username;
  const settled = useSettled(query, SETTLE_MS);
  const setQuery = useCallback(
    value => setEdit({ base: applied.username, value }),
    [applied.username]
  );

  const write = useCallback(
    (filters, nextPage) => {
      const next = paramsOf(filters);
      if (nextPage > 0) {
        next.page = String(nextPage);
      }
      setParams(next);
    },
    [setParams]
  );

  useEffect(() => {
    if (editing && settled === query && settled !== applied.username) {
      write({ ...applied, username: settled }, 0);
    }
  }, [editing, query, settled, applied, write]);

  const request = useMemo(() => ({ ...paramsOf(applied), page, size: PAGE_SIZE }), [applied, page]);

  const { data, loading, reload } = useAdminRead({
    read: () => read(request),
    example,
    key: JSON.stringify(request),
  });

  return {
    applied,
    query,
    setQuery,
    setFilter: (key, value) => write({ ...applied, [key]: value }, 0),
    setRange: range => write({ ...applied, start_date: range.start, end_date: range.end }, 0),
    clear: () => write({ ...filtersOf(new URLSearchParams()), username: applied.username }, 0),
    data,
    loading,
    reload,
    setPage: nextPage => write(applied, nextPage),
    doExport: () => window.location.assign(exportUrl(exportName, paramsOf(applied))),
  };
};
