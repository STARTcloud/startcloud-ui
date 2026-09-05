import PropTypes from 'prop-types';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import {
  NavbarSearchContext,
  activeFilterCount,
  navbarSearchGroupShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';

const FilterPill = ({ count, active, activeClass, label, onToggle }) => (
  <span
    className={`badge rounded-pill badge-xs cursor-pointer ${
      active ? activeClass : 'bg-secondary bg-opacity-25'
    }`}
    onClick={onToggle}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
      }
    }}
    role="button"
    tabIndex={0}
  >
    {label}
    {typeof count === 'number' ? ` (${count})` : null}
  </span>
);

FilterPill.propTypes = {
  count: PropTypes.number,
  active: PropTypes.bool.isRequired,
  activeClass: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const FilterGroup = ({ group }) => (
  <div className="navbar-search-group">
    <span className="navbar-search-group-label">{group.label}</span>
    <span className="navbar-search-pills">
      {Object.entries(group.entries).map(([value, count]) => (
        <FilterPill
          key={value}
          count={count}
          active={group.activeSet.has(value)}
          activeClass={group.pillClass ? group.pillClass(value) : group.activeClass}
          label={group.labelFor ? group.labelFor(value) : value}
          onToggle={() => group.onToggle(value)}
        />
      ))}
    </span>
  </div>
);

FilterGroup.propTypes = {
  group: navbarSearchGroupShape.isRequired,
};

export const NavbarSearchPanel = () => {
  const { t } = useTranslation();
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);

  if (!context || !binding || !context.panelOpen || binding.groups.length === 0) {
    return null;
  }

  return (
    <div className="navbar-search-panel w-100">
      {binding.groups.map(group => (
        <FilterGroup key={group.key} group={group} />
      ))}
      <div className="navbar-search-foot">
        <span>{t('search.activeFilters', { count: activeFilterCount(binding) })}</span>
        <span className="flex-grow-1" />
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={() => (context.store.get() || binding).onClearFilters()}
        >
          {t('search.clearFilters')}
        </button>
      </div>
    </div>
  );
};
