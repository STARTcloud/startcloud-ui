import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SETTLE_MS = 250;
const NO_FILTERS = [];

const nonEmpty = values =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));

const useSettled = (value, delay) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
};

/**
 * The narrowing of a page that lives in its URL: the navbar query under
 * `queryKey` and one value per filter key, each read on load and written
 * back as a router entry so a shared link lands narrowed and the back
 * button restores it. The query edits live and reaches the URL once it
 * settles; a filter reaches it at once; the URL carries the non-empty
 * values alone. `narrowed` is the same non-empty map, the query under
 * `queryKey` as the URL holds it, the parameters a paged list sends.
 *
 * @param {Object} options
 * @param {string} options.queryKey - The URL key of the query
 * @param {string[]} [options.filterKeys] - The URL keys of the filters
 * @returns {{ query: string, setQuery: Function, applied: Object, setFilter: Function, setFilters: Function, clearFilters: Function, narrowed: Object }} The narrowing
 */
export const useUrlNarrowing = ({ queryKey, filterKeys = NO_FILTERS }) => {
  const [params, setParams] = useSearchParams();
  const appliedQuery = params.get(queryKey) || '';
  const applied = useMemo(
    () => Object.fromEntries(filterKeys.map(key => [key, params.get(key) || ''])),
    [filterKeys, params]
  );
  const [edit, setEdit] = useState(null);
  const editing = edit !== null && edit.base === appliedQuery;
  const query = editing ? edit.value : appliedQuery;
  const settled = useSettled(query, SETTLE_MS);
  const setQuery = useCallback(value => setEdit({ base: appliedQuery, value }), [appliedQuery]);

  const write = useCallback(
    (nextQuery, filters) => setParams(nonEmpty({ [queryKey]: nextQuery, ...filters })),
    [queryKey, setParams]
  );

  useEffect(() => {
    if (editing && settled === query && settled !== appliedQuery) {
      write(settled, applied);
    }
  }, [editing, query, settled, appliedQuery, applied, write]);

  const narrowed = useMemo(
    () => nonEmpty({ [queryKey]: appliedQuery, ...applied }),
    [queryKey, appliedQuery, applied]
  );

  return {
    query,
    setQuery,
    applied,
    setFilter: (key, value) => write(appliedQuery, { ...applied, [key]: value }),
    setFilters: patch => write(appliedQuery, { ...applied, ...patch }),
    clearFilters: () => write(appliedQuery, {}),
    narrowed,
  };
};
