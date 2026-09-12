import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readDetailPrefs, toggleIn, writeDetailPrefs } from '../utils/prefs';
import { nextSort, sortItems } from '../utils/sort';

import { useClientFilters } from './useClientFilters';
import { useNavbarSearchBinding } from './useSearchBinding';

const columnsGroup = ({ columns, hidden, setPrefs, t }) => ({
  key: 'columns',
  label: t('pages.filter.columns'),
  entries: Object.fromEntries(columns.map(column => [column.key, null])),
  activeSet: new Set(columns.map(column => column.key).filter(key => !hidden.has(key))),
  activeClass: 'bg-secondary',
  columns: true,
  labelFor: key => t(columns.find(column => column.key === key).labelKey),
  onToggle: key =>
    setPrefs(current => ({ ...current, hiddenColumns: toggleIn(current.hiddenColumns, key) })),
});

/**
 * Registers one navbar search binding for a detail page's table, with one
 * filter group per enumerable column the page names in `filterGroups`,
 * narrowing the rows client-side, and one Columns group last that shows
 * or hides the table's columns, and returns the rows the query and the
 * groups leave in the active sort order, the query itself, whether a
 * query or a group is active, the sort with its setter and the hidden
 * column keys. A sort on a hidden column is dropped until the column
 * returns; the sort is a stack, a Shift-click on a header adding to it.
 * The sort, the hidden columns and, on a page with the view toggle, the
 * view named in `views` persist together under `prefsKey`, one object per
 * key; Clear filters empties the groups and keeps the query. A page that
 * keeps the query elsewhere (the URL) hands it in as `bound`, with its own
 * placeholder, and the hook publishes that instead of its own state; a
 * page that keeps its groups' values in the URL hands its
 * `useUrlNarrowing` result in as `url`.
 *
 * @param {Object} options
 * @param {Array} options.rows - Every row of the table
 * @param {Function} options.matches - `matches(row, needle)` for one lower-cased needle
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.columns - The table's columns, each with `key`, `labelKey` and optionally `sortValue` and `defaultHidden`
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @param {Array} [options.filterGroups] - The client-side group specs of `useClientFilters`
 * @param {{ query: string, onQueryChange: Function, placeholder: string }|null} [options.bound] - An externally held query
 * @param {Object|null} [options.url] - The URL narrowing holding the groups' values
 * @param {string[]|null} [options.views] - The views the page toggles between, the first the default
 * @returns {{ rows: Array, query: string, filtering: boolean, sort: Object, setSort: Function, hiddenColumns: Set, view: string, setView: Function }} The filtered, sorted rows and the search state
 */
export const useDetailSearch = ({
  rows,
  matches,
  placeholderKey,
  columns,
  prefsKey,
  filterGroups,
  bound = null,
  url = null,
  views = null,
}) => {
  const { t } = useTranslation();
  const [ownQuery, setOwnQuery] = useState('');
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
  const sorted = sortItems(filters.rows, prefs.sort, shown);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: bound ? bound.placeholder : t(placeholderKey),
    matched: filters.rows.length,
    total: rows.length,
    groups: [
      ...filters.groups,
      columnsGroup({ columns, hidden: prefs.hiddenColumns, setPrefs, t }),
    ],
    onClearFilters: filters.clear,
  });

  const setSort = (column, options) =>
    setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) }));

  return {
    rows: sorted,
    query,
    filtering: needle !== '' || filters.active,
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    view: prefs.view || '',
    setView: view => setPrefs(current => ({ ...current, view })),
  };
};
