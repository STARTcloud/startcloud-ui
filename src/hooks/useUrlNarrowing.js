import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const NO_FILTERS = [];

const ARRIVAL_KEY = 'q';

const nonEmpty = values =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));

const queryOf = (params, queryKey) =>
  params.get(queryKey) ?? (queryKey === ARRIVAL_KEY ? '' : params.get(ARRIVAL_KEY)) ?? '';

/**
 * The narrowing of a page held in its URL: the query under `queryKey`, or
 * the `q` the page arrived with while `queryKey` is absent, replacing the
 * router entry as it is typed, and one value per filter key, each change
 * of a filter a router entry of its own; `setNarrowing(query, patch)`
 * writes the query and filters together as typed; the URL carries the
 * non-empty values alone.
 *
 * @param {Object} options
 * @param {string} options.queryKey - The URL key of the query
 * @param {string[]} [options.filterKeys] - The URL keys of the filters
 * @returns {{ query: string, setQuery: Function, setNarrowing: Function, applied: Object, setFilter: Function, setFilters: Function, clearFilters: Function, narrowed: Object }} The narrowing, `narrowed` the non-empty values the URL holds
 */
export const useUrlNarrowing = ({ queryKey, filterKeys = NO_FILTERS }) => {
  const [params, setParams] = useSearchParams();
  const query = queryOf(params, queryKey);
  const applied = useMemo(
    () => Object.fromEntries(filterKeys.map(key => [key, params.get(key) || ''])),
    [filterKeys, params]
  );

  const write = useCallback(
    (nextQuery, filters, options) =>
      setParams(nonEmpty({ [queryKey]: nextQuery, ...filters }), options),
    [queryKey, setParams]
  );

  const setQuery = useCallback(value => write(value, applied, { replace: true }), [write, applied]);

  const setNarrowing = useCallback(
    (value, patch) => write(value, { ...applied, ...patch }, { replace: true }),
    [write, applied]
  );

  const narrowed = useMemo(
    () => nonEmpty({ [queryKey]: query, ...applied }),
    [queryKey, query, applied]
  );

  return {
    query,
    setQuery,
    setNarrowing,
    applied,
    setFilter: (key, value) => write(query, { ...applied, [key]: value }),
    setFilters: patch => write(query, { ...applied, ...patch }),
    clearFilters: () => write(query, {}),
    narrowed,
  };
};
