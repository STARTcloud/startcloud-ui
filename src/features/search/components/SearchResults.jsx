import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaCube, FaFile, FaMicrochip, FaServer, FaTag, FaUser } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { SEARCH_KINDS, collectionOfRow, searchRowPath, searchRowShape } from '../utils/searchRow';

const KIND_ICONS = {
  organization: FaBuilding,
  item: FaCube,
  version: FaTag,
  provider: FaServer,
  architecture: FaMicrochip,
  artifact: FaFile,
  user: FaUser,
};

const rowKey = row =>
  [row.kind, row.org, row.name, row.version, row.provider, row.architecture, row.matched].join(':');

const groupRows = (rows, collections) => {
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
    SEARCH_KINDS.indexOf(group.kind),
  ];
  return [...groups.values()].sort((a, b) => {
    const [left, right] = [order(a), order(b)];
    return left[0] - right[0] || left[1] - right[1];
  });
};

/**
 * The glyph a search row wears: its collection's icon when it has one, else
 * the glyph of its kind.
 */
export const KindGlyph = ({ kind, collection = null }) => {
  if (collection?.icon) {
    return collection.icon;
  }
  const Icon = KIND_ICONS[kind];
  return <Icon aria-hidden />;
};

KindGlyph.propTypes = {
  kind: PropTypes.oneOf(SEARCH_KINDS).isRequired,
  collection: PropTypes.object,
};

const GroupHeading = ({ group }) => {
  const { t } = useTranslation();
  return (
    <div className="navbar-search-results-group">
      <KindGlyph kind={group.kind} collection={group.collection} />
      {group.collection ? `${t(group.collection.labelKey)} · ` : ''}
      {t(`search.kinds.${group.kind}`)}
    </div>
  );
};

GroupHeading.propTypes = {
  group: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    collection: PropTypes.object,
  }).isRequired,
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

/**
 * The grouped list of app-wide search rows under the navbar: one group per
 * collection then kind, each row a link to the page the row names with its
 * glyph, title, muted subtitle and the matched field as a badge. Arrow keys
 * move focus between rows, Enter follows the focused row, Escape and
 * ArrowUp on the first row hand control back through `onEscape`.
 */
const SearchResults = ({ rows, collections, listRef, onPick, onEscape }) => {
  const { t } = useTranslation();
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
    <div ref={listRef} className="navbar-search-results">
      {groupRows(rows, collections).map(group => (
        <div key={group.key}>
          <GroupHeading group={group} />
          {group.rows.map(row => (
            <Link
              key={rowKey(row)}
              to={searchRowPath(row, collections)}
              className="navbar-search-result"
              onClick={onPick}
              onKeyDown={onKeyDown}
            >
              <span className="navbar-search-result-glyph">
                <KindGlyph kind={row.kind} collection={group.collection} />
              </span>
              <span className="navbar-search-result-title">{row.title}</span>
              <span className="navbar-search-result-subtitle">{row.subtitle}</span>
              <span className="badge bg-secondary badge-xs">
                {t(`search.matched.${row.matched}`, { defaultValue: row.matched })}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
};

SearchResults.propTypes = {
  rows: PropTypes.arrayOf(searchRowShape).isRequired,
  collections: PropTypes.array.isRequired,
  listRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onPick: PropTypes.func.isRequired,
  onEscape: PropTypes.func.isRequired,
};

export default SearchResults;
