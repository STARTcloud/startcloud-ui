import PropTypes from 'prop-types';
import { useContext } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
  APP_SEARCH_LIMIT,
  NavbarSearchContext,
  activeFilterCount,
  appSearchShape,
  hasPanel,
  navbarSearchActionShape,
  navbarSearchBindingShape,
  navbarSearchGroupShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';
import { useStatus } from '../../contexts/StatusContext';
import DateRange from '../common/DateRange';
import SearchResults from '../common/SearchResults';

const MIN_QUERY = 2;

const EXCLUDE_CLASS = 'bg-danger bg-opacity-25 text-decoration-line-through';
const NEUTRAL_CLASS = 'bg-secondary bg-opacity-25';

const pillClassOf = (state, activeClass) => {
  if (state === 'include') {
    return activeClass;
  }
  return state === 'exclude' ? EXCLUDE_CLASS : NEUTRAL_CLASS;
};

const FilterPill = ({ count, state, activeClass, label, onToggle }) => (
  <span
    className={`badge rounded-pill badge-xs cursor-pointer ${pillClassOf(state, activeClass)}`}
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
  state: PropTypes.oneOf(['', 'include', 'exclude']).isRequired,
  activeClass: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const pillState = (group, value) => {
  if (group.activeSet.has(value)) {
    return 'include';
  }
  return group.excludeSet?.has(value) ? 'exclude' : '';
};

const FilterGroup = ({ group }) => (
  <div className="navbar-search-group">
    <span className="navbar-search-group-label">{group.label}</span>
    <span className="navbar-search-pills">
      {Object.entries(group.entries).map(([value, count]) => (
        <FilterPill
          key={value}
          count={count}
          state={pillState(group, value)}
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

const DateRangeGroup = ({ group }) => (
  <div className="navbar-search-group">
    <span className="navbar-search-group-label">{group.label}</span>
    <DateRange
      value={group.value}
      onChange={group.onChange}
      idPrefix={`navbar-${group.key}`}
      startLabel={group.startLabel}
      endLabel={group.endLabel}
    />
  </div>
);

DateRangeGroup.propTypes = {
  group: navbarSearchGroupShape.isRequired,
};

const drawn = group => group.kind === 'date-range' || Object.keys(group.entries).length > 0;

const PanelAction = ({ action, live }) => {
  const { t } = useTranslation();
  const Icon = action.icon || null;
  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm"
      onClick={() => live().action.onRun()}
    >
      {Icon ? <Icon className="me-1" aria-hidden /> : null}
      {t(action.labelKey)}
    </button>
  );
};

PanelAction.propTypes = {
  action: navbarSearchActionShape.isRequired,
  live: PropTypes.func.isRequired,
};

const FilterGroups = ({ binding, live }) => {
  const { t } = useTranslation();
  return (
    <>
      {binding.groups
        .filter(drawn)
        .map(group =>
          group.kind === 'date-range' ? (
            <DateRangeGroup key={group.key} group={group} />
          ) : (
            <FilterGroup key={group.key} group={group} />
          )
        )}
      <div className="navbar-search-foot">
        <span>{t('search.activeFilters', { count: activeFilterCount(binding) })}</span>
        <span className="flex-grow-1" />
        {binding.action ? <PanelAction action={binding.action} live={live} /> : null}
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={() => live().onClearFilters()}
        >
          {t('search.clearFilters')}
        </button>
      </div>
    </>
  );
};

FilterGroups.propTypes = {
  binding: navbarSearchBindingShape.isRequired,
  live: PropTypes.func.isRequired,
};

const sumOf = counts => Object.values(counts).reduce((sum, count) => sum + count, 0);

const AppBody = ({ query, appResults, appSearch, resultsRef, onPick, onEscape }) => {
  const { t } = useTranslation();
  if (query.length < MIN_QUERY) {
    return null;
  }
  if (appResults.loading || appResults.query !== query) {
    return (
      <div className="navbar-search-app-note d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" role="status" />
        {t('search.loading')}
      </div>
    );
  }
  if (appResults.results.length === 0) {
    return <div className="navbar-search-app-note">{t('search.noHits')}</div>;
  }
  const overflow = sumOf(appResults.truncated);
  const showAll = overflow > 0 || appResults.results.length >= APP_SEARCH_LIMIT;
  return (
    <>
      <SearchResults
        rows={appResults.results}
        appSearch={appSearch}
        listRef={resultsRef}
        onPick={onPick}
        onEscape={onEscape}
      />
      {showAll ? (
        <Link
          to={`/search?q=${encodeURIComponent(query)}`}
          className="btn btn-link btn-sm p-0 align-self-start"
          onClick={onPick}
        >
          {t('search.showAll', { count: appResults.results.length + overflow })}
        </Link>
      ) : null}
    </>
  );
};

AppBody.propTypes = {
  query: PropTypes.string.isRequired,
  appResults: PropTypes.shape({
    query: PropTypes.string.isRequired,
    results: PropTypes.array.isRequired,
    truncated: PropTypes.objectOf(PropTypes.number).isRequired,
    loading: PropTypes.bool.isRequired,
  }).isRequired,
  appSearch: appSearchShape.isRequired,
  resultsRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onPick: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
};

const AppSection = ({ context, bound, query }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { appSearch, appResults, resultsRef, inputRef, setExpanded, setPanelOpen, setAppQuery } =
    context;
  const onPick = () => {
    setPanelOpen(false);
    setExpanded(false);
    setAppQuery('');
  };
  return (
    <div className="navbar-search-app">
      <span className="navbar-search-group-label">
        {t(bound ? 'search.elsewhere' : 'search.inApp', { app: status.brand.name })}
      </span>
      <AppBody
        query={query}
        appResults={appResults}
        appSearch={appSearch}
        resultsRef={resultsRef}
        onPick={onPick}
        onEscape={() => inputRef.current?.focus()}
      />
    </div>
  );
};

AppSection.propTypes = {
  context: PropTypes.object.isRequired,
  bound: PropTypes.bool.isRequired,
  query: PropTypes.string.isRequired,
};

/**
 * The band under the navbar: the page's filter groups while the gear is on,
 * a `toggle` or `select` group as one row of pills and a `date-range` group
 * as the shared `DateRange` with its presets, the page's registered action
 * at the foot beside Clear filters, and the app-wide results for the query
 * in the box, headed "Elsewhere in the app" beside a page binding and "In
 * the app" without one.
 */
export const NavbarSearchPanel = () => {
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);

  if (!context) {
    return null;
  }

  const filters = context.panelOpen && hasPanel(binding);
  const query = (binding ? binding.query : context.appQuery).trim();
  const app = context.expanded && context.appSearch.available && query.length > 0;

  if (!filters && !app) {
    return null;
  }

  return (
    <div className="navbar-search-panel w-100">
      {filters ? (
        <FilterGroups binding={binding} live={() => context.store.get() || binding} />
      ) : null}
      {app ? <AppSection context={context} bound={Boolean(binding)} query={query} /> : null}
    </div>
  );
};
