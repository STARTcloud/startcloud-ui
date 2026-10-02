import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../../../components/common/SubTable';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { columnsGroup } from '../../../hooks/useDetailSearch';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readDetailPrefs, withWidth, writeDetailPrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

const NO_GROUPS = [];

const NO_SORT = [];

const labelOf = (table, label, t) => `${t(table.labelKey)} · ${label}`;

const ownGroup = (table, group, t) => ({
  ...group,
  key: `${table.key}.${group.key}`,
  label: labelOf(table, group.label, t),
});

/**
 * One table of the storage page narrowed by the page's query and by its
 * own filter groups, its preferences, the sort, the hidden columns and
 * the widths, kept as the one object under `table_prefs_storage_` and
 * the table's key; a table the host does not offer publishes no group.
 * `resetSort` drops the sort a person chose, hyperweaver-ui's heading
 * button, so the table draws in its own order again.
 *
 * @param {Object} options - The table, the needle, the context and the prefix
 * @returns {Object} The rows drawn, the counts, the groups and the preferences
 */
const useStorageTable = ({ table, needle, ctx, prefsPrefix }) => {
  const { t } = useTranslation();
  const prefsKey = `${prefsPrefix}_storage_${table.key}`;
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, table.columns));

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const searched = needle ? table.rows.filter(row => table.matches(row, needle)) : table.rows;
  const filters = useClientFilters({ specs: table.filterGroups, rows: searched });
  const shown = table.columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const sort = prefs.sort.length > 0 ? prefs.sort : table.defaultSort;
  const rows = sortItems(filters.rows, sort, shown, ctx);
  const groups = table.offered
    ? [
        ...filters.groups,
        columnsGroup({
          columns: drawnColumns(table.columns, rows, ctx),
          hidden: prefs.hiddenColumns,
          setPrefs,
          t,
        }),
      ].map(group => ownGroup(table, group, t))
    : NO_GROUPS;

  return {
    rows,
    total: table.rows.length,
    groups,
    active: filters.active,
    clear: filters.clear,
    sort,
    setSort: (column, options) =>
      setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) })),
    resetSort: () => setPrefs(current => ({ ...current, sort: NO_SORT })),
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth: (column, pixels) =>
      setPrefs(current => ({ ...current, widths: withWidth(current.widths, column, pixels) })),
  };
};

/**
 * The one navbar search binding of the storage page over its five
 * tables, the pools, the datasets, the disks, the disk I/O and the pool
 * I/O, the sorting hyperweaver-ui's `useStorageSorting` kept per table
 * now each table's own sort stack: the query narrows every table at
 * once, each table publishes one filter group per enumerable column and
 * its Columns group last, each group named by its table, and the counts
 * are the rows of all five. Every table keeps its own sort, hidden
 * columns and widths under `table_prefs_storage_` and its key; Clear
 * filters empties the groups of every table and keeps the query.
 *
 * @param {Object} options - The page's side
 * @param {Object} options.tables - `pools`, `datasets`, `disks`, `diskIo` and `poolIo`, each `{ key, labelKey, rows, columns, matches, filterGroups, defaultSort, offered }`
 * @param {Object} options.ctx - The context the tables' columns receive
 * @param {string} options.prefsPrefix - The prefix of the page's prefs keys
 * @returns {Object} The five tables' rows and preferences and `filtering`
 */
export const useHostStorageSearch = ({ tables, ctx, prefsPrefix }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const pools = useStorageTable({ table: tables.pools, needle, ctx, prefsPrefix });
  const datasets = useStorageTable({ table: tables.datasets, needle, ctx, prefsPrefix });
  const disks = useStorageTable({ table: tables.disks, needle, ctx, prefsPrefix });
  const diskIo = useStorageTable({ table: tables.diskIo, needle, ctx, prefsPrefix });
  const poolIo = useStorageTable({ table: tables.poolIo, needle, ctx, prefsPrefix });
  const drawn = [pools, datasets, disks, diskIo, poolIo];

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('hosts.storage.search'),
    matched: drawn.reduce((sum, table) => sum + table.rows.length, 0),
    total: drawn.reduce((sum, table) => sum + table.total, 0),
    groups: drawn.flatMap(table => table.groups),
    onClearFilters: () => drawn.forEach(table => table.clear()),
  });

  return {
    pools,
    datasets,
    disks,
    diskIo,
    poolIo,
    filtering: needle !== '' || drawn.some(table => table.active),
  };
};
