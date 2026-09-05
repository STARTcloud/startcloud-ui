import { SEARCH_KINDS } from './searchRow';

const MIN_CHECKSUM_PREFIX = 6;

const text = value => {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' ? String(value) : '';
};

const includes = (value, needle) => text(value).toLowerCase().includes(needle);

const firstMatch = (fields, needle) => {
  const hit = fields.find(([, value]) => includes(value, needle));
  return hit ? hit[0] : '';
};

const checksumMatches = (checksum, needle) =>
  needle.length >= MIN_CHECKSUM_PREFIX && text(checksum).toLowerCase().startsWith(needle);

const fileMatched = (file, needle) => {
  if (includes(file.name, needle)) {
    return 'name';
  }
  return checksumMatches(file.checksum, needle) ? 'checksum' : '';
};

const subtitleOf = parts => parts.filter(Boolean).join(' · ');

const makeRow = ({
  kind,
  collection = null,
  org,
  name,
  version = '',
  provider = '',
  architecture = '',
  title,
  subtitle,
  matched,
}) => ({ kind, collection, org, name, version, provider, architecture, title, subtitle, matched });

const itemFields = item => [
  ['name', item.name],
  ['label', item.label],
  ['description', item.description],
  ['os', item.os?.label],
  ...Object.entries(item.metadata || {})
    .filter(([key]) => key !== 'password')
    .map(([, value]) => ['metadata', value]),
];

const versionFields = version => [
  ['versionNumber', version.version],
  ['description', version.description],
  ['releaseNotes', version.releaseNotes],
  ['deprecationReason', version.deprecationReason],
];

const organizationRows = (entries, needle) => {
  const seen = new Set();
  const rows = [];
  entries.forEach(({ items }) => {
    items.forEach(({ organization }) => {
      if (seen.has(organization.name)) {
        return;
      }
      seen.add(organization.name);
      const matched = firstMatch(
        [
          ['name', organization.name],
          ['description', organization.description],
        ],
        needle
      );
      if (matched) {
        rows.push(
          makeRow({
            kind: 'organization',
            org: organization.name,
            name: organization.name,
            title: organization.displayName || organization.name,
            subtitle: organization.name,
            matched,
          })
        );
      }
    });
  });
  return rows;
};

const architectureRows = ({ base, provider, needle }) =>
  (provider.architectures || []).flatMap(architecture => {
    const matched = fileMatched(architecture, needle);
    if (!matched) {
      return [];
    }
    return [
      makeRow({
        ...base,
        kind: 'architecture',
        provider: provider.name,
        architecture: architecture.name,
        title: `${base.name} ${base.version} ${provider.name} ${architecture.name}`,
        matched,
      }),
    ];
  });

const providerRows = ({ base, provider, needle }) => {
  const rows = [];
  if (includes(provider.name, needle)) {
    rows.push(
      makeRow({
        ...base,
        kind: 'provider',
        provider: provider.name,
        title: `${base.name} ${base.version} ${provider.name}`,
        matched: 'name',
      })
    );
  }
  return [...rows, ...architectureRows({ base, provider, needle })];
};

const artifactRows = ({ base, version, needle }) =>
  (version.artifacts || []).flatMap(artifact => {
    const matched = fileMatched(artifact, needle);
    if (!matched) {
      return [];
    }
    return [
      makeRow({
        ...base,
        kind: 'artifact',
        architecture: artifact.name,
        title: `${base.name} ${base.version} ${artifact.name}`,
        matched,
      }),
    ];
  });

const versionRows = ({ collection, item, version, needle }) => {
  const base = {
    collection: collection.key,
    org: item.organization.name,
    name: item.name,
    version: version.version,
    subtitle: subtitleOf([item.organization.name, collection.key, version.version]),
  };
  const rows = [];
  const matched = firstMatch(versionFields(version), needle);
  if (matched) {
    rows.push(
      makeRow({ ...base, kind: 'version', title: `${item.name} ${version.version}`, matched })
    );
  }
  (version.providers || []).forEach(provider => {
    rows.push(...providerRows({ base, provider, needle }));
  });
  return [...rows, ...artifactRows({ base, version, needle })];
};

const itemRows = ({ collection, item, needle }) => {
  const rows = [];
  const matched = firstMatch(itemFields(item), needle);
  if (matched) {
    rows.push(
      makeRow({
        kind: 'item',
        collection: collection.key,
        org: item.organization.name,
        name: item.name,
        title: item.label || item.name,
        subtitle: subtitleOf([item.organization.name, collection.key]),
        matched,
      })
    );
  }
  (item.versions || []).forEach(version => {
    rows.push(...versionRows({ collection, item, version, needle }));
  });
  return rows;
};

const limitKinds = (rows, limit) => {
  const results = [];
  const truncated = {};
  SEARCH_KINDS.forEach(kind => {
    const ofKind = rows.filter(row => row.kind === kind);
    results.push(...ofKind.slice(0, limit));
    if (ofKind.length > limit) {
      truncated[kind] = ofKind.length - limit;
    }
  });
  return { results, truncated };
};

const loadAll = collections =>
  Promise.all(
    collections
      .filter(collection => typeof collection.adapter.listAll === 'function')
      .map(collection =>
        collection.adapter
          .listAll()
          .then(items => ({ collection, items }))
          .catch(() => ({ collection, items: [] }))
      )
  );

/**
 * Searches the data the mounted collections already load, client-side:
 * every collection's `listAll()` once per call, the organizations behind
 * the items, the items themselves, their versions, providers,
 * architectures and artifacts, matching the fields the item shape carries
 * and checksums by a prefix of at least six characters. Answers the same
 * `{ query, results, truncated }` shape as a host's own search, at most
 * `limit` rows per kind.
 *
 * @param {Object} options
 * @param {Array<Object>} options.collections - The collections the host mounts
 * @param {string} options.query - The text to search for
 * @param {number} options.limit - How many rows per kind to answer
 * @returns {Promise<Object>} The answer
 */
export const searchLocal = ({ collections, query, limit }) => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return Promise.resolve({ query, results: [], truncated: {} });
  }
  return loadAll(collections).then(entries => {
    const rows = [
      ...organizationRows(entries, needle),
      ...entries.flatMap(({ collection, items }) =>
        items.flatMap(item => itemRows({ collection, item, needle }))
      ),
    ];
    return { query, ...limitKinds(rows, limit) };
  });
};
