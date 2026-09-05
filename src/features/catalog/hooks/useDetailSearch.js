import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readDetailPrefs, toggleIn, writeDetailPrefs } from '../utils/prefs';
import { nextSort, sortItems } from '../utils/sort';

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
 * Columns group that shows or hides the table's columns, and returns the
 * rows the query leaves in the active sort order, the query itself, whether
 * a query is active, the sort with its setter and the hidden column keys.
 * A sort on a hidden column is dropped until the column returns; the sort
 * is a stack, a Shift-click on a header adding to it. The sort
 * and the hidden columns persist under `prefsKey`. A page that keeps the
 * query elsewhere (the URL) hands it in as `bound`, with its own
 * placeholder, and the hook publishes that instead of its own state.
 *
 * @param {Object} options
 * @param {Array} options.rows - Every row of the table
 * @param {Function} options.matches - `matches(row, needle)` for one lower-cased needle
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.columns - The table's columns, each with `key`, `labelKey` and optionally `sortValue` and `defaultHidden`
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @param {{ query: string, onQueryChange: Function, placeholder: string }|null} [options.bound] - An externally held query
 * @returns {{ rows: Array, query: string, filtering: boolean, sort: Object, setSort: Function, hiddenColumns: Set }} The filtered, sorted rows and the search state
 */
export const useDetailSearch = ({
  rows,
  matches,
  placeholderKey,
  columns,
  prefsKey,
  bound = null,
}) => {
  const { t } = useTranslation();
  const [ownQuery, setOwnQuery] = useState('');
  const query = bound ? bound.query : ownQuery;
  const setQuery = bound ? bound.onQueryChange : setOwnQuery;
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, columns));

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const needle = query.trim().toLowerCase();
  const filtered = needle ? rows.filter(row => matches(row, needle)) : rows;
  const shown = columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const sorted = sortItems(filtered, prefs.sort, shown);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: bound ? bound.placeholder : t(placeholderKey),
    matched: filtered.length,
    total: rows.length,
    groups: [columnsGroup({ columns, hidden: prefs.hiddenColumns, setPrefs, t })],
    onClearFilters: () => setQuery(''),
  });

  const setSort = (column, options) =>
    setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) }));

  return {
    rows: sorted,
    query,
    filtering: needle !== '',
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
  };
};
