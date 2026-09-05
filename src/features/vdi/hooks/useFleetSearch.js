import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { sortStackOf, toggleIn } from '../../catalog/utils/prefs';
import { nextSort, sortItems } from '../../catalog/utils/sort';
import { CACHE_KEYS, cacheKey } from '../utils/cacheLevel';
import {
  STATUS_KEYS,
  vmHasNoSession,
  vmIsDecommissioned,
  vmIsStandby,
  vmStaleInfo,
  vmStatus,
} from '../utils/vmStatus';

const TRISTATE = ['status', 'pool'];
const SETS = ['session', 'cache', 'drive', 'pub'];
const SESSION_KEYS = ['active', 'idle', 'no_session'];
const PUB_KEYS = ['current', 'stale'];

const parse = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || {};
  } catch {
    return {};
  }
};

const setOf = values => new Set(Array.isArray(values) ? values : []);

const defaultHidden = columns =>
  columns.filter(column => column.defaultHidden).map(column => column.key);

const emptyFilters = () => ({
  status: { include: new Set(), exclude: new Set() },
  pool: { include: new Set(), exclude: new Set() },
  session: new Set(),
  cache: new Set(),
  drive: new Set(),
  pub: new Set(),
});

const defaultFilters = () => {
  const filters = emptyFilters();
  filters.status.exclude.add('decommissioned');
  return filters;
};

const filtersOf = saved => {
  if (!saved) {
    return defaultFilters();
  }
  const filters = emptyFilters();
  TRISTATE.forEach(dimension => {
    filters[dimension] = {
      include: setOf(saved[dimension]?.include),
      exclude: setOf(saved[dimension]?.exclude),
    };
  });
  SETS.forEach(dimension => {
    filters[dimension] = setOf(saved[dimension]);
  });
  return filters;
};

const readPrefs = (key, columns) => {
  const saved = parse(key);
  return {
    filters: filtersOf(saved.filters),
    sort: sortStackOf(saved.sort),
    hiddenColumns: setOf(saved.hiddenColumns ?? defaultHidden(columns)),
    poolsCollapsed: Boolean(saved.poolsCollapsed),
  };
};

const writePrefs = (key, { filters, sort, hiddenColumns, poolsCollapsed }) => {
  const plain = {};
  TRISTATE.forEach(dimension => {
    plain[dimension] = {
      include: [...filters[dimension].include],
      exclude: [...filters[dimension].exclude],
    };
  });
  SETS.forEach(dimension => {
    plain[dimension] = [...filters[dimension]];
  });
  localStorage.setItem(
    key,
    JSON.stringify({ filters: plain, sort, hiddenColumns: [...hiddenColumns], poolsCollapsed })
  );
};

const cycle = (sets, value) => {
  const include = new Set(sets.include);
  const exclude = new Set(sets.exclude);
  if (include.has(value)) {
    include.delete(value);
    exclude.add(value);
  } else if (exclude.has(value)) {
    exclude.delete(value);
  } else {
    include.add(value);
  }
  return { include, exclude };
};

const statusMatches = (vm, value, now) => {
  if (value === 'no_user') {
    return vmHasNoSession(vm);
  }
  if (value === 'standby') {
    return vmIsStandby(vm);
  }
  if (value === 'decommissioned') {
    return vmIsDecommissioned(vm);
  }
  const status = vmStatus(vm, now);
  if (value === 'stale') {
    return status === 'stale' || vmStaleInfo(vm, now).score > 0;
  }
  return status === value;
};

const pubOf = vm => {
  if (vm.uds?.stale_image) {
    return 'stale';
  }
  return vm.uds?.publication_id === null || vm.uds?.publication_id === undefined ? '' : 'current';
};

const valuesOf = {
  pool: vm => [vm.uds?.pool_name || ''],
  session: vm => [vm.user?.session_state || 'no_session'],
  cache: vm => [cacheKey(vm.uds)],
  drive: vm => (vm.drives || []).map(drive => drive.letter).filter(Boolean),
  pub: vm => [pubOf(vm)],
};

const matchesAny = (vm, dimension, values, now) => {
  if (dimension === 'status') {
    return [...values].some(value => statusMatches(vm, value, now));
  }
  const own = valuesOf[dimension](vm);
  return own.some(value => values.has(value));
};

const passesTristate = (vm, dimension, sets, now) =>
  (sets.include.size === 0 || matchesAny(vm, dimension, sets.include, now)) &&
  (sets.exclude.size === 0 || !matchesAny(vm, dimension, sets.exclude, now));

const passesSet = (vm, dimension, set, now) =>
  set.size === 0 || matchesAny(vm, dimension, set, now);

const passesFilters = (vm, filters, now) =>
  TRISTATE.every(dimension => passesTristate(vm, dimension, filters[dimension], now)) &&
  SETS.every(dimension => passesSet(vm, dimension, filters[dimension], now));

const searchFields = vm => [
  vm.hostname,
  vm.user?.username,
  vm.user?.display_name,
  vm.user?.first_name,
  vm.user?.last_name,
  ...(vm.drives || []).map(drive => drive.unc_path),
  vm.uds?.pool_name,
  vm.ip_address,
  vm.mac_address,
  vm.instance_id,
  vm.uds?.uds_username,
];

const matchesQuery = (vm, needle) =>
  searchFields(vm).some(value =>
    String(value || '')
      .toLowerCase()
      .includes(needle)
  );

const byHostname = (a, b) => a.hostname.localeCompare(b.hostname);

const countValues = (vms, now) => {
  const counts = {};
  const add = key => {
    counts[key] = (counts[key] || 0) + 1;
  };
  vms.forEach(vm => {
    const status = vmStatus(vm, now);
    add(`status:${status}`);
    if (status === 'decommissioned') {
      return;
    }
    if (vmIsStandby(vm)) {
      add('status:standby');
    }
    if (vmHasNoSession(vm)) {
      add('status:no_user');
    }
    SETS.concat('pool').forEach(dimension => {
      valuesOf[dimension](vm)
        .filter(Boolean)
        .forEach(value => add(`${dimension}:${value}`));
    });
  });
  return counts;
};

const entriesOf = (counts, dimension, keys) =>
  Object.fromEntries(keys.map(key => [key, counts[`${dimension}:${key}`] || 0]));

const keysIn = (counts, dimension) =>
  Object.keys(counts)
    .filter(key => key.startsWith(`${dimension}:`))
    .map(key => key.slice(dimension.length + 1))
    .sort();

const tristateGroup = ({ dimension, labelKey, keys, counts, filters, setPrefs, labelFor, t }) => ({
  key: dimension,
  label: t(labelKey),
  entries: entriesOf(counts, dimension, keys),
  activeSet: filters[dimension].include,
  excludeSet: filters[dimension].exclude,
  tristate: true,
  activeClass: 'bg-success',
  labelFor,
  onToggle: value =>
    setPrefs(current => ({
      ...current,
      filters: { ...current.filters, [dimension]: cycle(current.filters[dimension], value) },
    })),
});

const setGroup = ({ dimension, labelKey, keys, counts, filters, setPrefs, labelFor, t }) => ({
  key: dimension,
  label: t(labelKey),
  entries: entriesOf(counts, dimension, keys),
  activeSet: filters[dimension],
  activeClass: 'bg-primary',
  labelFor,
  onToggle: value =>
    setPrefs(current => ({
      ...current,
      filters: { ...current.filters, [dimension]: toggleIn(current.filters[dimension], value) },
    })),
});

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

const buildGroups = ({ vms, counts, filters, hidden, columns, setPrefs, t }) => {
  const shared = { counts, filters, setPrefs, t };
  const pools = keysIn(counts, 'pool');
  const drives = keysIn(counts, 'drive');
  const cacheData = vms.some(vm => cacheKey(vm.uds) !== '');
  const groups = [
    tristateGroup({
      ...shared,
      dimension: 'status',
      labelKey: 'vdi.filter.status',
      keys: STATUS_KEYS,
      labelFor: value => t(`vdi.status.${value}`),
    }),
  ];
  if (pools.length > 0) {
    groups.push(
      tristateGroup({ ...shared, dimension: 'pool', labelKey: 'vdi.filter.pool', keys: pools })
    );
  }
  groups.push(
    setGroup({
      ...shared,
      dimension: 'session',
      labelKey: 'vdi.filter.session',
      keys: SESSION_KEYS,
      labelFor: value => t(`vdi.session.${value}`),
    })
  );
  if (cacheData) {
    groups.push(
      setGroup({
        ...shared,
        dimension: 'cache',
        labelKey: 'vdi.filter.cache',
        keys: CACHE_KEYS,
        labelFor: value => t(`vdi.cache.${value}`),
      })
    );
  }
  if (drives.length > 0) {
    groups.push(
      setGroup({
        ...shared,
        dimension: 'drive',
        labelKey: 'vdi.filter.drives',
        keys: drives,
        labelFor: value => `${value}:`,
      })
    );
  }
  if (pools.length > 0) {
    groups.push(
      setGroup({
        ...shared,
        dimension: 'pub',
        labelKey: 'vdi.filter.publication',
        keys: PUB_KEYS,
        labelFor: value => t(`vdi.publication.${value}`),
      })
    );
  }
  groups.push(columnsGroup({ columns, hidden, setPrefs, t }));
  return groups;
};

const filtering = (needle, filters) =>
  needle !== '' ||
  TRISTATE.some(
    dimension => filters[dimension].include.size > 0 || filters[dimension].exclude.size > 0
  ) ||
  SETS.some(dimension => filters[dimension].size > 0);

/**
 * The fleet page's navbar binding and its filtered, sorted rows: the
 * query over hostname, user names, UNC paths, pool, IP, MAC, instance id
 * and UDS user; the groups Status and Pool (tristate, a pill cycling
 * neutral → include → exclude), Session, Cache, Drives and Publication,
 * then Columns; the sort stack over the given columns with hostname as
 * the tiebreak; every choice and the pool fold persisted under `prefsKey`.
 *
 * @param {Object} options - The page's data
 * @param {Array<Object>} options.vms - Every vm object
 * @param {number} options.now - The reference epoch in milliseconds
 * @param {Array<Object>} options.columns - The fleet table's columns
 * @param {string} options.prefsKey - The localStorage key
 * @returns {Object} `rows`, `total`, `filtering`, `sort`, `setSort`, `resetSort`, `hiddenColumns`, `filterState`, `cycleFilter`, `poolsCollapsed`, `togglePools`
 */
export const useFleetSearch = ({ vms, now, columns, prefsKey }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [prefs, setPrefs] = useState(() => readPrefs(prefsKey, columns));

  useEffect(() => {
    writePrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const needle = query.trim().toLowerCase();
  const passing = vms.filter(
    vm => (needle === '' || matchesQuery(vm, needle)) && passesFilters(vm, prefs.filters, now)
  );
  const shown = columns.filter(column => !prefs.hiddenColumns.has(column.key));
  const rows = sortItems([...passing].sort(byHostname), prefs.sort, shown);
  const counts = countValues(vms, now);

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('vdi.search.placeholder'),
    matched: passing.length,
    total: vms.length,
    groups: buildGroups({
      vms,
      counts,
      filters: prefs.filters,
      hidden: prefs.hiddenColumns,
      columns,
      setPrefs,
      t,
    }),
    onClearFilters: () => setPrefs(current => ({ ...current, filters: emptyFilters() })),
  });

  const filterState = (dimension, value) => {
    const sets = prefs.filters[dimension];
    if (sets.include.has(value)) {
      return 'include';
    }
    return sets.exclude.has(value) ? 'exclude' : '';
  };

  return {
    rows,
    total: vms.length,
    filtering: filtering(needle, prefs.filters),
    sort: prefs.sort,
    setSort: (column, options) =>
      setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) })),
    resetSort: () => setPrefs(current => ({ ...current, sort: [] })),
    hiddenColumns: prefs.hiddenColumns,
    filterState,
    cycleFilter: (dimension, value) =>
      setPrefs(current => ({
        ...current,
        filters: { ...current.filters, [dimension]: cycle(current.filters[dimension], value) },
      })),
    poolsCollapsed: prefs.poolsCollapsed,
    togglePools: () =>
      setPrefs(current => ({ ...current, poolsCollapsed: !current.poolsCollapsed })),
  };
};
