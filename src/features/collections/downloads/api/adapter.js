import { fetchOrganization, logoFor, withLogos } from '../../../../lib/organizations';

import { api } from './downloads';

const rows = data => (Array.isArray(data) ? data : []);

const countOf = value => (typeof value === 'number' ? value : null);

const sumCounts = values => {
  const known = values.filter(value => typeof value === 'number');
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0);
};

const latestReleaseOf = versions =>
  versions
    .map(version => version.createdAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

const fileArtifact = entry => ({
  name: entry.key,
  fileName: entry.fileName || '',
  fileSize: entry.fileSize || 0,
  checksum: entry.checksum || '',
  checksumType: entry.checksumType || '',
  downloadUrl: '',
  downloadCount: countOf(entry.downloadCount),
  kind: entry.kind || '',
  platform: entry.platform || '',
  architecture: entry.architecture || '',
  language: entry.language || '',
  variant: entry.variant || '',
  createdAt: entry.createdAt || null,
  updatedAt: entry.updatedAt || null,
});

const patchSummary = entry => {
  const architectures = rows(entry.files).map(fileArtifact);
  return {
    name: entry.name,
    description: entry.description || '',
    kind: entry.kind || null,
    releasedAt: entry.releasedAt || null,
    notesUrl: entry.notesUrl || null,
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    downloads: sumCounts(architectures.map(architecture => architecture.downloadCount)),
    architectures,
    extras: { raw: entry },
  };
};

const releaseSummary = entry => {
  const providers = rows(entry.patches).map(patchSummary);
  return {
    version: entry.versionNumber,
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    downloads: sumCounts(providers.map(provider => provider.downloads)),
    description: entry.description || '',
    releaseNotes: entry.releaseNotes ?? null,
    deprecated: Boolean(entry.deprecated),
    deprecationReason: entry.deprecationReason ?? null,
    providers,
    artifacts: [],
    extras: { raw: entry },
  };
};

const downloadItem = (entry, orgName, logo) => {
  const versions = rows(entry.releases).map(releaseSummary);
  return {
    id: entry.id ?? `${orgName}/${entry.name}`,
    organization: { name: orgName, logo: logo || '' },
    name: entry.name,
    label: entry.name,
    description: entry.description || '',
    icon: entry.iconUrl || '',
    artwork: '',
    isPublic: Boolean(entry.isPublic),
    published: Boolean(entry.published),
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    latestReleaseAt: latestReleaseOf(versions),
    downloads: countOf(entry.downloadCount),
    os: { label: entry.family || '', iconUrl: '' },
    family: entry.family || '',
    vendor: entry.vendor || '',
    metadata: null,
    readme: null,
    links: { docs: entry.docsUrl || '', notes: entry.notesUrl || '' },
    extras: { raw: entry },
    versions,
  };
};

const getItemSummary = async (org, name) => {
  const entry = await api.downloads.get(org, name);
  return downloadItem(entry, org, await logoFor({ name: org, ...(entry.organization || {}) }));
};

const getItem = getItemSummary;

const getVersion = async (org, name, version) =>
  releaseSummary(await api.releases.get(org, name, version));

const linkFor = (org, name, version, patch, key) =>
  api.files.downloadLink(org, name, version, patch, key).catch(() => '');

const getProvider = async (org, name, version, patch) => {
  const entry = patchSummary(await api.patches.get(org, name, version, patch));
  const architectures = await Promise.all(
    entry.architectures.map(async architecture => ({
      ...architecture,
      downloadUrl: await linkFor(org, name, version, patch, architecture.name),
    }))
  );
  return { ...entry, architectures };
};

const watches = {
  list: () =>
    api.downloads.watches().then(data => new Set(rows(data).map(entry => entry.downloadId))),
  toggle: (item, next) =>
    next
      ? api.downloads.watch(item.organization.name, item.name)
      : api.downloads.unwatch(item.organization.name, item.name),
};

/**
 * One bulk call for one level of one scope: `POST …/bulk { action, names }`
 * on the level's own route, the answer `{ processed, skipped, errors }`; a
 * product's releases stand where a box's versions do, its patches where the
 * providers do and its files where the architectures do.
 *
 * @param {string} level - `items`, `versions`, `providers` or `architectures`
 * @param {string} action - The action the level's `bulk` definition names
 * @param {Array<string>} names - The picked rows' names
 * @param {Object} scope - The levels above: `org`, `name`, `version`, `provider`
 * @returns {Promise<Object>} The bulk answer
 */
const bulk = (level, action, names, scope) => {
  const body = { action, names };
  if (level === 'items') {
    return api.bulk.items(scope.org, body);
  }
  if (level === 'versions') {
    return api.bulk.versions(scope.org, scope.name, body);
  }
  if (level === 'providers') {
    return api.bulk.providers(scope.org, scope.name, scope.version, body);
  }
  return api.bulk.architectures(scope.org, scope.name, scope.version, scope.provider, body);
};

export const downloadsAdapter = {
  listAll: () =>
    api.downloads.discover().then(data => withLogos(rows(data), 'Unknown', downloadItem)),
  listOrg: org => api.downloads.list(org).then(data => withLogos(rows(data), org, downloadItem)),
  getItem,
  getItemSummary,
  getVersion,
  getProvider,
  getOrganization: fetchOrganization,
  bulk,
  watches,
};
