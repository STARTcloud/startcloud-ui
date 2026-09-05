import PropTypes from 'prop-types';
import { createContext, useMemo, useState, useSyncExternalStore } from 'react';

export const NavbarSearchContext = createContext(null);

export const navbarSearchGroupShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  entries: PropTypes.objectOf(PropTypes.number).isRequired,
  activeSet: PropTypes.instanceOf(Set).isRequired,
  activeClass: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  pillClass: PropTypes.func,
  labelFor: PropTypes.func,
  columns: PropTypes.bool,
});

export const navbarSearchBindingShape = PropTypes.shape({
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  matched: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  groups: PropTypes.arrayOf(navbarSearchGroupShape).isRequired,
  onClearFilters: PropTypes.func.isRequired,
});

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

export const NavbarSearchProvider = ({ children }) => {
  const [store] = useState(createBindingStore);
  const [expanded, setExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const value = useMemo(
    () => ({ store, expanded, setExpanded, panelOpen, setPanelOpen }),
    [store, expanded, panelOpen]
  );
  return <NavbarSearchContext.Provider value={value}>{children}</NavbarSearchContext.Provider>;
};

NavbarSearchProvider.propTypes = {
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

/**
 * How many filter values are active across the binding's groups, the
 * column groups left out.
 *
 * @param {Object} binding - The page's binding
 * @returns {number} The count
 */
export const activeFilterCount = binding =>
  binding.groups.reduce((sum, group) => sum + (group.columns ? 0 : group.activeSet.size), 0);
