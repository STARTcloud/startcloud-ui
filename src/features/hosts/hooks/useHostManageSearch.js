import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../../../components/common/SubTable';
import { useArrival, useArrivalQuery } from '../../../hooks/useArrival';
import {
  columnsGroup,
  filterGroupOf,
  hiddenToggle,
  narrowRows,
  selectGroup,
  switchGroup,
} from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { readDetailPrefs, withWidth, writeDetailPrefs } from '../../../utils/prefs';
import { nextSort, sortItems } from '../../../utils/sort';

const NO_GROUPS = [];

const NO_SORT = [];

const NO_SPECS = [];

const ACCOUNT_LIMITS = [25, 50, 100, 200];

const ROLE_LIMITS = [25, 50, 100];

const RBAC_LIMITS = [50, 100, 200, 500];

const RBAC_LIMIT_KEYS = {
  50: 'hostTools.DiscoverySection.option50Results',
  100: 'hostTools.DiscoverySection.option100Results',
  200: 'hostTools.DiscoverySection.option200Results',
  500: 'hostTools.DiscoverySection.option500Results',
};

const withClear = (group, onClear) => ({ ...group, onClear });

const limitGroup = ({ table, values, labelKey, labelFor, params, setParam, resetParams, t }) =>
  withClear(
    selectGroup({
      key: 'limit',
      label: t(labelKey),
      values,
      value: params[table].limit,
      onChange: value => setParam(table, 'limit', value === '' ? 0 : Number(value)),
      labelFor,
    }),
    () => resetParams(table)
  );

const systemGroup = ({ table, labelKey, pillKey, params, setParam, resetParams, t }) =>
  withClear(
    switchGroup({
      key: 'system',
      label: t(labelKey),
      pill: t(pillKey),
      on: params[table].includeSystem,
      onChange: on => setParam(table, 'includeSystem', on),
    }),
    () => resetParams(table)
  );

/**
 * The request filters of the services, processes, users, groups, roles,
 * authorizations and profiles tables as panel groups, each clearing its
 * table's filters.
 *
 * @param {Object} options - The filters and the vocabularies
 * @param {Object} options.params - The filters of `useHostManageData`
 * @param {Function} options.setParam - Its writer
 * @param {Function} options.resetParams - Its reset of one table
 * @param {Array<string>} options.zones - The names of the host's machines
 * @param {Array<string>} options.users - The users the processes name
 * @param {boolean} options.bhyve - Whether the host names `bhyve`
 * @param {Function} options.t - The translator
 * @returns {Object} The groups by table key
 */
export const manageParamGroups = ({ params, setParam, resetParams, zones, users, bhyve, t }) => ({
  services: [
    withClear(
      selectGroup({
        key: 'zone',
        label: t('host.serviceManagement.filterZone'),
        values: zones,
        value: params.services.zone,
        onChange: value => setParam('services', 'zone', value),
      }),
      () => resetParams('services')
    ),
    withClear(
      switchGroup({
        key: 'all',
        label: t('host.serviceManagement.showDisabled'),
        pill: t('host.serviceManagement.includeAll'),
        on: params.services.all,
        onChange: on => setParam('services', 'all', on),
      }),
      () => resetParams('services')
    ),
  ],
  processes: [
    ...(bhyve
      ? [
          withClear(
            selectGroup({
              key: 'zone',
              label: t('host.processManagement.filterByZone'),
              values: ['global', ...zones],
              value: params.processes.zone,
              onChange: value => setParam('processes', 'zone', value),
            }),
            () => resetParams('processes')
          ),
        ]
      : []),
    withClear(
      selectGroup({
        key: 'user',
        label: t('host.processManagement.filterByUser'),
        values: users,
        value: params.processes.user,
        onChange: value => setParam('processes', 'user', value),
      }),
      () => resetParams('processes')
    ),
    withClear(
      switchGroup({
        key: 'detailed',
        label: t('host.processManagement.detailedView'),
        pill: t('host.processManagement.showCpuMemory'),
        on: params.processes.detailed,
        onChange: on => setParam('processes', 'detailed', on),
      }),
      () => resetParams('processes')
    ),
  ],
  users: [
    systemGroup({
      table: 'users',
      labelKey: 'host.userSection.includeSystemUsers',
      pillKey: 'host.userSection.showAll',
      params,
      setParam,
      resetParams,
      t,
    }),
    limitGroup({
      table: 'users',
      values: ACCOUNT_LIMITS,
      labelKey: 'host.userSection.limitResults',
      labelFor: value => t('host.userSection.usersCount', { count: Number(value) }),
      params,
      setParam,
      resetParams,
      t,
    }),
  ],
  groups: [
    systemGroup({
      table: 'groups',
      labelKey: 'host.groupSection.includeSystemGroups',
      pillKey: 'host.groupSection.showAll',
      params,
      setParam,
      resetParams,
      t,
    }),
    limitGroup({
      table: 'groups',
      values: ACCOUNT_LIMITS,
      labelKey: 'host.groupSection.limitResults',
      labelFor: value => t('host.groupSection.groupsOption', { count: Number(value) }),
      params,
      setParam,
      resetParams,
      t,
    }),
  ],
  roles: [
    limitGroup({
      table: 'roles',
      values: ROLE_LIMITS,
      labelKey: 'host.roleSection.limitResults',
      labelFor: value => t('host.roleSection.rolesOption', { count: Number(value) }),
      params,
      setParam,
      resetParams,
      t,
    }),
  ],
  authorizations: [
    limitGroup({
      table: 'authorizations',
      values: RBAC_LIMITS,
      labelKey: 'hostTools.DiscoverySection.limitResultsLabel',
      labelFor: value => t(RBAC_LIMIT_KEYS[value]),
      params,
      setParam,
      resetParams,
      t,
    }),
  ],
  profiles: [
    limitGroup({
      table: 'profiles',
      values: RBAC_LIMITS,
      labelKey: 'hostTools.DiscoverySection.limitResultsLabel',
      labelFor: value => t(RBAC_LIMIT_KEYS[value]),
      params,
      setParam,
      resetParams,
      t,
    }),
  ],
});

/**
 * One table a page hands `useHostManageSearch`.
 *
 * @param {Object} spec - `{ key, labelKey, rows, columns, matches, filterGroups?, paramGroups?, sort?, defaultSort?, offered }`
 * @returns {Object} The table, its default sort ascending on `sort` unless `defaultSort` is given
 */
export const tableOf = ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups = NO_SPECS,
  paramGroups = NO_SPECS,
  sort = '',
  defaultSort = null,
  offered,
}) => ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups,
  paramGroups,
  defaultSort: defaultSort || [{ column: sort, direction: 'asc' }],
  offered,
});

/**
 * The sorted names of the host's machines.
 *
 * @param {Array<Object>} machines - The host's machine rows
 * @returns {Array<string>} The names
 */
export const zonesOf = machines =>
  machines
    .map(machine => machine.name)
    .filter(Boolean)
    .sort();

const labelOf = (table, label, t) => `${t(table.labelKey)} · ${label}`;

const ownGroup = (table, group, t) => ({
  ...group,
  key: `${table.key}.${group.key}`,
  label: labelOf(table, group.label, t),
});

const prefsKeyOf = (prefsPrefix, section, key) => `${prefsPrefix}_${section}_${key}`;

const emptySets = specs => Object.fromEntries(specs.map(spec => [spec.key, new Set()]));

const readAllPrefs = (tables, prefsPrefix, section) =>
  Object.fromEntries(
    Object.values(tables).map(table => [
      table.key,
      readDetailPrefs(prefsKeyOf(prefsPrefix, section, table.key), table.columns),
    ])
  );

const emptyAllSets = tables =>
  Object.fromEntries(
    Object.values(tables).map(table => [table.key, emptySets(table.filterGroups)])
  );

const setTablePrefs = (setAll, key) => update =>
  setAll(current => ({ ...current, [key]: update(current[key]) }));

const drawnTable = ({ table, needle, ctx, prefs, sets, setPrefs, setSets, rowRef, t }) => {
  const specs = table.filterGroups;
  const params = table.paramGroups;
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
        ...params,
        ...filters,
        columnsGroup({
          columns: drawnColumns(table.columns, rows, ctx),
          hidden: prefs.hiddenColumns,
          onToggle: hiddenToggle(setPrefs),
          t,
        }),
      ].map(group => ownGroup(table, group, t))
    : NO_GROUPS;

  return {
    rows,
    rowRef,
    total: table.rows.length,
    groups,
    active: specs.some(spec => sets[spec.key].size > 0),
    clear: () => {
      setSets(() => emptySets(specs));
      params.forEach(group => group.onClear?.());
    },
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
 * The navbar search binding of a host's page over its tables: one query
 * over them all, first the one the page arrived with, each offered
 * table's request, filter and Columns groups, each table's sort, hidden
 * columns and widths kept under `<prefsPrefix>_<section>_<key>`, and the
 * `rowRef` that brings the row the URL's hash names into view.
 *
 * @param {Object} options - The page's side
 * @param {string} options.section - The section's key, the infix of the prefs keys
 * @param {Object} options.tables - The tables by key, each from `tableOf`
 * @param {Object} options.ctx - The context the tables' columns receive
 * @param {string} options.prefsPrefix - The prefix of the page's prefs keys
 * @param {string} options.placeholderKey - The key of the search box's placeholder
 * @returns {{ tables: Object, filtering: boolean }} Each table's rows, row ref, sort, hidden columns and widths by its `key`, and whether a query or a filter narrows
 */
export const useHostManageSearch = ({ section, tables, ctx, prefsPrefix, placeholderKey }) => {
  const { t } = useTranslation();
  const arrivedQuery = useArrivalQuery();
  const arrival = useArrival(Object.values(tables).map(table => table.rows));
  const [query, setQuery] = useState(arrivedQuery);
  const [prefs, setPrefs] = useState(() => readAllPrefs(tables, prefsPrefix, section));
  const [sets, setSets] = useState(() => emptyAllSets(tables));
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    Object.entries(prefs).forEach(([key, entry]) =>
      writeDetailPrefs(prefsKeyOf(prefsPrefix, section, key), entry)
    );
  }, [prefsPrefix, section, prefs]);

  const drawn = Object.fromEntries(
    Object.values(tables).map(table => [
      table.key,
      drawnTable({
        table,
        needle,
        ctx,
        prefs:
          prefs[table.key] ||
          readDetailPrefs(prefsKeyOf(prefsPrefix, section, table.key), table.columns),
        sets: sets[table.key] || emptySets(table.filterGroups),
        setPrefs: setTablePrefs(setPrefs, table.key),
        setSets: setTablePrefs(setSets, table.key),
        rowRef: arrival.ref,
        t,
      }),
    ])
  );
  const list = Object.values(drawn);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t(placeholderKey),
    matched: list.reduce((sum, table) => sum + table.rows.length, 0),
    total: list.reduce((sum, table) => sum + table.total, 0),
    groups: list.flatMap(table => table.groups),
    onClearFilters: () => list.forEach(table => table.clear()),
  });

  return { tables: drawn, filtering: needle !== '' || list.some(table => table.active) };
};
