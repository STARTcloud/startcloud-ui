import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClientFilters } from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readDetailPrefs, toggleIn, writeDetailPrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

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
 * Registers the navbar binding of an admin page whose rows are a paged
 * list the issuer answers: the query and its setter the page holds, the
 * page's filter groups (`toggle`, `select` or `date-range`, each sent as
 * the list's parameters by the page), then one group per enumerable
 * column the list names no parameter for (`clientGroups`), narrowing the
 * rows the list answered client-side, followed by the Columns group, the
 * page's one action drawn at the panel's foot, and the answer's `total`
 * published as `matched` with no `total`, since the server alone narrows
 * and a count over the page held would lie. Answers the page's rows in
 * the active sort order, the sort with its setter and the hidden column
 * keys, persisted under `prefsKey`.
 *
 * @param {Object} options
 * @param {string} options.query - The query the page holds
 * @param {Function} options.onQueryChange - Its setter
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {Array} options.groups - The page's filter groups
 * @param {Array} [options.clientGroups] - The client-side group specs of `useClientFilters`
 * @param {Object|null} [options.url] - The URL narrowing holding the client-side groups' values
 * @param {Function} options.onClearFilters - Empties every group, keeping the query
 * @param {{ key: string, labelKey: string, icon?: Function, onRun: Function }} options.action - The panel's action
 * @param {number} options.matched - The paged answer's `total`
 * @param {Array} options.rows - The rows the list answered
 * @param {Array} options.columns - The table's columns
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @returns {{ rows: Array, sort: Array, setSort: Function, hiddenColumns: Set }} The search state
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
  matched,
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
    matched,
    groups: [
      ...groups,
      ...filters.groups,
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

  return {
    rows: sortItems(filters.rows, prefs.sort, shown),
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
  };
};
