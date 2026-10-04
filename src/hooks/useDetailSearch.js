import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../components/common/SubTable';
import { readDetailPrefs, withWidth, writeDetailPrefs } from '../utils/prefs';
import { nextSort, sortItems } from '../utils/sort';

import { useArrivalQuery } from './useArrival';
import { columnsGroup, hiddenToggle, useClientFilters } from './useClientFilters';
import { useNavbarSearchBinding } from './useSearchBinding';

/**
 * The navbar search binding of one client-side table: the query, first
 * the one the page arrived with, the page's filter groups and the Columns
 * group, with the sort, the hidden columns, the widths and the view kept
 * under `prefsKey`.
 *
 * @param {Object} options
 * @param {Array} options.rows - Every row of the table
 * @param {Function} options.matches - `matches(row, needle)` for one lower-cased needle
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.columns - The table's columns
 * @param {Object} options.ctx - The context the table's columns receive
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @param {Array} [options.filterGroups] - The client-side group specs of `useClientFilters`
 * @param {{ query: string, onQueryChange: Function, placeholder: string }|null} [options.bound] - A query held outside the hook
 * @param {Object|null} [options.url] - The `useUrlNarrowing` result holding the groups' values
 * @param {string[]|null} [options.views] - The views the page toggles between, the first the default
 * @param {Array} [options.defaultSort] - The sort stack drawn while nothing is saved
 * @returns {{ rows: Array, query: string, filtering: boolean, sort: Object, setSort: Function, hiddenColumns: Set, widths: Object, setColumnWidth: Function, view: string, setView: Function }} The narrowed, sorted rows and the search state
 */
export const useDetailSearch = ({
  rows,
  matches,
  placeholderKey,
  columns,
  ctx,
  prefsKey,
  filterGroups,
  bound = null,
  url = null,
  views = null,
  defaultSort = [],
}) => {
  const { t } = useTranslation();
  const arrivedQuery = useArrivalQuery();
  const [ownQuery, setOwnQuery] = useState(arrivedQuery);
  const query = bound ? bound.query : ownQuery;
  const setQuery = bound ? bound.onQueryChange : setOwnQuery;
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, columns, { views }));

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const needle = query.trim().toLowerCase();
  const searched = needle ? rows.filter(row => matches(row, needle)) : rows;
  const filters = useClientFilters({ specs: filterGroups, rows: searched, bound: url });
  const shown = columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const stack = prefs.sort.length > 0 ? prefs.sort : defaultSort;
  const sorted = sortItems(filters.rows, stack, shown, ctx);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: bound ? bound.placeholder : t(placeholderKey),
    matched: filters.rows.length,
    total: rows.length,
    groups: [
      ...filters.groups,
      columnsGroup({
        columns: drawnColumns(columns, sorted, ctx),
        hidden: prefs.hiddenColumns,
        onToggle: hiddenToggle(setPrefs),
        t,
      }),
    ],
    onClearFilters: filters.clear,
  });

  const setSort = (column, options) =>
    setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) }));

  const setColumnWidth = (column, pixels) =>
    setPrefs(current => ({ ...current, widths: withWidth(current.widths, column, pixels) }));

  return {
    rows: sorted,
    query,
    filtering: needle !== '' || filters.active,
    sort: stack,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth,
    view: prefs.view || '',
    setView: view => setPrefs(current => ({ ...current, view })),
  };
};
