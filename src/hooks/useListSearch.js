import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readDetailPrefs, toggleIn, withWidth, writeDetailPrefs } from '../utils/prefs';
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

const PAGE_SIZES = [25, 50, 100, 250];

const perPageGroup = ({ size, setPrefs, t }) => ({
  key: 'size',
  label: t('pages.filter.perPage'),
  entries: Object.fromEntries(PAGE_SIZES.map(value => [String(value), null])),
  activeSet: new Set([String(size)]),
  activeClass: 'bg-secondary',
  columns: true,
  labelFor: value => value,
  onToggle: value => setPrefs(current => ({ ...current, size: Number(value) })),
});

/**
 * Registers the navbar binding of a page whose rows are a paged list the
 * server answers: the query and its setter the page holds, the page's
 * filter groups (`toggle`, `select` or `date-range`, each sent as the
 * list's parameters by the page), then one group per enumerable column
 * the list names no parameter for (`clientGroups`), narrowing the rows
 * the list answered client-side, followed by the Per page group (25, 50,
 * 100, 250; not a filter) and the Columns group, the page's one action
 * drawn at the panel's foot, and `matched` published with no `total`,
 * since a count over the page held would lie: the answer's `total` where
 * the server alone narrows, or, when the page hands none in, the count
 * of the rows the client-side groups leave, the rows on screen. Answers
 * the page's rows in the active sort order, the sort with its setter, the
 * hidden column keys, the column widths with their setter and the page
 * size with its setter, persisted under `prefsKey`.
 *
 * @param {Object} options
 * @param {string} options.query - The query the page holds
 * @param {Function} options.onQueryChange - Its setter
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.groups - The page's filter groups
 * @param {Array} [options.clientGroups] - The client-side group specs of `useClientFilters`
 * @param {Object|null} [options.url] - The URL narrowing holding the client-side groups' values
 * @param {Function} options.onClearFilters - Empties every group, keeping the query
 * @param {{ key: string, labelKey: string, icon?: Function, onRun: Function }|null} options.action - The panel's action
 * @param {number|null} [options.matched] - The paged answer's `total`; the client-narrowed row count when absent
 * @param {Array} options.rows - The rows the list answered
 * @param {Array} options.columns - The table's columns
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @returns {{ rows: Array, sort: Array, setSort: Function, hiddenColumns: Set, widths: Object, setColumnWidth: Function, size: number, setSize: Function }} The search state
 */
export const useListSearch = ({
  query,
  onQueryChange,
  placeholderKey,
  groups,
  clientGroups,
  url = null,
  onClearFilters,
  action,
  matched = null,
  rows,
  columns,
  prefsKey,
}) => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, columns));
  const filters = useClientFilters({ specs: clientGroups, rows, bound: url });

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const shown = columns.filter(column => !prefs.hiddenColumns.has(column.key));

  useNavbarSearchBinding({
    query,
    onQueryChange,
    placeholder: t(placeholderKey),
    matched: matched === null ? filters.rows.length : matched,
    groups: [
      ...groups,
      ...filters.groups,
      perPageGroup({ size: prefs.size, setPrefs, t }),
      columnsGroup({ columns, hidden: prefs.hiddenColumns, setPrefs, t }),
    ],
    onClearFilters: () => {
      onClearFilters();
      filters.clear();
    },
    action,
  });

  const setSort = (column, options) =>
    setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) }));

  const setColumnWidth = (column, pixels) =>
    setPrefs(current => ({ ...current, widths: withWidth(current.widths, column, pixels) }));

  const setSize = size => setPrefs(current => ({ ...current, size }));

  return {
    rows: sortItems(filters.rows, prefs.sort, shown),
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth,
    size: prefs.size,
    setSize,
  };
};
