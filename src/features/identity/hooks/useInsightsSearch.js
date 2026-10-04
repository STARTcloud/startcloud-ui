import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../../../components/common/SubTable';
import { columnsGroup, filterGroupOf, narrowRows } from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readPrefs, toggleIn, withWidth, writePrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

const matches = (row, needle) =>
  Object.values(row)
    .map(value => (value === null || value === undefined ? '' : String(value)))
    .join(' ')
    .toLowerCase()
    .includes(needle);

const tableColumnsGroup = ({ table, columns, hidden, setPrefs, t }) =>
  columnsGroup({
    key: `${table.key}.columns`,
    label: `${t(table.labelKey)} · ${t('pages.filter.columns')}`,
    columns,
    hidden,
    onToggle: key =>
      setPrefs(current => ({
        ...current,
        hiddenColumns: {
          ...current.hiddenColumns,
          [table.key]: toggleIn(current.hiddenColumns[table.key], key),
        },
      })),
    t,
  });

const tableGroups = ({ table, rows, filters, setPrefs, t }) =>
  table.filterGroups.map(spec =>
    filterGroupOf({
      spec,
      rows,
      active: filters[spec.key],
      onToggle: next =>
        setPrefs(current => ({
          ...current,
          filters: {
            ...current.filters,
            [table.key]: { ...current.filters[table.key], [spec.key]: next },
          },
        })),
      t,
      label: `${t(table.labelKey)} · ${t(spec.labelKey)}`,
    })
  );

const anyActive = (tables, filters) =>
  tables.some(table => table.filterGroups.some(spec => filters[table.key][spec.key].size > 0));

const clearedFilters = (tables, filters) =>
  Object.fromEntries(
    tables.map(table => [
      table.key,
      Object.fromEntries(Object.keys(filters[table.key]).map(key => [key, new Set()])),
    ])
  );

/**
 * The Insights page's navbar search binding over its tables: one query,
 * each table's filter groups and Columns group, each table's sort, hidden
 * columns and widths kept under `prefsKey`.
 *
 * @param {Object} options
 * @param {Array} options.tables - `{ key, labelKey, columns, defaultSort, filterGroups, defaultView }` per table
 * @param {Object} options.rowsByTable - The rows of each table by its key
 * @param {Object} options.ctx - The context every table's columns receive
 * @param {string} options.placeholderKey - Translation key of the search placeholder
 * @param {string} options.prefsKey - The localStorage key of this page's prefs
 * @returns {{ rows: Object, filtering: boolean, sort: Object, setSort: Function, hiddenColumns: Object, widths: Object, setColumnWidth: Function }} The search state
 */
export const useInsightsSearch = ({ tables, rowsByTable, ctx, placeholderKey, prefsKey }) => {
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
    const filters = prefs.filters[table.key];
    const searched = needle ? all.filter(row => matches(row, needle)) : all;
    const passing = narrowRows(searched, table.filterGroups, filters);
    const stack = prefs.sort[table.key].length > 0 ? prefs.sort[table.key] : table.defaultSort;
    rows[table.key] = sortItems(
      passing,
      stack,
      table.columns.filter(column => !hidden.has(column.key)),
      ctx
    );
    matched += passing.length;
    total += all.length;
    groups.push(...tableGroups({ table, rows: searched, filters, setPrefs, t }));
    groups.push(
      tableColumnsGroup({
        table,
        columns: drawnColumns(table.columns, rows[table.key], ctx),
        hidden,
        setPrefs,
        t,
      })
    );
  });

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t(placeholderKey),
    matched,
    total,
    groups,
    onClearFilters: () =>
      setPrefs(current => ({ ...current, filters: clearedFilters(tables, current.filters) })),
  });

  const setSort = (tableKey, column, options) =>
    setPrefs(current => ({
      ...current,
      sort: { ...current.sort, [tableKey]: nextSort(current.sort[tableKey], column, options) },
    }));

  const setColumnWidth = (tableKey, column, pixels) =>
    setPrefs(current => ({
      ...current,
      widths: {
        ...current.widths,
        [tableKey]: withWidth(current.widths[tableKey], column, pixels),
      },
    }));

  return {
    rows,
    filtering: needle !== '' || anyActive(tables, prefs.filters),
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth,
  };
};
