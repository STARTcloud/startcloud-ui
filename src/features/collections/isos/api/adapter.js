import { fetchOrganization, logoFor, withLogos } from '../../../../lib/organizations';
import { getDistroIconUrl, getOsDisplayName } from '../../../../utils/distroIcons';
import { countOf, sumCounts } from '../../../../utils/itemShape';

import { api } from './isos';

const rows = data => (Array.isArray(data) ? data : []);

const sumDownloads = entries => sumCounts(entries.map(entry => entry.downloads));

const latestReleaseOf = versions =>
  versions
    .map(version => version.createdAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

const fileArtifact = file => ({
  name: file.architecture,
  fileName: file.file_name || '',
  fileSize: file.file_size || 0,
  checksum: file.checksum || '',
  checksumType: file.checksum_type || '',
  downloadUrl: '',
  downloadCount: countOf(file.download_count),
  createdAt: file.created_at || null,
  updatedAt: file.updated_at || null,
});

const versionSummary = version => {
  const artifacts = (version.files || []).map(fileArtifact);
  return {
    version: version.version_number,
    createdAt: version.created_at || null,
    updatedAt: version.updated_at || null,
    downloads: sumCounts(artifacts.map(artifact => artifact.downloadCount)),
    description: version.description || '',
    releaseNotes: version.release_notes ?? null,
    deprecated: Boolean(version.deprecated),
    deprecationReason: version.deprecation_reason ?? null,
    providers: [],
    artifacts,
    extras: { raw: version },
  };
};

const isoItem = (iso, orgName, logo) => {
  const versions = (iso.versions || []).map(versionSummary);
  return {
    id: iso.id,
    organization: { name: orgName, logo: logo || '' },
    name: iso.name,
    label: iso.name,
    description: iso.description || '',
    icon: '',
    artwork: '',
    isPublic: Boolean(iso.is_public),
    guestAccess: Boolean(iso.guest_access),
    published: Boolean(iso.published),
    createdAt: iso.created_at || null,
    updatedAt: iso.updated_at || null,
    latestReleaseAt: latestReleaseOf(versions),
    downloads: sumDownloads(versions),
    os: {
      label: getOsDisplayName(iso.metadata),
      iconUrl: getDistroIconUrl(iso.metadata?.distro) || '',
    },
    metadata: iso.metadata || null,
    readme: null,
    links: {},
    extras: { raw: iso },
    versions,
  };
};

const getItemSummary = async (org, name) => {
  const iso = await api.isos.get(org, name);
  return isoItem(iso, org, await logoFor({ name: org, ...(iso.organization || {}) }));
};

const getItem = async (org, name) => {
  const [item, versionRows] = await Promise.all([
    getItemSummary(org, name),
    api.versions.list(org, name),
  ]);
  const versions = rows(versionRows).map(versionSummary);
  return { ...item, versions, downloads: sumDownloads(versions) };
};

const downloadLink = (org, name, version, architecture) =>
  api.files.downloadLink(org, name, version, architecture).catch(() => '');

const getVersion = async (org, name, version) => {
  const entry = versionSummary(await api.versions.get(org, name, version));
  const artifacts = await Promise.all(
    entry.artifacts.map(async artifact => ({
      ...artifact,
      downloadUrl: await downloadLink(org, name, version, artifact.name),
    }))
  );
  return { ...entry, artifacts };
};

const getProvider = async (org, name, version, architecture) => {
  const entry = await getVersion(org, name, version);
  const artifact = entry.artifacts.find(candidate => candidate.name === architecture);
  if (!artifact) {
    throw new Error(`${org}/${name}@${version}/${architecture} not found`);
  }
  return { name: artifact.name, description: '', architectures: [artifact] };
};

export const deleteVersionCascade = (org, name, version) =>
  api.versions
    .get(org, name, version)
    .then(data =>
      Promise.all(
        rows(data.files).map(file => api.files.remove(org, name, version, file.architecture))
      )
    )
    .then(() => api.versions.remove(org, name, version));

const watches = {
  list: () => api.isos.watches().then(data => new Set(rows(data).map(entry => entry.iso_id))),
  toggle: (item, next) =>
    next
      ? api.isos.watch(item.organization.name, item.name)
      : api.isos.unwatch(item.organization.name, item.name),
};

/**
 * One bulk call for one level of one scope: `POST …/bulk { action, names }`
 * on the level's own route, the answer `{ processed, skipped, errors }`; an
 * ISO has no provider level, so its architectures hang off the version.
 *
 * @param {string} level - `items`, `versions` or `architectures`
 * @param {string} action - The action the level's `bulk` definition names
 * @param {Array<string>} names - The picked rows' names
 * @param {Object} scope - The levels above: `org`, `name`, `version`
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
  return api.bulk.architectures(scope.org, scope.name, scope.version, body);
};

export const isosAdapter = {
  listAll: () => api.isos.discover().then(data => withLogos(rows(data), 'Unknown', isoItem)),
  listOrg: org => api.isos.list(org).then(data => withLogos(rows(data), org, isoItem)),
  getItem,
  getItemSummary,
  getVersion,
  getProvider,
  getOrganization: fetchOrganization,
  bulk,
  watches,
};
