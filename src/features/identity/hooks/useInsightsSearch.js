import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readPrefs, toggleIn, writePrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

const matches = (row, needle) =>
  Object.values(row)
    .map(value => (value === null || value === undefined ? '' : String(value)))
    .join(' ')
    .toLowerCase()
    .includes(needle);

const columnsGroup = ({ table, hidden, setPrefs, t }) => ({
  key: `${table.key}.columns`,
  label: `${t(table.labelKey)} · ${t('pages.filter.columns')}`,
  entries: Object.fromEntries(table.columns.map(column => [column.key, null])),
  activeSet: new Set(table.columns.map(column => column.key).filter(key => !hidden.has(key))),
  activeClass: 'bg-secondary',
  columns: true,
  labelFor: key => t(table.columns.find(column => column.key === key).labelKey),
  onToggle: key =>
    setPrefs(current => ({
      ...current,
      hiddenColumns: {
        ...current.hiddenColumns,
        [table.key]: toggleIn(current.hiddenColumns[table.key], key),
      },
    })),
});

/**
 * Registers the Insights page's navbar search binding, a query over every
 * row of its tables and one Columns group per table, prefixed by the
 * table's title, and answers each table's rows left by the query in its
 * sort order, the sort with its setter and the hidden column keys; a table
 * with no saved sort draws its `defaultSort`. The sorts and the hidden
 * columns persist under `prefsKey`.
 *
 * @param {Object} options
 * @param {Array} options.tables - `{ key, labelKey, columns, defaultSort, filterGroups, defaultView }` per table
 * @param {Object} options.rowsByTable - The rows of each table by its key
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @returns {{ rows: Object, filtering: boolean, sort: Object, setSort: Function, hiddenColumns: Object }} The search state
 */
export const useInsightsSearch = ({ tables, rowsByTable, placeholderKey, prefsKey }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [prefs, setPrefs] = useState(() => readPrefs(prefsKey, tables));

  useEffect(() => {
    writePrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const needle = query.trim().toLowerCase();
  const rows = {};
  let matched = 0;
  let total = 0;
  const groups = [];
  tables.forEach(table => {
    const all = rowsByTable[table.key] || [];
    const hidden = prefs.hiddenColumns[table.key];
    const passing = needle ? all.filter(row => matches(row, needle)) : all;
    const stack = prefs.sort[table.key].length > 0 ? prefs.sort[table.key] : table.defaultSort;
    rows[table.key] = sortItems(
      passing,
      stack,
      table.columns.filter(column => !hidden.has(column.key))
    );
    matched += passing.length;
    total += all.length;
    groups.push(columnsGroup({ table, hidden, setPrefs, t }));
  });

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t(placeholderKey),
    matched,
    total,
    groups,
    onClearFilters: () => setQuery(''),
  });

  const setSort = (tableKey, column, options) =>
    setPrefs(current => ({
      ...current,
      sort: { ...current.sort, [tableKey]: nextSort(current.sort[tableKey], column, options) },
    }));

  return {
    rows,
    filtering: needle !== '',
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
  };
};
