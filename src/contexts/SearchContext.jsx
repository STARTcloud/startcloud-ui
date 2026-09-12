import PropTypes from 'prop-types';
import { createContext, useMemo, useRef, useState, useSyncExternalStore } from 'react';

export const NavbarSearchContext = createContext(null);

export const APP_SEARCH_LIMIT = 5;

export const EMPTY_APP_RESULTS = { query: '', results: [], truncated: {}, loading: false };

export const appSearchShape = PropTypes.shape({
  search: PropTypes.func.isRequired,
  available: PropTypes.bool.isRequired,
  collections: PropTypes.array.isRequired,
  role: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
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
 * Whether a binding gives the panel something to draw: a filter group or
 * the page's registered action.
 *
 * @param {Object|null} binding - The page's binding
 * @returns {boolean} Whether the panel has content
 */
export const hasPanel = binding =>
  Boolean(binding && (binding.groups.length > 0 || binding.action));

const createBindingStore = () => {
  let binding = null;
  let version = 0;
  const listeners = new Set();
  return {
    get: () => binding,
    version: () => version,
    replace: next => {
      binding = next;
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

/**
 * Holds the navbar search: the page binding store, whether the box is
 * expanded and the filter panel open, the app-wide search the host answers
 * (`appSearch`), the query typed on a page with no binding, the app-wide
 * results the box last fetched, and the refs the box and the results list
 * hand focus through.
 */
export const NavbarSearchProvider = ({ appSearch, children }) => {
  const [store] = useState(createBindingStore);
  const [expanded, setExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [appQuery, setAppQuery] = useState('');
  const [appResults, setAppResults] = useState(EMPTY_APP_RESULTS);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const value = useMemo(
    () => ({
      store,
      expanded,
      setExpanded,
      panelOpen,
      setPanelOpen,
      appSearch,
      appQuery,
      setAppQuery,
      appResults,
      setAppResults,
      inputRef,
      resultsRef,
    }),
    [store, expanded, panelOpen, appSearch, appQuery, appResults]
  );
  return <NavbarSearchContext.Provider value={value}>{children}</NavbarSearchContext.Provider>;
};

NavbarSearchProvider.propTypes = {
  appSearch: appSearchShape.isRequired,
  children: PropTypes.node.isRequired,
};

const noopSubscribe = () => () => {};
const zero = () => 0;

/**
 * The binding the page currently publishes to the navbar, re-read on every
 * notify; null when no page is bound.
 *
 * @param {Object|undefined} store - The binding store from the provider
 * @returns {Object|null} The binding
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
 * How many filter values are active across the binding's groups, included
 * and excluded alike, a bounded date range counting once, the column
 * groups left out.
 *
 * @param {Object} binding - The page's binding
 * @returns {number} The count
 */
export const activeFilterCount = binding =>
  binding.groups.reduce((sum, group) => sum + groupCount(group), 0);
