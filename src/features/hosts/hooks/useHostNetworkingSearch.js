import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../../../components/common/SubTable';
import { filterGroupOf, narrowRows } from '../../../hooks/useClientFilters';
import { columnsGroup } from '../../../hooks/useDetailSearch';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readDetailPrefs, withWidth, writeDetailPrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

const NO_GROUPS = [];

const NO_SORT = [];

const NO_SPECS = [];

const labelOf = (table, label, t) => `${t(table.labelKey)} · ${label}`;

const ownGroup = (table, group, t) => ({
  ...group,
  key: `${table.key}.${group.key}`,
  label: labelOf(table, group.label, t),
});

const prefsKeyOf = (prefsPrefix, key) => `${prefsPrefix}_networking_${key}`;

const emptySets = specs => Object.fromEntries(specs.map(spec => [spec.key, new Set()]));

const readAllPrefs = (tables, prefsPrefix) =>
  Object.fromEntries(
    Object.values(tables).map(table => [
      table.key,
      readDetailPrefs(prefsKeyOf(prefsPrefix, table.key), table.columns),
    ])
  );

const emptyAllSets = tables =>
  Object.fromEntries(
    Object.values(tables).map(table => [table.key, emptySets(table.filterGroups || NO_SPECS)])
  );

const setTablePrefs = (setAll, key) => update =>
  setAll(current => ({ ...current, [key]: update(current[key]) }));

const drawnTable = ({ table, needle, ctx, prefs, sets, setPrefs, setSets, t }) => {
  const specs = table.filterGroups || NO_SPECS;
  const searched = needle ? table.rows.filter(row => table.matches(row, needle)) : table.rows;
  const narrowed = narrowRows(searched, specs, sets);
  const shown = table.columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const sort = prefs.sort.length > 0 ? prefs.sort : table.defaultSort;
  const rows = sortItems(narrowed, sort, shown, ctx);
  const filters = specs.map(spec =>
    filterGroupOf({
      spec,
      rows: searched,
      active: sets[spec.key],
      onToggle: next => setSets(current => ({ ...current, [spec.key]: next })),
      t,
    })
  );
  const groups = table.offered
    ? [
        ...filters,
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
    active: specs.some(spec => sets[spec.key].size > 0),
    clear: () => setSets(() => emptySets(specs)),
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
 * The one navbar search binding of the networking page over every table
 * it draws, the read tables and the management lists alike: the query
 * narrows every table at once, each table publishes one filter group per
 * enumerable column and its Columns group last, the one `columnsGroup`
 * of `useDetailSearch`, each group named by its table, and the counts
 * are the rows of them all. Every table keeps its own sort, hidden
 * columns and widths under `table_prefs_networking_` and its key, held
 * together as one object per page; a table the host does not offer
 * publishes no group; `resetSort` drops the sort a person chose, so the
 * table draws in its own order again, hyperweaver-ui's heading button.
 * Clear filters empties the groups of every table and keeps the query.
 *
 * @param {Object} options - The page's side
 * @param {Object} options.tables - The tables by key, each `{ key, labelKey, rows, columns, matches, filterGroups, defaultSort, offered }`
 * @param {Object} options.ctx - The context the tables' columns receive
 * @param {string} options.prefsPrefix - The prefix of the page's prefs keys
 * @returns {{ tables: Object, filtering: boolean }} Each table's rows and preferences by its key, and whether anything narrows
 */
export const useHostNetworkingSearch = ({ tables, ctx, prefsPrefix }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [prefs, setPrefs] = useState(() => readAllPrefs(tables, prefsPrefix));
  const [sets, setSets] = useState(() => emptyAllSets(tables));
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    Object.entries(prefs).forEach(([key, entry]) =>
      writeDetailPrefs(prefsKeyOf(prefsPrefix, key), entry)
    );
  }, [prefsPrefix, prefs]);

  const drawn = Object.fromEntries(
    Object.values(tables).map(table => [
      table.key,
      drawnTable({
        table,
        needle,
        ctx,
        prefs:
          prefs[table.key] || readDetailPrefs(prefsKeyOf(prefsPrefix, table.key), table.columns),
        sets: sets[table.key] || emptySets(table.filterGroups || NO_SPECS),
        setPrefs: setTablePrefs(setPrefs, table.key),
        setSets: setTablePrefs(setSets, table.key),
        t,
      }),
    ])
  );
  const list = Object.values(drawn);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('hosts.networking.search'),
    matched: list.reduce((sum, table) => sum + table.rows.length, 0),
    total: list.reduce((sum, table) => sum + table.total, 0),
    groups: list.flatMap(table => table.groups),
    onClearFilters: () => list.forEach(table => table.clear()),
  });

  return { tables: drawn, filtering: needle !== '' || list.some(table => table.active) };
};
