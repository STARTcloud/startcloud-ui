import { log } from '../../../../lib/logger';
import { fetchOrganization, logoFor, withLogos } from '../../../../lib/organizations';
import { getDistroIconUrl, getOsDisplayName } from '../../../../utils/distroIcons';
import { accessOf, countOf, sumCounts } from '../../../../utils/itemShape';
import { readDeprecated, readDeprecationReason, readReleaseNotes } from '../utils/versionFields';

import { api } from './boxes';

const { origin } = window.location;

const rows = data => (Array.isArray(data) ? data : []);

const fileDownloads = files => sumCounts((files || []).map(file => file.download_count));

const architectureSummary = architecture => ({
  name: architecture.name,
  ...accessOf(architecture),
  downloadCount: fileDownloads(architecture.files),
});

const architectureDownloads = architectures =>
  sumCounts(architectures.map(architecture => architecture.downloadCount));

const providerSummary = provider => {
  const architectures = (provider.architectures || []).map(architectureSummary);
  return {
    name: provider.name,
    description: provider.description || '',
    ...accessOf(provider),
    createdAt: provider.created_at || null,
    updatedAt: provider.updated_at || null,
    downloads: architectureDownloads(architectures),
    architectures,
  };
};

const versionSummary = version => {
  const providers = (version.providers || []).map(providerSummary);
  return {
    version: version.version_number,
    ...accessOf(version),
    createdAt: version.created_at || null,
    updatedAt: version.updated_at || null,
    downloads: sumCounts(providers.map(provider => provider.downloads)),
    description: version.description || '',
    releaseNotes: readReleaseNotes(version),
    deprecated: readDeprecated(version),
    deprecationReason: readDeprecationReason(version),
    providers,
    artifacts: [],
    extras: { raw: version },
  };
};

const latestReleaseOf = versions =>
  versions
    .map(version => version.createdAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

const boxItem = (box, orgName, logo) => ({
  id: box.id ?? `${orgName}/${box.name}`,
  organization: { name: orgName, logo: logo || '' },
  name: box.name,
  label: box.name,
  description: box.short_description || box.description || '',
  icon: '',
  artwork: box.artwork ? `${origin}/api/organization/${orgName}/box/${box.name}/artwork` : '',
  isPublic: Boolean(box.is_public),
  guestAccess: Boolean(box.guest_access),
  published: Boolean(box.published),
  createdAt: box.created_at || null,
  updatedAt: box.updated_at || null,
  latestReleaseAt: latestReleaseOf((box.versions || []).map(versionSummary)),
  downloads: countOf(box.download_count),
  os: {
    label: getOsDisplayName(box.metadata),
    iconUrl: getDistroIconUrl(box.metadata?.distro) || '',
  },
  metadata: box.metadata || null,
  readme: box.readme || null,
  links: {
    repo: box.github_repo ? `https://github.com/${box.github_repo}` : '',
    pipeline: box.cicd_url || '',
    badge:
      box.github_repo && box.workflow_file
        ? `https://github.com/${box.github_repo}/actions/workflows/${box.workflow_file}/badge.svg`
        : '',
  },
  extras: { raw: box },
  versions: (box.versions || []).map(versionSummary),
});

const providersOf = (org, name, version) =>
  api.providers
    .list(org, name, version)
    .then(data => rows(data).map(providerSummary))
    .catch(error => {
      log.api.error('Error fetching providers', { versionNumber: version, error: error.message });
      return [];
    });

const getItemSummary = async (org, name) => {
  const box = await api.boxes.get(org, name);
  return boxItem(box, org, await logoFor({ name: org, ...(box.organization || {}) }));
};

const getItem = async (org, name) => {
  const [item, versionRows] = await Promise.all([
    getItemSummary(org, name),
    api.versions.list(org, name),
  ]);
  const versions = await Promise.all(
    rows(versionRows).map(async version => ({
      ...versionSummary(version),
      providers: await providersOf(org, name, version.version_number),
    }))
  );
  return { ...item, versions };
};

const downloadLink = (org, name, version, provider, architecture) =>
  api.files.downloadLink(org, name, version, provider, architecture).catch(() => '');

const getVersion = async (org, name, version) => {
  const [versionData, providerRows] = await Promise.all([
    api.versions.get(org, name, version),
    api.providers.list(org, name, version),
  ]);
  const providers = await Promise.all(
    rows(providerRows).map(async provider => {
      const architectures = await api.architectures
        .list(org, name, version, provider.name)
        .then(rows)
        .catch(() => []);
      const summaries = architectures.map(architectureSummary);
      return {
        name: provider.name,
        description: provider.description || '',
        ...accessOf(provider),
        createdAt: provider.created_at || null,
        updatedAt: provider.updated_at || null,
        downloads: architectureDownloads(summaries),
        architectures: await Promise.all(
          architectures.map(async (architecture, index) => ({
            name: architecture.name,
            ...accessOf(architecture),
            defaultBox: Boolean(architecture.default_box),
            downloadUrl: await downloadLink(org, name, version, provider.name, architecture.name),
            downloadCount: summaries[index].downloadCount,
          }))
        ),
        extras: { raw: provider },
      };
    })
  );
  return { ...versionSummary(versionData), providers };
};

const architectureDetail = async (org, name, version, provider, architecture) => {
  try {
    const [info, url] = await Promise.all([
      api.files.info(org, name, version, provider, architecture.name),
      api.files.downloadLink(org, name, version, provider, architecture.name),
    ]);
    return {
      name: architecture.name,
      ...accessOf(architecture),
      defaultBox: Boolean(architecture.default_box),
      fileName: info.file_name || '',
      fileSize: info.file_size || 0,
      checksum: info.checksum || '',
      checksumType: info.checksum_type || '',
      downloadUrl: url,
      downloadCount: countOf(info.download_count),
      createdAt: info.created_at || null,
      updatedAt: info.updated_at || null,
    };
  } catch (error) {
    log.api.error('Error fetching file info', {
      architectureName: architecture.name,
      error: error.message,
    });
    return {
      name: architecture.name,
      ...accessOf(architecture),
      defaultBox: Boolean(architecture.default_box),
      fileName: '',
      fileSize: 0,
      checksum: '',
      checksumType: '',
      downloadUrl: '',
      downloadCount: null,
      createdAt: null,
      updatedAt: null,
    };
  }
};

const getProvider = async (org, name, version, provider) => {
  const [providerData, architectureRows] = await Promise.all([
    api.providers.get(org, name, version, provider),
    api.architectures.list(org, name, version, provider),
  ]);
  const architectures = await Promise.all(
    rows(architectureRows).map(architecture =>
      architectureDetail(org, name, version, provider, architecture)
    )
  );
  return {
    name: providerData.name,
    description: providerData.description || '',
    ...accessOf(providerData),
    architectures,
    extras: { raw: providerData },
  };
};

const deleteArchitectureCascade = (org, name, version, provider, architecture) =>
  api.files
    .remove(org, name, version, provider, architecture)
    .then(() => api.architectures.remove(org, name, version, provider, architecture));

export const deleteProviderCascade = (org, name, version, provider) =>
  api.architectures
    .list(org, name, version, provider)
    .then(data =>
      Promise.all(
        rows(data).map(architecture =>
          deleteArchitectureCascade(org, name, version, provider, architecture.name)
        )
      )
    )
    .then(() => api.providers.remove(org, name, version, provider));

export const deleteVersionCascade = (org, name, version) =>
  api.providers
    .list(org, name, version)
    .then(data =>
      Promise.all(
        rows(data).map(provider => deleteProviderCascade(org, name, version, provider.name))
      )
    )
    .then(() => api.versions.remove(org, name, version));

const watches = {
  list: () => api.boxes.watches().then(data => new Set(rows(data).map(entry => entry.box_id))),
  toggle: (item, next) =>
    next
      ? api.boxes.watch(item.organization.name, item.name)
      : api.boxes.unwatch(item.organization.name, item.name),
};

/**
 * One bulk call for one level of one scope: `POST …/bulk { action, names }`
 * on the level's own route, the answer `{ processed, skipped, errors }`;
 * `recursive` rides an opening verb the cascade check ticked, lifting
 * every row beneath to the same word.
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

export const boxesAdapter = {
  listAll: () => api.boxes.discover().then(data => withLogos(rows(data), 'Unknown', boxItem)),
  listOrg: org => api.boxes.list(org).then(data => withLogos(rows(data), org, boxItem)),
  getItem,
  getItemSummary,
  getVersion,
  getProvider,
  getOrganization: fetchOrganization,
  bulk,
  watches,
};
