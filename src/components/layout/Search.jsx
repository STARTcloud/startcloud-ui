import PropTypes from 'prop-types';
import { useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGear, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import {
  NavbarSearchContext,
  activeFilterCount,
  hasPanel,
  navbarSearchBindingShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';
import { useStatus } from '../../contexts/StatusContext';
import { hasFeature } from '../../utils/capabilities';
import { parseQuery, rowKeyOf, searchRowPath } from '../../utils/searchRow';

import { LIST_ID, optionIdOf, optionOrder } from './SearchPanel';

const HOVER_DWELL_MS = 400;

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

const SearchCount = ({ binding = null }) => {
  const { t } = useTranslation();
  if (!binding) {
    return null;
  }
  if (typeof binding.total !== 'number') {
    return (
      <span className="navbar-search-count">{t('search.results', { count: binding.matched })}</span>
    );
  }
  if (binding.total === 0) {
    return null;
  }
  return (
    <span className="navbar-search-count">
      {binding.matched} / {binding.total}
    </span>
  );
};

SearchCount.propTypes = {
  binding: navbarSearchBindingShape,
};

const SearchBox = ({
  binding = null,
  query,
  placeholder,
  inputRef,
  panelOpen,
  filters,
  list,
  everywhere,
  hits,
  modeLabel,
  onToggleMode,
  onQueryChange,
  onTogglePanel,
  onClear,
  onKeyDown,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <li className="nav-item">
      <search className="navbar-search">
        <button
          type="button"
          className="btn btn-link p-0 border-0 d-inline-flex text-body-secondary flex-shrink-0"
          onClick={onToggleMode}
          title={modeLabel}
          aria-label={modeLabel}
        >
          <FaMagnifyingGlass aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={list.open}
          aria-controls={LIST_ID}
          aria-activedescendant={list.activeId || undefined}
          value={query}
          placeholder={placeholder}
          aria-label={t('search.open')}
          onChange={event => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {everywhere ? (
          <span className="navbar-search-count">{t('search.results', { count: hits })}</span>
        ) : (
          <SearchCount binding={binding} />
        )}

        {hasPanel(binding) ? (
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
      </search>
    </li>
  );
};

SearchBox.propTypes = {
  binding: navbarSearchBindingShape,
  query: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  inputRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  panelOpen: PropTypes.bool.isRequired,
  filters: PropTypes.number.isRequired,
  list: PropTypes.shape({ open: PropTypes.bool.isRequired, activeId: PropTypes.string }).isRequired,
  everywhere: PropTypes.bool.isRequired,
  hits: PropTypes.number.isRequired,
  modeLabel: PropTypes.string.isRequired,
  onToggleMode: PropTypes.func.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onTogglePanel: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

/**
 * The navbar search module, drawn only while the host lists the `search`
 * feature token (a host without it draws no icon and no box, a page's
 * binding then published to nobody): the icon, then on click or a hover of
 * 400 ms the box, holding the page's query when it opens, in a `<search>`
 * landmark, its input a combobox over the results list the panel draws.
 * Its leading magnifier is a mode switch,
 * each click flipping between this app and everywhere; in this-app mode
 * the box carries the page's placeholder and count, everywhere it reads
 * "Search everywhere" and the run's hit count.
 * The text in the box feeds the one run of the context; with a page
 * binding the box drives the page's search and filters too, the `type:`
 * and `org:` words read off the text before it reaches the page; with none
 * the box carries the brand's placeholder. Down moves the focus to the
 * first result link, Alt+Down leaves the focus in the input, Enter opens
 * the highlighted result or the first; Escape returns to this-app mode
 * with the query kept, then clears the query, then folds the box back
 * into the icon. The `/` and Ctrl+Alt+F shortcuts of the shell expand the
 * box through the context's `openBox`.
 */
export const NavbarSearchControl = () => {
  const { t } = useTranslation();
  const status = useStatus();
  const navigate = useNavigate();
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);
  const expanded = Boolean(context?.expanded);
  const dwell = useRef(null);
  const drawn = Boolean(context) && hasFeature(status, 'search');

  useEffect(() => () => clearTimeout(dwell.current), []);

  if (!drawn) {
    return null;
  }

  const { store, setExpanded, panelOpen, setPanelOpen, setAppQuery, setPinned, inputRef } = context;
  const open = context.openBox;
  const { appSearch, run, activeKey, setActiveKey, everywhere, setEverywhere } = context;
  const appName = t('search.appPlaceholder', { app: status.brand.name });
  const query = context.appQuery;
  const live = () => store.get() || binding;
  const order = optionOrder(run.rows, appSearch.collections, appSearch.kinds);
  const keys = order.map(rowKeyOf);
  const held = keys.includes(activeKey) ? activeKey : '';
  const showList = run.active && keys.length > 0 && !context.folded;
  const filters = binding ? activeFilterCount(binding, context) : 0;

  const setQuery = value => {
    setAppQuery(value);
    if (binding) {
      const parsed = parseQuery(value);
      live().onQueryChange(parsed.text, parsed);
    }
  };

  const collapse = () => {
    setPanelOpen(false);
    setExpanded(false);
    setAppQuery('');
    setPinned('');
    setActiveKey('');
    setEverywhere(false);
  };

  const clearAll = () => {
    setQuery('');
    if (binding) {
      live().onClearFilters();
    }
    context.dropChip();
    collapse();
  };

  const openKey = key => {
    const row = order.find(entry => rowKeyOf(entry) === key);
    if (row?.command) {
      collapse();
      row.command();
      return;
    }
    const to = row ? searchRowPath(row, appSearch.kinds, run.query) : '';
    if (to) {
      collapse();
      navigate(to);
    }
  };

  const onEscape = () => {
    if (everywhere) {
      setEverywhere(false);
      return;
    }
    if (query) {
      setQuery('');
      return;
    }
    collapse();
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      onEscape();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!event.altKey) {
        context.resultsRef.current?.querySelector('a')?.focus();
      }
    }
    if (event.key === 'Enter' && showList) {
      event.preventDefault();
      openKey(held || keys[0]);
    }
  };

  const startDwell = () => {
    clearTimeout(dwell.current);
    dwell.current = setTimeout(open, HOVER_DWELL_MS);
  };

  const stopDwell = () => clearTimeout(dwell.current);

  if (!expanded) {
    return (
      <SearchIconButton
        filtersOn={filters > 0}
        onOpen={open}
        onMouseEnter={startDwell}
        onMouseLeave={stopDwell}
      />
    );
  }

  return (
    <SearchBox
      binding={binding}
      query={query}
      placeholder={everywhere ? t('search.everywhere') : binding?.placeholder || appName}
      inputRef={inputRef}
      panelOpen={panelOpen}
      filters={filters}
      list={{ open: showList, activeId: showList && held ? optionIdOf(held) : '' }}
      everywhere={everywhere}
      hits={Object.values(run.counts).reduce((sum, count) => sum + count.value, 0)}
      modeLabel={everywhere ? appName : t('search.everywhere')}
      onToggleMode={() => setEverywhere(current => !current)}
      onQueryChange={setQuery}
      onTogglePanel={() => setPanelOpen(current => !current)}
      onClear={clearAll}
      onKeyDown={onKeyDown}
    />
  );
};
