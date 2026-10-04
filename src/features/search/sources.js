import { FaRegFileLines } from 'react-icons/fa6';

import { hasFeature } from '../../utils/capabilities';
import { localAnswer, searchAnswerOf, searchParamsOf, searchRowOf } from '../../utils/searchRow';
import { matchFields, subsequenceMatch } from '../../utils/searchScore';

import { searchAt } from './api/search';

const pageGlyph = () => FaRegFileLines;

/**
 * The search feature's kinds: `page`, the sidebar's pages and the
 * commands the mounted features publish, answered in the browser; a page routes
 * to itself and a command runs where it is picked.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = status =>
  hasFeature(status, 'search')
    ? [
        {
          kind: 'page',
          feature: 'search',
          token: 'search',
          locators: ['id'],
          route: row => (row.command ? '' : row.id),
          icon: pageGlyph,
          labelKey: 'search.kinds.page',
          matched: {},
          facets: [],
        },
      ]
    : [];

/**
 * The serving backend's search source, null while the status names no
 * search path.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Object|null} The source
 */
export const servingSource = status => {
  const path = status.search?.path || '';
  if (!hasFeature(status, 'search') || !path) {
    return null;
  }
  return {
    key: 'serving',
    host: '',
    label: '',
    kinds: Array.isArray(status.search.kinds) ? status.search.kinds : [],
    local: false,
    search: (query, request) =>
      searchAt(path, searchParamsOf(query, request), request.signal).then(data =>
        searchAnswerOf(data, '')
      ),
  };
};

const orgOf = item => item.organization?.name || '';

const itemFields = item => [
  { field: 'name', text: item.name },
  { field: 'label', text: item.label || '' },
  { field: 'description', text: item.description || '' },
  { field: 'repository', text: item.extras?.repo || item.links?.repo || '' },
  { field: 'org', text: orgOf(item) },
];

const artifactRows = (collection, item, version, query) =>
  (version.artifacts || []).flatMap(artifact => {
    const match = matchFields([{ field: 'name', text: artifact.name }], query);
    if (!match) {
      return [];
    }
    return [
      searchRowOf(
        {
          kind: 'artifact',
          id: `${collection.key}/${orgOf(item)}/${item.name}/${version.version}/${artifact.name}`,
          collection: collection.key,
          org: orgOf(item),
          name: item.name,
          version: version.version,
          anchor: artifact.name,
          title: artifact.name,
          subtitle: `${item.label || item.name} ${version.version}`,
          ...match,
        },
        ''
      ),
    ];
  });

const organizationRows = (items, query) =>
  [...new Set(items.map(orgOf).filter(Boolean))].flatMap(org => {
    const match = matchFields([{ field: 'name', text: org }], query);
    return match
      ? [searchRowOf({ kind: 'organization', id: org, org, name: org, title: org, ...match }, '')]
      : [];
  });

const itemRow = (collection, item, match) =>
  searchRowOf(
    {
      kind: 'item',
      id: `${collection.key}/${item.organization?.name || ''}/${item.name}`,
      collection: collection.key,
      org: item.organization?.name || '',
      name: item.name,
      title: item.label || item.name,
      subtitle: item.organization?.name || '',
      ...match,
    },
    ''
  );

const versionRows = (collection, item, query) =>
  (collection.hasVersions ? item.versions || [] : []).flatMap(version => {
    const match = matchFields([{ field: 'version', text: version.version }], query);
    const artifacts = artifactRows(collection, item, version, query);
    if (!match) {
      return artifacts;
    }
    return [
      ...artifacts,
      searchRowOf(
        {
          kind: 'version',
          id: `${collection.key}/${item.organization?.name || ''}/${item.name}/${version.version}`,
          collection: collection.key,
          org: item.organization?.name || '',
          name: item.name,
          version: version.version,
          title: `${item.label || item.name} ${version.version}`,
          subtitle: item.organization?.name || '',
          ...match,
        },
        ''
      ),
    ];
  });

const collectionRows = (collection, items, query) =>
  items.flatMap(item => {
    const match = matchFields(itemFields(item), query);
    return [
      ...(match ? [itemRow(collection, item, match)] : []),
      ...versionRows(collection, item, query),
    ];
  });

const catalogRows = (lists, query) => {
  const rows = lists.flatMap(list => list.rows);
  const organizations = organizationRows(
    lists.flatMap(list => list.items),
    query
  );
  return [...organizations, ...rows];
};

const itemsOf = collection => collection.adapter.listAll().catch(() => []);

/**
 * The catalog's search source over the rows its collections' adapters
 * hold merged: organizations, items by name, label, description,
 * repository and organization, versions and artifact names; null while
 * the serving backend names its own search path or no collection is
 * mounted.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Array<Object>} collections - The mounted collection definitions
 * @returns {Object|null} The source
 */
export const catalogSource = (status, collections) => {
  if (!hasFeature(status, 'search') || status.search?.path || collections.length === 0) {
    return null;
  }
  return {
    key: 'catalog',
    host: '',
    label: '',
    kinds: ['organization', 'item', 'version', 'artifact'],
    local: false,
    search: (query, request) =>
      Promise.all(
        collections.map(collection =>
          itemsOf(collection).then(items => ({
            items,
            rows: collectionRows(collection, items, query),
          }))
        )
      ).then(lists => localAnswer(catalogRows(lists, query), { ...request, query })),
  };
};

const pageEntries = groups =>
  groups.flatMap(group =>
    (group.sections || []).flatMap(section =>
      section.items.flatMap(item => [
        { group, item },
        ...(item.children || []).map(child => ({ group, item: child })),
      ])
    )
  );

/**
 * The search source of the sidebar's pages under the `page` kind, matched
 * by their label's letters in order, answered in the browser.
 *
 * @param {Array<Object>} groups - The folded sidebar groups
 * @param {Function} t - The translator
 * @returns {Object} The source
 */
export const pageSource = (groups, t) => {
  const pages = pageEntries(groups)
    .filter(({ item }) => item.to && !item.external)
    .map(({ group, item }) => ({
      to: item.to,
      title: item.label || t(item.labelKey),
      subtitle: group.labelKey ? t(group.labelKey) : '',
    }));
  const match = (query, request) =>
    localAnswer(
      pages.flatMap(page => {
        const hit = subsequenceMatch(page.title, query);
        if (!hit) {
          return [];
        }
        return [
          searchRowOf(
            { kind: 'page', id: page.to, title: page.title, subtitle: page.subtitle, ...hit },
            ''
          ),
        ];
      }),
      { ...request, query }
    );
  return {
    key: 'page',
    host: '',
    label: '',
    kinds: ['page'],
    local: true,
    match,
    search: (query, request) => Promise.resolve(match(query, request)),
  };
};
