import PropTypes from 'prop-types';

import { compareRowsFor, textOf } from './searchScore';

export const MIN_QUERY = 2;

export const searchRowShape = PropTypes.shape({
  kind: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  host: PropTypes.string,
  collection: PropTypes.string,
  org: PropTypes.string,
  name: PropTypes.string,
  version: PropTypes.string,
  provider: PropTypes.string,
  architecture: PropTypes.string,
  anchor: PropTypes.string,
  source: PropTypes.object,
  score: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  matched: PropTypes.string,
  highlight: PropTypes.object,
  facets: PropTypes.object,
});

export const searchKindShape = PropTypes.shape({
  kind: PropTypes.string.isRequired,
  feature: PropTypes.string.isRequired,
  token: PropTypes.string,
  locators: PropTypes.arrayOf(PropTypes.string).isRequired,
  route: PropTypes.func,
  icon: PropTypes.func,
  labelKey: PropTypes.string.isRequired,
  matched: PropTypes.objectOf(PropTypes.string),
  facets: PropTypes.arrayOf(PropTypes.string),
});

const STRING_MEMBERS = [
  'id',
  'org',
  'name',
  'version',
  'provider',
  'architecture',
  'anchor',
  'title',
  'subtitle',
  'matched',
];

/**
 * One result as the UI holds it: every string member a string, the host
 * it was asked of stamped on it.
 *
 * @param {Object} row - The result as a source answered it
 * @param {string} host - The host the request went to, empty for the serving backend
 * @returns {Object} The row
 */
export const searchRowOf = (row, host) => ({
  ...row,
  ...Object.fromEntries(STRING_MEMBERS.map(member => [member, textOf(row[member])])),
  kind: textOf(row.kind),
  collection: row.collection || null,
  source: row.source || null,
  score: typeof row.score === 'number' ? row.score : 0,
  highlight: row.highlight || {},
  facets: row.facets || {},
  host,
});

/**
 * An answer as the UI holds it: the results stamped with the host, the
 * counts by kind and the cursor.
 *
 * @param {Object} data - `{ counts, results, next }` as a source answered it
 * @param {string} host - The host the request went to, empty for the serving backend
 * @returns {{ counts: Object, results: Array<Object>, next: string|null }} The answer
 */
export const searchAnswerOf = (data, host) => ({
  counts: data?.counts && typeof data.counts === 'object' ? data.counts : {},
  results: (Array.isArray(data?.results) ? data.results : []).map(row => searchRowOf(row, host)),
  next: typeof data?.next === 'string' && data.next !== '' ? data.next : null,
});

/**
 * The key one result is held by: its kind, its host and its id.
 *
 * @param {Object} row - The result
 * @returns {string} The key
 */
export const rowKeyOf = row => [row.kind, row.host || '', row.id].join('|');

const inScope = (row, scope) => {
  const [kind, ...rest] = scope.split(':');
  const value = rest.join(':');
  if (kind === 'org') {
    return row.org === value;
  }
  if (kind === 'collection') {
    return row.collection === value;
  }
  return true;
};

/**
 * The answer of a source that matches rows the browser holds: the rows of
 * the kinds and scope asked for, sorted, each kind cut to `limit`, every
 * count exact.
 *
 * @param {Array<Object>} rows - The matched rows, each from `searchRowOf`
 * @param {Object} request - `{ query, kinds, scope, limit }`
 * @returns {{ counts: Object, results: Array<Object>, next: null }} The answer
 */
export const localAnswer = (rows, { query, kinds = [], scope = '', limit = 0 }) => {
  const wanted = rows
    .filter(row => kinds.length === 0 || kinds.includes(row.kind))
    .filter(row => !scope || inScope(row, scope))
    .sort(compareRowsFor(query));
  const counts = {};
  const results = [];
  wanted.forEach(row => {
    const value = (counts[row.kind]?.value || 0) + 1;
    counts[row.kind] = { value, relation: 'eq' };
    if (!limit || value <= limit) {
      results.push(row);
    }
  });
  return { counts, results, next: null };
};

/**
 * The query parameters of one search request, the empty ones left out.
 *
 * @param {string} query - The text searched for
 * @param {Object} request - `{ kinds, scope, limit, after }`
 * @returns {Object} The parameters
 */
export const searchParamsOf = (query, { kinds = [], scope = '', limit = 0, after = '' }) =>
  Object.fromEntries(
    Object.entries({ q: query, kinds: kinds.join(','), scope, limit, after }).filter(
      ([, value]) => value !== '' && value !== 0
    )
  );

/**
 * Whether the failure of a request was its abort.
 *
 * @param {Error} error - The failure
 * @returns {boolean} True for an abort
 */
export const isAbortError = error =>
  error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

const TYPE = /^type:(?<value>\S+)$/u;
const ORG = /^org:(?<value>\S+)$/u;

/**
 * The text typed in the box read as the request: `type:<kind>[,<kind>]`
 * as the kinds, `org:<name>` as the scope, the rest as the query.
 *
 * @param {string} typed - The text in the box
 * @returns {{ text: string, kinds: Array<string>, scope: string }} The request
 */
export const parseQuery = typed => {
  const kinds = [];
  let scope = '';
  const rest = [];
  typed
    .split(/\s+/u)
    .filter(Boolean)
    .forEach(word => {
      const type = TYPE.exec(word);
      const org = ORG.exec(word);
      if (type) {
        kinds.push(...type.groups.value.split(',').filter(Boolean));
      } else if (org) {
        scope = `org:${org.groups.value}`;
      } else {
        rest.push(word);
      }
    });
  return { text: rest.join(' '), kinds, scope };
};

const HOSTS_FEATURE = 'hosts';

const ownersOf = (row, kinds) => {
  const entries = kinds[row.kind] || [];
  if (!row.host) {
    return entries;
  }
  return [
    ...entries.filter(entry => entry.feature === HOSTS_FEATURE),
    ...entries.filter(entry => entry.feature !== HOSTS_FEATURE),
  ];
};

/**
 * The kind table's entry that owns one result: the first owner of its
 * kind whose route places it, a row carrying a host asking the hosts
 * feature first; the kind's first owner when none places it.
 *
 * @param {Object} row - The result
 * @param {Object<string, Array<Object>>} kinds - The kind table, the owners of each kind in fold order
 * @param {string} [query] - The text searched for
 * @returns {{ entry: Object|null, to: string }} The owner and the route, empty for none
 */
export const searchRowOwner = (row, kinds, query = '') => {
  const owners = ownersOf(row, kinds);
  for (const entry of owners) {
    const to = entry.route ? entry.route(row, query) || '' : '';
    if (to) {
      return { entry, to };
    }
  }
  return { entry: owners[0] || null, to: '' };
};

/**
 * The route one result opens, empty for a row no owner places.
 *
 * @param {Object} row - The result
 * @param {Object<string, Array<Object>>} kinds - The kind table
 * @param {string} [query] - The text searched for
 * @returns {string} The route
 */
export const searchRowPath = (row, kinds, query = '') => searchRowOwner(row, kinds, query).to;

/**
 * The first owner of a kind in the kind table.
 *
 * @param {Object<string, Array<Object>>} kinds - The kind table
 * @param {string} kind - The kind
 * @returns {Object|null} The entry
 */
export const kindEntryOf = (kinds, kind) => (kinds[kind] || [])[0] || null;

/**
 * The route of a row on a page that lists it: the page's route with the
 * query searched for as the page's `q`, any further parameters, and the
 * row's anchor as the hash.
 *
 * @param {string} path - The page's route
 * @param {Object} row - The result
 * @param {string} query - The text searched for
 * @param {Object} [params] - Further query parameters
 * @returns {string} The route
 */
export const arrivalPath = (path, row, query, params = {}) => {
  const search = new URLSearchParams({ ...params, ...(query ? { q: query } : {}) }).toString();
  const hash = row.anchor ? `#${encodeURIComponent(row.anchor)}` : '';
  return `${path}${search ? `?${search}` : ''}${hash}`;
};
