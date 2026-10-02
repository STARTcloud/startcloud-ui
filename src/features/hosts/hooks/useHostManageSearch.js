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

const NO_PARAMS = [];

const labelOf = (table, label, t) => `${t(table.labelKey)} · ${label}`;

const ownGroup = (table, group, t) => ({
  ...group,
  key: `${table.key}.${group.key}`,
  label: labelOf(table, group.label, t),
});

/**
 * One panel group of the navbar for a request filter that picks one
 * value, hyperweaver-ui's zone, user and limit selects: a `select` group
 * whose pills are the values, no count on any, the chosen one active, a
 * click choosing it and a second click on it choosing none.
 *
 * @param {Object} options - The group
 * @param {string} options.key - The group's key
 * @param {string} options.label - The group's label
 * @param {Array<string>} options.values - The values offered
 * @param {string} options.value - The chosen value, empty for none
 * @param {Function} options.onChange - Called with the next value
 * @param {Function} [options.labelFor] - The label of one value, the value itself otherwise
 * @returns {Object} The panel group
 */
export const selectGroup = ({ key, label, values, value, onChange, labelFor = null }) => ({
  kind: 'select',
  key,
  label,
  entries: Object.fromEntries(values.map(entry => [String(entry), null])),
  activeSet: new Set(value === '' ? [] : [String(value)]),
  activeClass: 'bg-primary',
  labelFor: entry => (labelFor ? labelFor(entry) : entry),
  onToggle: entry => onChange(String(entry) === String(value) ? '' : entry),
});

/**
 * One panel group of the navbar for a request switch, hyperweaver-ui's
 * include-system and detailed toggles: a `toggle` group with one pill,
 * active while the switch is on, a click flipping it.
 *
 * @param {Object} options - The group
 * @param {string} options.key - The group's key
 * @param {string} options.label - The group's label
 * @param {string} options.pill - The pill's label
 * @param {boolean} options.on - Whether the switch is on
 * @param {Function} options.onChange - Called with the next state
 * @returns {Object} The panel group
 */
export const switchGroup = ({ key, label, pill, on, onChange }) => ({
  kind: 'toggle',
  key,
  label,
  entries: { on: null },
  activeSet: new Set(on ? ['on'] : []),
  activeClass: 'bg-info',
  labelFor: () => pill,
  onToggle: () => onChange(!on),
});

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
 * The request filters of the Manage page's tables as panel groups of
 * the navbar, hyperweaver-ui's selects and switches over each request:
 * the zone and the disabled services of the services, the zone on a
 * host that names `bhyve`, the user and the detail of the processes,
 * the system accounts and the limit of the users and the groups, the
 * limit of the roles, the authorizations and the profiles. A change
 * sends that table's request again; Clear filters puts every filter
 * back to what the page opened with.
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
 * One table of the Manage page narrowed by the page's query and by its
 * own filter groups, its preferences, the sort, the hidden columns and
 * the widths, kept as the one object under `table_prefs_manage_` and
 * the table's key; the table's request filters, `paramGroups`, publish
 * before its client-side groups; a table the host does not offer
 * publishes no group.
 *
 * @param {Object} options - The table, the needle, the context and the prefix
 * @returns {Object} The rows drawn, the counts, the groups and the preferences
 */
const useManageTable = ({ table, needle, ctx, prefsPrefix }) => {
  const { t } = useTranslation();
  const prefsKey = `${prefsPrefix}_manage_${table.key}`;
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
        ...(table.paramGroups || NO_PARAMS),
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
    clear: () => {
      filters.clear();
      (table.paramGroups || NO_PARAMS).forEach(group => group.onClear?.());
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
 * The one navbar search binding of the Manage page over its twenty-four
 * tables, the services, the processes, the users, the groups, the roles,
 * the RBAC authorizations, profiles and roles, the time peers, the
 * update history, the storage locations, the artifacts, the syslog
 * rules, the log files, the boot environments, the faults, the fault
 * manager modules, the databases, the repositories, the packages, the
 * installer files, the recipes, the templates and the provisioners: the query
 * narrows every table at once, in place of
 * the pattern box hyperweaver-ui debounced into each request, each
 * table publishes its request filters, one filter group per enumerable
 * column and its Columns group last, each group named by its table, and
 * the counts are the rows of all ten. Every table keeps its own sort,
 * hidden columns and widths under `table_prefs_manage_` and its key;
 * Clear filters empties the groups and the request filters of every
 * table and keeps the query.
 *
 * @param {Object} options - The page's side
 * @param {Object} options.tables - The twenty-four tables by key, each `{ key, labelKey, rows, columns, matches, filterGroups, paramGroups, defaultSort, offered }`
 * @param {Object} options.ctx - The context the tables' columns receive
 * @param {string} options.prefsPrefix - The prefix of the page's prefs keys
 * @returns {Object} The twenty-four tables' rows and preferences and `filtering`
 */
export const useHostManageSearch = ({ tables, ctx, prefsPrefix }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const services = useManageTable({ table: tables.services, needle, ctx, prefsPrefix });
  const processes = useManageTable({ table: tables.processes, needle, ctx, prefsPrefix });
  const users = useManageTable({ table: tables.users, needle, ctx, prefsPrefix });
  const groups = useManageTable({ table: tables.groups, needle, ctx, prefsPrefix });
  const roles = useManageTable({ table: tables.roles, needle, ctx, prefsPrefix });
  const authorizations = useManageTable({ table: tables.authorizations, needle, ctx, prefsPrefix });
  const profiles = useManageTable({ table: tables.profiles, needle, ctx, prefsPrefix });
  const rbacRoles = useManageTable({ table: tables.rbacRoles, needle, ctx, prefsPrefix });
  const peers = useManageTable({ table: tables.peers, needle, ctx, prefsPrefix });
  const history = useManageTable({ table: tables.history, needle, ctx, prefsPrefix });
  const storagePaths = useManageTable({ table: tables.storagePaths, needle, ctx, prefsPrefix });
  const artifacts = useManageTable({ table: tables.artifacts, needle, ctx, prefsPrefix });
  const syslogRules = useManageTable({ table: tables.syslogRules, needle, ctx, prefsPrefix });
  const logFiles = useManageTable({ table: tables.logFiles, needle, ctx, prefsPrefix });
  const bootEnvironments = useManageTable({
    table: tables.bootEnvironments,
    needle,
    ctx,
    prefsPrefix,
  });
  const faults = useManageTable({ table: tables.faults, needle, ctx, prefsPrefix });
  const faultModules = useManageTable({ table: tables.faultModules, needle, ctx, prefsPrefix });
  const databases = useManageTable({ table: tables.databases, needle, ctx, prefsPrefix });
  const repositories = useManageTable({ table: tables.repositories, needle, ctx, prefsPrefix });
  const packages = useManageTable({ table: tables.packages, needle, ctx, prefsPrefix });
  const installers = useManageTable({ table: tables.installers, needle, ctx, prefsPrefix });
  const recipes = useManageTable({ table: tables.recipes, needle, ctx, prefsPrefix });
  const templates = useManageTable({ table: tables.templates, needle, ctx, prefsPrefix });
  const provisioners = useManageTable({ table: tables.provisioners, needle, ctx, prefsPrefix });
  const drawn = [
    services,
    processes,
    users,
    groups,
    roles,
    authorizations,
    profiles,
    rbacRoles,
    peers,
    history,
    storagePaths,
    artifacts,
    syslogRules,
    logFiles,
    bootEnvironments,
    faults,
    faultModules,
    databases,
    repositories,
    packages,
    installers,
    recipes,
    templates,
    provisioners,
  ];

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('hosts.manage.search'),
    matched: drawn.reduce((sum, table) => sum + table.rows.length, 0),
    total: drawn.reduce((sum, table) => sum + table.total, 0),
    groups: drawn.flatMap(table => table.groups),
    onClearFilters: () => drawn.forEach(table => table.clear()),
  });

  return {
    services,
    processes,
    users,
    groups,
    roles,
    authorizations,
    profiles,
    rbacRoles,
    peers,
    history,
    storagePaths,
    artifacts,
    syslogRules,
    logFiles,
    bootEnvironments,
    faults,
    faultModules,
    databases,
    repositories,
    packages,
    installers,
    recipes,
    templates,
    provisioners,
    filtering: needle !== '' || drawn.some(table => table.active),
  };
};
