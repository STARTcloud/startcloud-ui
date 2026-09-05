import PropTypes from 'prop-types';
import { useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGear, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import {
  NavbarSearchContext,
  activeFilterCount,
  navbarSearchBindingShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';

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

const SearchBox = ({ binding, live, panelOpen, onTogglePanel, onClear, onCollapse }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const filters = activeFilterCount(binding);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = event => {
    if (event.key === 'Escape' && !live().query) {
      onCollapse();
    }
  };

  return (
    <li className="nav-item">
      <div className="navbar-search">
        <FaMagnifyingGlass className="text-body-secondary flex-shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={binding.query}
          placeholder={binding.placeholder}
          aria-label={t('search.open')}
          onChange={event => live().onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {binding.total > 0 ? (
          <span className="navbar-search-count">
            {binding.matched} / {binding.total}
          </span>
        ) : null}
        {binding.groups.length > 0 ? (
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
  binding: navbarSearchBindingShape.isRequired,
  live: PropTypes.func.isRequired,
  panelOpen: PropTypes.bool.isRequired,
  onTogglePanel: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onCollapse: PropTypes.func.isRequired,
};

export const NavbarSearchControl = () => {
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);
  const dwell = useRef(null);

  useEffect(() => () => clearTimeout(dwell.current), []);

  if (!context || !binding) {
    return null;
  }

  const { store, expanded, setExpanded, panelOpen, setPanelOpen } = context;
  const live = () => store.get() || binding;

  const collapse = () => {
    setPanelOpen(false);
    setExpanded(false);
  };

  const clearAll = () => {
    const current = live();
    current.onQueryChange('');
    current.onClearFilters();
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
        filtersOn={activeFilterCount(binding) > 0}
        onOpen={() => setExpanded(true)}
        onMouseEnter={startDwell}
        onMouseLeave={stopDwell}
      />
    );
  }

  return (
    <SearchBox
      binding={binding}
      live={live}
      panelOpen={panelOpen}
      onTogglePanel={() => setPanelOpen(open => !open)}
      onClear={clearAll}
      onCollapse={collapse}
    />
  );
};
