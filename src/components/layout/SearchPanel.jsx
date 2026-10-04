import PropTypes from 'prop-types';
import { useContext, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBan,
  FaBell,
  FaBuilding,
  FaChevronDown,
  FaChevronRight,
  FaCircleQuestion,
  FaCube,
  FaDesktop,
  FaFile,
  FaFileContract,
  FaIdBadge,
  FaMicrochip,
  FaRightToBracket,
  FaServer,
  FaTag,
  FaUser,
  FaUserPlus,
  FaWindowMaximize,
  FaXmark,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import {
  NavbarSearchContext,
  activeFilterCount,
  hasPanel,
  navbarSearchActionShape,
  navbarSearchBindingShape,
  navbarSearchGroupShape,
  useNavbarSearch,
} from '../../contexts/SearchContext';
import { useStatus } from '../../contexts/StatusContext';
import { hasFeature } from '../../utils/capabilities';
import { writeElsewhereFold } from '../../utils/prefs';
import { kindEntryOf, rowKeyOf, searchRowOwner, searchRowShape } from '../../utils/searchRow';
import DateRange from '../common/DateRange';

const EXCLUDE_CLASS = 'bg-danger bg-opacity-25 text-decoration-line-through';
const NEUTRAL_CLASS = 'bg-secondary bg-opacity-25';

export const LIST_ID = 'navbar-search-list';

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

const FilterGroups = ({ binding, search, live, onClear }) => {
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
        <span>{t('search.activeFilters', { count: activeFilterCount(binding, search) })}</span>
        <span className="flex-grow-1" />
        {binding.action ? <PanelAction action={binding.action} live={live} /> : null}
        <button type="button" className="btn btn-link btn-sm p-0" onClick={onClear}>
          {t('search.clearFilters')}
        </button>
      </div>
    </>
  );
};

FilterGroups.propTypes = {
  binding: navbarSearchBindingShape.isRequired,
  search: PropTypes.object.isRequired,
  live: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

/**
 * The name of a kind: its first owner's label, else the kind itself.
 *
 * @param {Function} t - The translator
 * @param {Object} kinds - The kind table
 * @param {string} kind - The kind
 * @returns {string} The label
 */
export const kindLabel = (t, kinds, kind) =>
  t(kindEntryOf(kinds, kind)?.labelKey || `search.kinds.${kind}`, { defaultValue: kind });

/**
 * The name of the field a result matched on: its owner's label for the
 * field, else the shared one, else the field itself.
 *
 * @param {Function} t - The translator
 * @param {Object|null} entry - The result's owner
 * @param {Object} row - The result
 * @returns {string} The label
 */
export const matchedLabel = (t, entry, row) => {
  const key = entry?.matched?.[row.matched];
  return key ? t(key) : t(`search.matched.${row.matched}`, { defaultValue: row.matched });
};

const titleSpans = row => {
  const hit = row.highlight[row.matched];
  return hit && hit.text === row.title && Array.isArray(hit.spans) ? hit.spans : [];
};

const piecesOf = (text, spans) => {
  const pieces = [];
  let at = 0;
  spans.forEach(([start, end]) => {
    if (start >= at) {
      pieces.push({ text: text.slice(at, start), hit: false, at });
      pieces.push({ text: text.slice(start, end), hit: true, at: start });
      at = end;
    }
  });
  pieces.push({ text: text.slice(at), hit: false, at });
  return pieces.filter(piece => piece.text !== '');
};

/**
 * A result's title with the letters the query matched marked.
 */
export const HighlightedTitle = ({ row }) => (
  <>
    {piecesOf(row.title, titleSpans(row)).map(piece => {
      const Tag = piece.hit ? 'mark' : 'span';
      return <Tag key={piece.at}>{piece.text}</Tag>;
    })}
  </>
);

HighlightedTitle.propTypes = {
  row: searchRowShape.isRequired,
};

/**
 * The id of a result's element in the list, the target of the box's
 * `aria-activedescendant`.
 *
 * @param {string} key - The result's key from `rowKeyOf`
 * @returns {string} The id
 */
export const optionIdOf = key => `search-option-${key.replace(/[^A-Za-z0-9_-]/gu, '_')}`;

const SEARCH_KINDS = [
  'organization',
  'item',
  'version',
  'provider',
  'architecture',
  'artifact',
  'user',
  'application',
  'identity-provider',
  'terms',
  'notification',
  'session',
  'login',
  'registration',
  'blocked-address',
];

const KIND_ICONS = {
  organization: FaBuilding,
  item: FaCube,
  version: FaTag,
  provider: FaServer,
  architecture: FaMicrochip,
  artifact: FaFile,
  user: FaUser,
  application: FaWindowMaximize,
  'identity-provider': FaIdBadge,
  terms: FaFileContract,
  notification: FaBell,
  session: FaDesktop,
  login: FaRightToBracket,
  registration: FaUserPlus,
  'blocked-address': FaBan,
};

const LEVEL_OF_KIND = {
  version: 'versions',
  provider: 'providers',
  architecture: 'architectures',
  artifact: 'architectures',
};

const collectionOfRow = (row, collections) =>
  collections.find(collection => collection.key === row.collection) || null;

const levelLabel = (t, kind, collection, kinds) => {
  const level = collection?.levels?.[LEVEL_OF_KIND[kind]];
  if (level) {
    return t(level.labelKey);
  }
  return SEARCH_KINDS.includes(kind)
    ? t(`search.kinds.${kind}`, { defaultValue: kind })
    : kindLabel(t, kinds, kind);
};

const kindOrderOf = (kind, kinds) => {
  const at = SEARCH_KINDS.indexOf(kind);
  return at >= 0 ? at : SEARCH_KINDS.length + Object.keys(kinds).indexOf(kind);
};

const groupRows = (rows, collections, kinds) => {
  const groups = new Map();
  rows.forEach(row => {
    const key = `${row.collection || ''}:${row.kind}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        collection: collectionOfRow(row, collections),
        kind: row.kind,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  });
  const order = group => [
    group.collection ? collections.indexOf(group.collection) : -1,
    kindOrderOf(group.kind, kinds),
  ];
  return [...groups.values()].sort((a, b) => {
    const [left, right] = [order(a), order(b)];
    return left[0] - right[0] || left[1] - right[1];
  });
};

const GlyphIcon = ({ icon: Icon }) => <Icon aria-hidden />;

GlyphIcon.propTypes = {
  icon: PropTypes.elementType.isRequired,
};

const KindGlyph = ({ kind, collection = null, kinds, row }) => (
  <GlyphIcon
    icon={
      collection?.icon ||
      KIND_ICONS[kind] ||
      kindEntryOf(kinds, kind)?.icon?.(row) ||
      FaCircleQuestion
    }
  />
);

KindGlyph.propTypes = {
  kind: PropTypes.string.isRequired,
  collection: PropTypes.object,
  kinds: PropTypes.object.isRequired,
  row: searchRowShape.isRequired,
};

const groupIdOf = group => `search-group-${group.key.replace(/[^A-Za-z0-9_-]/gu, '_')}`;

const GroupHeading = ({ group, kinds }) => {
  const { t } = useTranslation();
  return (
    <div id={groupIdOf(group)} className="navbar-search-results-group">
      <KindGlyph
        kind={group.kind}
        collection={group.collection}
        kinds={kinds}
        row={group.rows[0]}
      />
      {group.collection ? `${t(group.collection.labelKey)} · ` : ''}
      {levelLabel(t, group.kind, group.collection, kinds)}
    </div>
  );
};

GroupHeading.propTypes = {
  group: PropTypes.shape({
    key: PropTypes.string.isRequired,
    kind: PropTypes.string.isRequired,
    collection: PropTypes.object,
    rows: PropTypes.arrayOf(searchRowShape).isRequired,
  }).isRequired,
  kinds: PropTypes.object.isRequired,
};

/**
 * The results the list draws, in its order: one group per collection then
 * kind, the groups in the order of the mounted collections and then of
 * the kinds, the catalog's and the identity provider's kinds first and
 * every other kind in the kind table's order.
 *
 * @param {Array<Object>} rows - The merged results of the run
 * @param {Array<Object>} collections - The mounted collection definitions
 * @param {Object<string, Array<Object>>} kinds - The kind table
 * @returns {Array<Object>} The results in list order
 */
export const optionOrder = (rows, collections, kinds) =>
  groupRows(rows, collections, kinds).flatMap(group => group.rows);

/**
 * The route of the results page for a run, its query, kinds and scope.
 *
 * @param {Object} run - The run
 * @returns {string} The route
 */
export const allPath = run => {
  const params = new URLSearchParams({ q: run.query });
  if (run.kinds.length > 0) {
    params.set('kinds', run.kinds.join(','));
  }
  if (run.scope) {
    params.set('scope', run.scope);
  }
  return `/search?${params.toString()}`;
};

const ResultBody = ({ entry, row, collection = null, kinds }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="navbar-search-result-glyph">
        <KindGlyph kind={row.kind} collection={collection} kinds={kinds} row={row} />
      </span>
      <span className="navbar-search-result-title">{row.title}</span>
      <span className="navbar-search-result-subtitle">{row.subtitle}</span>
      <span className="badge bg-secondary badge-xs">{matchedLabel(t, entry, row)}</span>
    </>
  );
};

ResultBody.propTypes = {
  entry: PropTypes.object,
  row: searchRowShape.isRequired,
  collection: PropTypes.object,
  kinds: PropTypes.object.isRequired,
};

const ResultRow = ({ kinds, collection = null, query, row, active, onPick, onKeyDown }) => {
  const id = optionIdOf(rowKeyOf(row));
  const { entry, to } = searchRowOwner(row, kinds, query);
  if (row.command) {
    return (
      <button
        id={id}
        type="button"
        role="option"
        aria-selected={active}
        className="navbar-search-result btn btn-link text-start w-100"
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          onPick();
          row.command();
        }}
        onKeyDown={onKeyDown}
      >
        <ResultBody entry={entry} row={row} collection={collection} kinds={kinds} />
      </button>
    );
  }
  if (!to) {
    return (
      <div
        id={id}
        role="option"
        aria-selected={active}
        aria-disabled
        className="navbar-search-result"
      >
        <ResultBody entry={entry} row={row} collection={collection} kinds={kinds} />
      </div>
    );
  }
  return (
    <Link
      id={id}
      to={to}
      role="option"
      aria-selected={active}
      className="navbar-search-result"
      onMouseDown={event => event.preventDefault()}
      onClick={onPick}
      onKeyDown={onKeyDown}
    >
      <ResultBody entry={entry} row={row} collection={collection} kinds={kinds} />
    </Link>
  );
};

ResultRow.propTypes = {
  kinds: PropTypes.object.isRequired,
  collection: PropTypes.object,
  query: PropTypes.string.isRequired,
  row: searchRowShape.isRequired,
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

const moveFocus = ({ listRef, direction, onEscape }) => {
  const links = [...(listRef.current?.querySelectorAll('a') || [])];
  const index = links.indexOf(document.activeElement);
  const next = index + direction;
  if (next < 0) {
    onEscape();
    return;
  }
  links[Math.min(next, links.length - 1)]?.focus();
};

const useActiveInView = activeId => {
  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId]);
};

/**
 * The results of the one run under the navbar, the listbox the box's
 * input controls: one group per collection then kind, headed by the
 * collection's icon and name and the kind's name in that collection,
 * each row the collection's icon or the kind's glyph, the title, a muted subtitle and the field
 * matched as a badge, a link to the route the kind table builds, a button
 * that runs a command row, or text for a row no owner places; the row of
 * `activeKey` drawn highlighted and scrolled into view. Arrow keys on a
 * focused link move focus between the links, and Escape or ArrowUp on the
 * first hands control back through `onEscape`.
 */
const SearchResults = ({
  kinds,
  collections,
  query,
  rows,
  activeKey,
  listRef,
  onPick,
  onEscape,
}) => {
  const { t } = useTranslation();
  useActiveInView(activeKey ? optionIdOf(activeKey) : '');
  const onKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus({ listRef, direction: event.key === 'ArrowDown' ? 1 : -1, onEscape });
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    }
  };
  return (
    <div
      ref={listRef}
      id={LIST_ID}
      role="listbox"
      aria-label={t('search.results', { count: rows.length })}
      className="navbar-search-results"
    >
      {groupRows(rows, collections, kinds).map(group => (
        <div key={group.key} role="group" aria-labelledby={groupIdOf(group)}>
          <GroupHeading group={group} kinds={kinds} />
          {group.rows.map(row => (
            <ResultRow
              key={rowKeyOf(row)}
              kinds={kinds}
              collection={group.collection}
              query={query}
              row={row}
              active={rowKeyOf(row) === activeKey}
              onPick={onPick}
              onKeyDown={onKeyDown}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

SearchResults.propTypes = {
  kinds: PropTypes.object.isRequired,
  collections: PropTypes.array.isRequired,
  query: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(searchRowShape).isRequired,
  activeKey: PropTypes.string.isRequired,
  listRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onPick: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
};

const countText = count => `${count.value}${count.relation === 'gte' ? '+' : ''}`;

const chipShape = PropTypes.shape({
  scope: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

/**
 * The scope a search is narrowed to, a removable chip.
 */
export const ScopeChip = ({ chip, onDrop }) => {
  const { t } = useTranslation();
  return (
    <span className="badge rounded-pill text-bg-secondary d-inline-flex align-items-center gap-1">
      {chip.label}
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-reset"
        onClick={onDrop}
        aria-label={t('search.scope.remove', { scope: chip.label })}
      >
        <FaXmark aria-hidden />
      </button>
    </span>
  );
};

ScopeChip.propTypes = {
  chip: chipShape.isRequired,
  onDrop: PropTypes.func.isRequired,
};

const totalOf = run => Object.values(run.counts).reduce((sum, count) => sum + count.value, 0);

const sourceLabel = (source, appName) => source.label || appName;

const StatusLine = ({ run, appName }) => {
  const { t } = useTranslation();
  const parts = [t('search.status.results', { count: totalOf(run) })];
  if (run.pending.length > 0) {
    parts.push(t('search.status.pending', { count: run.pending.length }));
  }
  run.failed.forEach(source =>
    parts.push(t('search.status.failed', { host: sourceLabel(source, appName) }))
  );
  return (
    <div role="status" className="visually-hidden">
      {parts.join(', ')}
    </div>
  );
};

StatusLine.propTypes = {
  run: PropTypes.object.isRequired,
  appName: PropTypes.string.isRequired,
};

const RunRows = ({ context, onPick, onEscape }) => {
  const { t } = useTranslation();
  const { appSearch, run, resultsRef } = context;
  if (run.rows.length === 0 && run.pending.length > 0) {
    return (
      <div className="navbar-search-app-note d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" role="status" />
        {t('search.loading')}
      </div>
    );
  }
  if (run.rows.length === 0) {
    return <div className="navbar-search-app-note">{t('search.noHits')}</div>;
  }
  const total = totalOf(run);
  return (
    <>
      <SearchResults
        kinds={appSearch.kinds}
        collections={appSearch.collections}
        query={run.query}
        rows={run.rows}
        activeKey={context.activeKey}
        listRef={resultsRef}
        onPick={onPick}
        onEscape={onEscape}
      />
      {total > run.rows.length ? (
        <Link
          to={allPath(run)}
          className="btn btn-link btn-sm p-0 align-self-start"
          onClick={onPick}
        >
          {t('search.showAll', { count: total })}
        </Link>
      ) : null}
    </>
  );
};

RunRows.propTypes = {
  context: PropTypes.object.isRequired,
  onPick: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
};

const SearchGroups = ({ context }) => {
  const { t } = useTranslation();
  const { appSearch, run, chip, dropChip, pinned, setPinned } = context;
  if (context.paged) {
    return null;
  }
  const kinds = Object.keys(run.counts);
  const counted = run.active && (kinds.length >= 2 || Boolean(pinned));
  return (
    <>
      {chip ? (
        <FilterGroup
          group={{
            key: 'search-scope',
            label: t('search.scope.label'),
            entries: { [chip.scope]: null },
            activeSet: new Set([chip.scope]),
            activeClass: 'text-bg-secondary',
            labelFor: () => chip.label,
            onToggle: dropChip,
          }}
        />
      ) : null}
      {counted ? (
        <FilterGroup
          group={{
            key: 'search-kinds',
            label: t('search.results', { count: totalOf(run) }),
            entries: Object.fromEntries(kinds.map(kind => [kind, null])),
            activeSet: new Set(pinned ? [pinned] : []),
            activeClass: 'bg-primary',
            labelFor: kind =>
              `${kindLabel(t, appSearch.kinds, kind)} (${countText(run.counts[kind])})`,
            onToggle: kind => setPinned(pinned === kind ? '' : kind),
          }}
        />
      ) : null}
    </>
  );
};

SearchGroups.propTypes = {
  context: PropTypes.object.isRequired,
};

const AppBody = ({ context, onPick, onEscape }) => {
  const status = useStatus();
  const { run } = context;
  if (!run.active) {
    return null;
  }
  return (
    <>
      <StatusLine run={run} appName={status.brand.name} />
      <RunRows context={context} onPick={onPick} onEscape={onEscape} />
    </>
  );
};

AppBody.propTypes = {
  context: PropTypes.object.isRequired,
  onPick: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
};

const AppSection = ({ context, bound }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { inputRef, setExpanded, setPanelOpen, setAppQuery, setPinned, setActiveKey } = context;
  const { folded, setFolded, setEverywhere } = context;
  const onPick = () => {
    setPanelOpen(false);
    setExpanded(false);
    setAppQuery('');
    setPinned('');
    setActiveKey('');
    setEverywhere(false);
  };
  const toggleFold = () => {
    const next = !folded;
    writeElsewhereFold(next);
    setFolded(next);
  };
  return (
    <div className="navbar-search-app">
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-reset text-decoration-none d-flex align-items-center gap-2 w-100"
        onClick={toggleFold}
        aria-expanded={!folded}
      >
        <span className="navbar-search-group-label flex-grow-1 text-start">
          {t(bound ? 'search.elsewhere' : 'search.inApp', { app: status.brand.name })}
        </span>
        <span className="section-card-chevron">
          {folded ? <FaChevronRight aria-hidden /> : <FaChevronDown aria-hidden />}
        </span>
      </button>
      {folded ? null : (
        <AppBody context={context} onPick={onPick} onEscape={() => inputRef.current?.focus()} />
      )}
    </div>
  );
};

AppSection.propTypes = {
  context: PropTypes.object.isRequired,
  bound: PropTypes.bool.isRequired,
};

/**
 * The band under the navbar, drawn only while the host lists the `search`
 * feature token, the same gate as the box: the page's filter groups while
 * the gear is on and the box searches this app, a `toggle` or `select` group as one row of pills and a
 * `date-range` group as the shared `DateRange` with its presets, the
 * page's registered action at the foot beside Clear filters; while the
 * gear is on, the route's scope chip as one row of one pill that drops it
 * and the run's count pills as one row, a pill per kind; and the
 * app-wide results of the one run for the text in the box, headed
 * "Elsewhere in the app" beside a page binding and "In the app" without
 * one, that heading a fold button (kept in local storage) so the results
 * can be put away while the filter band stays open; over the results a
 * status region
 * announcing the results and the hosts still searching, and after them
 * the link to the results page while the run counts more than the list
 * draws.
 */
export const NavbarSearchPanel = () => {
  const status = useStatus();
  const context = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(context?.store);

  if (!context || !hasFeature(status, 'search')) {
    return null;
  }

  const open = context.panelOpen && hasPanel(binding);
  const filters = open && !context.everywhere;
  const app = context.expanded && context.appQuery.trim().length > 0;

  if (!filters && !app) {
    return null;
  }

  return (
    <div className="navbar-search-panel w-100">
      {filters ? (
        <FilterGroups
          binding={binding}
          search={context}
          live={() => context.store.get() || binding}
          onClear={() => {
            (context.store.get() || binding).onClearFilters();
            context.setPinned('');
            context.dropChip();
          }}
        />
      ) : null}
      {open ? <SearchGroups context={context} /> : null}
      {app ? <AppSection context={context} bound={Boolean(binding)} /> : null}
    </div>
  );
};
