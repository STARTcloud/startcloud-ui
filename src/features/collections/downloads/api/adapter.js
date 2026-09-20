import { fetchOrganization, logoFor, withLogos } from '../../../../lib/organizations';
import { accessOf, countOf, sumCounts } from '../../../../utils/itemShape';

import { api } from './downloads';

const rows = data => (Array.isArray(data) ? data : []);

const latestReleaseOf = versions =>
  versions
    .map(version => version.createdAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

const fileArtifact = entry => ({
  name: entry.key,
  ...accessOf(entry),
  fileName: entry.file_name || '',
  fileSize: entry.file_size || 0,
  checksum: entry.checksum || '',
  checksumType: entry.checksum_type || '',
  downloadUrl: '',
  downloadCount: countOf(entry.download_count),
  kind: entry.kind || '',
  platform: entry.platform || '',
  architecture: entry.architecture || '',
  language: entry.language || '',
  variant: entry.variant || '',
  createdAt: entry.created_at || null,
  updatedAt: entry.updated_at || null,
});

const patchSummary = entry => {
  const architectures = rows(entry.files).map(fileArtifact);
  return {
    name: entry.name,
    description: entry.description || '',
    ...accessOf(entry),
    kind: entry.kind || null,
    releasedAt: entry.released_at || null,
    notesUrl: entry.notes_url || null,
    createdAt: entry.created_at || null,
    updatedAt: entry.updated_at || null,
    downloads: sumCounts(architectures.map(architecture => architecture.downloadCount)),
    architectures,
    extras: { raw: entry },
  };
};

const releaseSummary = entry => {
  const providers = rows(entry.patches).map(patchSummary);
  return {
    version: entry.version_number,
    ...accessOf(entry),
    createdAt: entry.created_at || null,
    updatedAt: entry.updated_at || null,
    downloads: sumCounts(providers.map(provider => provider.downloads)),
    description: entry.description || '',
    releaseNotes: entry.release_notes ?? null,
    deprecated: Boolean(entry.deprecated),
    deprecationReason: entry.deprecation_reason ?? null,
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
    icon: entry.icon_url || '',
    artwork: '',
    isPublic: Boolean(entry.is_public),
    guestAccess: Boolean(entry.guest_access),
    published: Boolean(entry.published),
    createdAt: entry.created_at || null,
    updatedAt: entry.updated_at || null,
    latestReleaseAt: latestReleaseOf(versions),
    downloads: countOf(entry.download_count),
    os: { label: entry.family || '', iconUrl: '' },
    family: entry.family || '',
    vendor: entry.vendor || '',
    metadata: null,
    readme: null,
    links: { docs: entry.docs_url || '', notes: entry.notes_url || '' },
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
    api.downloads.watches().then(data => new Set(rows(data).map(entry => entry.download_id))),
  toggle: (item, next) =>
    next
      ? api.downloads.watch(item.organization.name, item.name)
      : api.downloads.unwatch(item.organization.name, item.name),
};

/**
 * One bulk call for one level of one scope: `POST …/bulk { action, names }`
 * on the level's own route, the answer `{ processed, skipped, errors }`; a
 * product's releases stand where a box's versions do, its patches where the
 * providers do and its files where the architectures do; `recursive`
 * rides an opening verb the cascade check ticked, lifting every row
 * beneath to the same word.
 *
 * @param {string} level - `items`, `versions`, `providers` or `architectures`
 * @param {string} action - The action the level's `bulk` definition names
 * @param {Array<string>} names - The picked rows' names
 * @param {Object} scope - The levels above: `org`, `name`, `version`, `provider`
 * @param {boolean} [recursive] - Whether the opening verb runs to every row beneath
 * @returns {Promise<Object>} The bulk answer
 */
const bulk = (level, action, names, scope, recursive = false) => {
  const body = recursive ? { action, names, recursive: true } : { action, names };
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
  pending: api.pending,
  bulk,
  watches,
};
