import PropTypes from 'prop-types';
import { useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGear, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import {
  APP_SEARCH_LIMIT,
  NavbarSearchContext,
  activeFilterCount,
  navbarSearchBindingShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';
import { useStatus } from '../../contexts/StatusContext';

const HOVER_DWELL_MS = 400;
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

const SearchIconButton = ({ filtersOn, onOpen, onMouseEnter, onMouseLeave }) => {
  const { t } = useTranslation();
  return (
    <li className="nav-item">
      <button
        type="button"
        className={`btn btn-link nav-link cluster-btn${filtersOn ? ' filters-on' : ''}`}
        onClick={onOpen}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        title={t('search.open')}
        aria-label={t('search.open')}
      >
        <FaMagnifyingGlass />
      </button>
    </li>
  );
};

SearchIconButton.propTypes = {
  filtersOn: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
};

const SearchBox = ({
  binding = null,
  query,
  placeholder,
  inputRef,
  panelOpen,
  onQueryChange,
  onTogglePanel,
  onClear,
  onEscape,
  onDown,
}) => {
  const { t } = useTranslation();
  const filters = binding ? activeFilterCount(binding) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      onEscape();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onDown();
    }
  };

  return (
    <li className="nav-item">
      <div className="navbar-search">
        <FaMagnifyingGlass className="text-body-secondary flex-shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label={t('search.open')}
          onChange={event => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {binding && binding.total > 0 ? (
          <span className="navbar-search-count">
            {binding.matched} / {binding.total}
          </span>
        ) : null}
        {binding && binding.groups.length > 0 ? (
          <button
            type="button"
            className={`navbar-search-tool${panelOpen || filters > 0 ? ' on' : ''}`}
            onClick={onTogglePanel}
            title={t('search.filters')}
            aria-label={t('search.filters')}
            aria-pressed={panelOpen}
          >
            <FaGear />
          </button>
        ) : null}
        <button
          type="button"
          className="navbar-search-tool"
          onClick={onClear}
          title={t('search.clear')}
          aria-label={t('search.clear')}
        >
          <FaXmark />
        </button>
      </div>
    </li>
  );
};

SearchBox.propTypes = {
  binding: navbarSearchBindingShape,
  query: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  inputRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  panelOpen: PropTypes.bool.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onTogglePanel: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
  onDown: PropTypes.func.isRequired,
};

const useAppResults = ({ context, expanded, query }) => {
  const appSearch = context?.appSearch;
  const setAppResults = context?.setAppResults;
  const needle = query.trim();

  const active =
    Boolean(setAppResults && expanded && appSearch?.available) && needle.length >= MIN_QUERY;

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      appSearch
        .search(needle, APP_SEARCH_LIMIT)
        .then(answer => {
          if (live) {
            setAppResults({
              query: needle,
              results: answer.results || [],
              truncated: answer.truncated || {},
              loading: false,
            });
          }
        })
        .catch(() => {
          if (live) {
            setAppResults({ query: needle, results: [], truncated: {}, loading: false });
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [active, appSearch, setAppResults, needle]);
};

/**
 * The navbar search module: the icon, then on click or hover the box. With
 * a page binding the box drives the page's search and filters and, from two
 * characters on, the app-wide search too; with none it drives only the
 * app-wide search under the brand's placeholder. The app-wide answer lands
 * in the context for the panel to draw.
 */
export const NavbarSearchControl = () => {
  const { t } = useTranslation();
  const status = useStatus();
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);
  const expanded = Boolean(context?.expanded);
  const query = binding ? binding.query : context?.appQuery || '';
  const dwell = useRef(null);

  useEffect(() => () => clearTimeout(dwell.current), []);
  useAppResults({ context, expanded, query });

  if (!context || (!binding && !context.appSearch.available)) {
    return null;
  }

  const { store, setExpanded, panelOpen, setPanelOpen, setAppQuery, inputRef, resultsRef } =
    context;
  const live = () => store.get() || binding;

  const setQuery = value => {
    if (binding) {
      live().onQueryChange(value);
      return;
    }
    setAppQuery(value);
  };

  const collapse = () => {
    setPanelOpen(false);
    setExpanded(false);
    setAppQuery('');
  };

  const clearAll = () => {
    setQuery('');
    if (binding) {
      live().onClearFilters();
    }
    collapse();
  };

  const onEscape = () => {
    if (query) {
      setQuery('');
      return;
    }
    collapse();
  };

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setExpanded(true), HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  if (!expanded) {
    return (
      <SearchIconButton
        filtersOn={Boolean(binding) && activeFilterCount(binding) > 0}
        onOpen={() => setExpanded(true)}
        onMouseEnter={startDwell}
        onMouseLeave={stopDwell}
      />
    );
  }

  return (
    <SearchBox
      binding={binding}
      query={query}
      placeholder={
        binding ? binding.placeholder : t('search.appPlaceholder', { app: status.brand.name })
      }
      inputRef={inputRef}
      panelOpen={panelOpen}
      onQueryChange={setQuery}
      onTogglePanel={() => setPanelOpen(open => !open)}
      onClear={clearAll}
      onEscape={onEscape}
      onDown={() => resultsRef.current?.querySelector('a')?.focus()}
    />
  );
};
