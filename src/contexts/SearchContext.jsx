import PropTypes from 'prop-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useLocation } from 'react-router-dom';

import { readElsewhereFold } from '../utils/prefs';
import { MIN_QUERY, isAbortError, parseQuery, rowKeyOf, searchKindShape } from '../utils/searchRow';
import { compareRowsFor } from '../utils/searchScore';

export const NavbarSearchContext = createContext(null);

export const APP_SEARCH_LIMIT = 5;

export const PAGE_SEARCH_LIMIT = 50;

export const searchSourceShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  kinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  local: PropTypes.bool.isRequired,
  serving: PropTypes.bool,
  match: PropTypes.func,
  search: PropTypes.func.isRequired,
});

export const appSearchShape = PropTypes.shape({
  kinds: PropTypes.objectOf(PropTypes.arrayOf(searchKindShape)).isRequired,
  sources: PropTypes.arrayOf(searchSourceShape).isRequired,
  scopeOf: PropTypes.func.isRequired,
  collections: PropTypes.array.isRequired,
});

const pillGroupShape = PropTypes.shape({
  kind: PropTypes.oneOf(['toggle', 'select']),
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  entries: PropTypes.objectOf(PropTypes.number).isRequired,
  activeSet: PropTypes.instanceOf(Set).isRequired,
  excludeSet: PropTypes.instanceOf(Set),
  tristate: PropTypes.bool,
  activeClass: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  pillClass: PropTypes.func,
  labelFor: PropTypes.func,
  columns: PropTypes.bool,
});

const dateRangeGroupShape = PropTypes.shape({
  kind: PropTypes.oneOf(['date-range']).isRequired,
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.shape({
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  startLabel: PropTypes.string.isRequired,
  endLabel: PropTypes.string.isRequired,
});

export const navbarSearchGroupShape = PropTypes.oneOfType([dateRangeGroupShape, pillGroupShape]);

export const navbarSearchActionShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  onRun: PropTypes.func.isRequired,
});

export const navbarSearchBindingShape = PropTypes.shape({
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  matched: PropTypes.number.isRequired,
  total: PropTypes.number,
  groups: PropTypes.arrayOf(navbarSearchGroupShape).isRequired,
  onClearFilters: PropTypes.func.isRequired,
  action: navbarSearchActionShape,
});

/**
 * Whether a binding gives the filter panel a group or an action to draw.
 *
 * @param {Object|null} binding - The page's binding
 * @returns {boolean} Whether the panel has content
 */
export const hasPanel = binding =>
  Boolean(binding && (binding.groups.length > 0 || binding.action));

/**
 * A held value with a version raised on each notify, read through
 * `useSyncExternalStore`.
 *
 * @returns {{ get: Function, version: Function, replace: Function, notify: Function, subscribe: Function }} The store
 */
export const createStore = () => {
  let held = null;
  let version = 0;
  const listeners = new Set();
  return {
    get: () => held,
    version: () => version,
    replace: next => {
      held = next;
    },
    notify: () => {
      version += 1;
      listeners.forEach(listener => listener());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const noopSubscribe = () => () => {};
const zero = () => 0;

/**
 * The binding the page publishes to the navbar, re-read on every notify.
 *
 * @param {Object|undefined} store - The binding store from the provider
 * @returns {Object|null} The binding, null while no page is bound
 */
export const useNavbarSearch = store => {
  useSyncExternalStore(store ? store.subscribe : noopSubscribe, store ? store.version : zero);
  return store ? store.get() : null;
};

const groupCount = group => {
  if (group.columns) {
    return 0;
  }
  if (group.kind === 'date-range') {
    return group.value.start || group.value.end ? 1 : 0;
  }
  return group.activeSet.size + (group.excludeSet?.size || 0);
};

/**
 * How many filter values are active across the binding's groups, the
 * column groups left out, plus one for the kind a count pill pins.
 *
 * @param {Object} binding - The page's binding
 * @param {Object} [search] - The navbar search context, its `pinned`
 * @returns {number} The count
 */
export const activeFilterCount = (binding, search = {}) =>
  binding.groups.reduce((sum, group) => sum + groupCount(group), 0) + (search.pinned ? 1 : 0);

const NO_KINDS = [];

const HOST_SCOPE = 'host:';

const EMPTY_ANSWERS = { runKey: '', entries: {} };

const asks = (source, kinds) =>
  kinds.length === 0 || kinds.some(kind => source.kinds.includes(kind));

const kindsFor = (source, kinds) => kinds.filter(kind => source.kinds.includes(kind));

const withEntry = (runKey, key, entry) => current =>
  current.runKey === runKey
    ? { runKey, entries: { ...current.entries, [key]: entry } }
    : { runKey, entries: { [key]: entry } };

const coverOf = row => `${row.host}|${row.kind}`;

const addCount = (counts, kind, value, relation) => {
  const held = counts[kind] || { value: 0, relation: 'eq' };
  return {
    ...counts,
    [kind]: {
      value: held.value + value,
      relation: held.relation === 'gte' || relation === 'gte' ? 'gte' : 'eq',
    },
  };
};

const cutPerKind = (rows, limit) => {
  const seen = {};
  return rows.filter(row => {
    seen[row.kind] = (seen[row.kind] || 0) + 1;
    return !limit || seen[row.kind] <= limit;
  });
};

const mergeAnswers = ({ localRows, answered, pending, query, limit }) => {
  const covered = new Set(
    answered.flatMap(({ source }) => source.kinds.map(kind => `${source.host}|${kind}`))
  );
  const kept = localRows.filter(row => !covered.has(coverOf(row))).sort(compareRowsFor(query));
  const byKey = new Map();
  const hold = row => byKey.set(rowKeyOf(row), row);
  cutPerKind(kept, limit).forEach(hold);
  answered.forEach(({ entry }) => entry.answer.results.forEach(hold));
  let counts = kept.reduce((held, row) => addCount(held, row.kind, 1, 'eq'), {});
  answered.forEach(({ entry }) =>
    Object.entries(entry.answer.counts).forEach(([kind, count]) => {
      counts = addCount(counts, kind, Number(count?.value) || 0, count?.relation);
    })
  );
  if (pending.length > 0) {
    counts = Object.fromEntries(
      Object.entries(counts).map(([kind, count]) => [kind, { ...count, relation: 'gte' }])
    );
  }
  return { rows: [...byKey.values()].sort(compareRowsFor(query)), counts };
};

/**
 * One app-wide search over the sources: the text typed read for its
 * `type:` and `org:` words, the sources that answer in the browser
 * matched at once, every other source asked as its own promise, each
 * answer merged by score as it lands, every open request aborted when the
 * request changes.
 *
 * @param {Object} options
 * @param {Array<Object>} options.sources - The search sources
 * @param {string} options.typed - The text in the box
 * @param {Array<string>} [options.kinds] - The kinds asked for while the text names none
 * @param {string} [options.scope] - The scope asked for while the text names none, `host:<id>` asking that host alone
 * @param {number} options.limit - The most rows per kind each source answers
 * @param {Object|null} [options.cursors] - The cursor per source key of the page asked for, null for the first page
 * @returns {{ query: string, kinds: Array<string>, scope: string, active: boolean, rows: Array<Object>, counts: Object, states: Array<Object>, pending: Array<Object>, failed: Array<Object>, nexts: Object, retry: Function }} The search
 */
export const useSearchRun = ({
  sources,
  typed,
  kinds: pinned = NO_KINDS,
  scope: chosen = '',
  limit,
  cursors = null,
}) => {
  const parsed = parseQuery(typed);
  const query = parsed.text.trim();
  const kinds = parsed.kinds.length > 0 ? parsed.kinds : pinned;
  const scope = parsed.scope || chosen;
  const hostScope = scope.startsWith(HOST_SCOPE) ? scope.slice(HOST_SCOPE.length) : '';
  const wireScope = hostScope ? '' : scope;
  const active = query.length >= MIN_QUERY;
  const kindsKey = kinds.join(',');
  const cursorsKey = cursors ? JSON.stringify(cursors) : '';
  const remote = sources.filter(
    source =>
      !source.local &&
      asks(source, kinds) &&
      (!hostScope || source.host === hostScope) &&
      (!cursors || Boolean(cursors[source.key]))
  );
  const runKey = [query, kindsKey, scope, limit, cursorsKey, remote.map(s => s.key)].join('\n');
  const held = useRef(remote);
  const latest = useRef('');
  const controller = useRef(null);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);

  useEffect(() => {
    held.current = remote;
  });

  const ask = useCallback(
    (source, request) =>
      source
        .search(request.query, {
          kinds: kindsFor(source, request.kinds),
          scope: request.scope,
          limit: request.limit,
          after: request.after[source.key] || '',
          signal: request.signal,
        })
        .then(answer => {
          if (latest.current === request.runKey) {
            setAnswers(withEntry(request.runKey, source.key, { state: 'done', answer }));
          }
        })
        .catch(error => {
          if (!isAbortError(error) && latest.current === request.runKey) {
            setAnswers(withEntry(request.runKey, source.key, { state: 'failed', answer: null }));
          }
        }),
    []
  );

  const requestOf = useCallback(
    signal => ({
      runKey,
      query,
      kinds: kindsKey ? kindsKey.split(',') : [],
      scope: wireScope,
      limit,
      after: cursorsKey ? JSON.parse(cursorsKey) : {},
      signal,
    }),
    [runKey, query, kindsKey, wireScope, limit, cursorsKey]
  );

  useEffect(() => {
    latest.current = runKey;
    if (!active) {
      return undefined;
    }
    const open = new AbortController();
    controller.current = open;
    const request = requestOf(open.signal);
    held.current.forEach(source => ask(source, request));
    return () => open.abort();
  }, [active, runKey, requestOf, ask]);

  const retry = useCallback(
    key => {
      const source = held.current.find(entry => entry.key === key);
      if (!source || !active) {
        return;
      }
      setAnswers(withEntry(runKey, key, { state: 'pending', answer: null }));
      ask(source, requestOf(controller.current?.signal));
    },
    [active, runKey, requestOf, ask]
  );

  const localRows = useMemo(() => {
    if (!active || cursors) {
      return [];
    }
    const matchOf = source =>
      source.match(query, { kinds: kindsFor(source, kinds), scope: wireScope, limit: 0 }).results;
    return sources
      .filter(source => source.local && asks(source, kinds))
      .flatMap(matchOf)
      .filter(row => !hostScope || row.host === hostScope);
  }, [active, cursors, sources, kinds, query, wireScope, hostScope]);

  const states = remote.map(source => {
    const entry = answers.runKey === runKey ? answers.entries[source.key] : undefined;
    return { source, entry, state: entry?.state || 'pending' };
  });
  const answered = active ? states.filter(item => item.state === 'done') : [];
  const pending = active ? states.filter(item => item.state === 'pending') : [];
  const failed = active ? states.filter(item => item.state === 'failed') : [];
  const merged = mergeAnswers({ localRows, answered, pending, query, limit });

  return {
    query,
    kinds,
    scope,
    active,
    rows: active ? merged.rows : [],
    counts: active ? merged.counts : {},
    states: active ? states : [],
    pending: pending.map(item => item.source),
    failed: failed.map(item => item.source),
    nexts: Object.fromEntries(
      answered
        .filter(item => item.entry.answer.next)
        .map(item => [item.source.key, item.entry.answer.next])
    ),
    retry,
  };
};

const useScopeChip = scopeOf => {
  const { pathname } = useLocation();
  const [dropped, setDropped] = useState('');
  const chip = scopeOf(pathname);
  return {
    chip: chip && dropped !== pathname ? chip : null,
    dropChip: () => setDropped(pathname),
  };
};

/**
 * Holds the navbar search and its one run: the page binding store, the
 * results page's request store, whether the navbar box is expanded and
 * its filter panel shown, the text typed in it, the kind pinned by its
 * count pills, the key of the highlighted result, whether its app-wide
 * results are folded (kept in local storage), whether the box searches
 * everywhere or this app, the scope chip of the route while the page's
 * binding gives the panel something to draw, the run over the
 * app search's sources, the results page's request while that page is
 * mounted and the box's otherwise, the refs of the box's input and the
 * results list, and `openBox`, which expands the box holding the page's
 * query or puts the focus in it while it is expanded. In this-app mode the box's run asks the sources of the
 * serving backend and the rows the browser holds, and the chip's host
 * alone while a host chip is set; everywhere, every
 * source, each host through its own promise; the results page asks every
 * source.
 */
export const NavbarSearchProvider = ({ appSearch, children }) => {
  const [store] = useState(createStore);
  const [pageStore] = useState(createStore);
  const [expanded, setExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [appQuery, setAppQuery] = useState('');
  const [pinned, setPinned] = useState('');
  const [activeKey, setActiveKey] = useState('');
  const [folded, setFolded] = useState(readElsewhereFold);
  const [everywhere, setEverywhere] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const scoped = useScopeChip(appSearch.scopeOf);
  const binding = useNavbarSearch(store);
  const chip = hasPanel(binding) ? scoped.chip : null;
  const { dropChip } = scoped;
  const page = useNavbarSearch(pageStore);
  const appSources = useMemo(
    () => appSearch.sources.filter(source => !source.host || source.serving),
    [appSearch.sources]
  );
  const run = useSearchRun(
    page
      ? { sources: appSearch.sources, ...page, limit: PAGE_SEARCH_LIMIT }
      : {
          sources:
            everywhere || chip?.scope.startsWith(HOST_SCOPE) ? appSearch.sources : appSources,
          typed: expanded ? appQuery : '',
          kinds: pinned ? [pinned] : NO_KINDS,
          scope: chip ? chip.scope : '',
          limit: APP_SEARCH_LIMIT,
        }
  );
  const openBox = useCallback(() => {
    if (expanded) {
      inputRef.current?.focus();
      return;
    }
    setAppQuery(store.get()?.query || '');
    setExpanded(true);
  }, [expanded, store]);
  const value = useMemo(
    () => ({
      store,
      pageStore,
      expanded,
      setExpanded,
      openBox,
      panelOpen,
      setPanelOpen,
      appSearch,
      appQuery,
      setAppQuery,
      pinned,
      setPinned,
      activeKey,
      setActiveKey,
      folded,
      setFolded,
      everywhere,
      setEverywhere,
      chip,
      dropChip,
      paged: Boolean(page),
      run,
      inputRef,
      resultsRef,
    }),
    [
      store,
      pageStore,
      expanded,
      openBox,
      panelOpen,
      appSearch,
      appQuery,
      pinned,
      activeKey,
      folded,
      everywhere,
      chip,
      dropChip,
      page,
      run,
    ]
  );
  return <NavbarSearchContext.Provider value={value}>{children}</NavbarSearchContext.Provider>;
};

NavbarSearchProvider.propTypes = {
  appSearch: appSearchShape.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The results page's hold on the one run: its request, `{ typed, kinds,
 * scope, cursors }`, published while the page is mounted, and the run
 * answering it.
 *
 * @param {Object} request - The page's request
 * @returns {Object} The run
 */
export const usePageSearchRun = request => {
  const context = useContext(NavbarSearchContext);
  const pageStore = context?.pageStore;
  const signature = JSON.stringify(request);

  useEffect(() => {
    pageStore?.replace(JSON.parse(signature));
    pageStore?.notify();
  }, [pageStore, signature]);

  useEffect(
    () => () => {
      pageStore?.replace(null);
      pageStore?.notify();
    },
    [pageStore]
  );

  return context.run;
};
