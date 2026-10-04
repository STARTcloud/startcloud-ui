import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../components/common/SubTable';
import { readDetailPrefs, withWidth, writeDetailPrefs } from '../utils/prefs';
import { nextSort, sortItems } from '../utils/sort';

import { columnsGroup, hiddenToggle, useClientFilters } from './useClientFilters';
import { useNavbarSearchBinding } from './useSearchBinding';

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
 * The navbar search binding of a paged list the server answers: the
 * page's query and request groups, the client-side groups, Per page and
 * Columns, the page's one action, and `matched` with no `total`.
 *
 * @param {Object} options
 * @param {string} options.query - The query the page holds
 * @param {Function} options.onQueryChange - Its setter
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.groups - The page's request groups
 * @param {Array} [options.clientGroups] - The client-side group specs of `useClientFilters`
 * @param {Object|null} [options.url] - The `useUrlNarrowing` result holding the client-side groups' values
 * @param {Function} options.onClearFilters - Empties every group, keeping the query
 * @param {{ key: string, labelKey: string, icon?: Function, onRun: Function }|null} options.action - The panel's action
 * @param {number|null} [options.matched] - The answer's `total`; the client-narrowed row count when absent
 * @param {Array} options.rows - The rows the list answered
 * @param {Array} options.columns - The table's columns
 * @param {Object} options.ctx - The context the table's columns receive
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @param {Array} [options.defaultSort] - The sort stack drawn while nothing is saved
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
  ctx,
  prefsKey,
  defaultSort = [],
}) => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, columns));
  const filters = useClientFilters({ specs: clientGroups, rows, bound: url });

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const shown = columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const stack = prefs.sort.length > 0 ? prefs.sort : defaultSort;
  const sorted = sortItems(filters.rows, stack, shown, ctx);

  useNavbarSearchBinding({
    query,
    onQueryChange,
    placeholder: t(placeholderKey),
    matched: matched === null ? filters.rows.length : matched,
    groups: [
      ...groups,
      ...filters.groups,
      perPageGroup({ size: prefs.size, setPrefs, t }),
      columnsGroup({
        columns: drawnColumns(columns, sorted, ctx),
        hidden: prefs.hiddenColumns,
        onToggle: hiddenToggle(setPrefs),
        t,
      }),
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
    rows: sorted,
    sort: stack,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth,
    size: prefs.size,
    setSize,
  };
};
