import { log } from '../../../lib/logger';
import { fetchOrganization, logoFor, withLogos } from '../../organizations/api/logos';

import { api } from './api';
import { getDistroIconUrl, getOsDisplayName } from './distroIcons';
import { readDeprecated, readDeprecationReason, readReleaseNotes } from './versionFields';

const { origin } = window.location;

const rows = data => (Array.isArray(data) ? data : []);

const fileDownloads = files =>
  (files || []).reduce((sum, file) => sum + (file.downloadCount || 0), 0);

const architectureSummary = architecture => ({
  name: architecture.name,
  downloadCount: fileDownloads(architecture.files),
});

const providerSummary = provider => ({
  name: provider.name,
  description: provider.description || '',
  architectures: (provider.architectures || []).map(architectureSummary),
});

const versionSummary = version => ({
  version: version.versionNumber,
  createdAt: version.createdAt || null,
  updatedAt: version.updatedAt || null,
  description: version.description || '',
  releaseNotes: readReleaseNotes(version),
  deprecated: readDeprecated(version),
  deprecationReason: readDeprecationReason(version),
  providers: (version.providers || []).map(providerSummary),
  artifacts: [],
  extras: { raw: version },
});

const boxItem = (box, orgName, logo) => ({
  id: box.id ?? `${orgName}/${box.name}`,
  organization: { name: orgName, logo: logo || '' },
  name: box.name,
  label: box.name,
  description: box.shortDescription || box.description || '',
  icon: '',
  artwork: box.artwork ? `${origin}/api/organization/${orgName}/box/${box.name}/artwork` : '',
  isPublic: Boolean(box.isPublic),
  published: Boolean(box.published),
  createdAt: box.createdAt || null,
  updatedAt: box.updatedAt || null,
  latestReleaseAt: null,
  downloads: box.downloadCount || 0,
  os: {
    label: getOsDisplayName(box.metadata),
    iconUrl: getDistroIconUrl(box.metadata?.distro) || '',
  },
  metadata: box.metadata || null,
  readme: box.readme || null,
  artifact: null,
  links: {
    repo: box.githubRepo ? `https://github.com/${box.githubRepo}` : '',
    pipeline: box.cicdUrl || '',
    badge:
      box.githubRepo && box.workflowFile
        ? `https://github.com/${box.githubRepo}/actions/workflows/${box.workflowFile}/badge.svg`
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
      providers: await providersOf(org, name, version.versionNumber),
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
      return {
        name: provider.name,
        description: provider.description || '',
        architectures: await Promise.all(
          architectures.map(async architecture => ({
            name: architecture.name,
            defaultBox: Boolean(architecture.defaultBox),
            downloadUrl: await downloadLink(org, name, version, provider.name, architecture.name),
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
      defaultBox: Boolean(architecture.defaultBox),
      fileName: info.fileName || '',
      fileSize: info.fileSize || 0,
      checksum: info.checksum || '',
      checksumType: info.checksumType || '',
      downloadUrl: url,
      downloadCount: info.downloadCount || 0,
    };
  } catch (error) {
    log.api.error('Error fetching file info', {
      architectureName: architecture.name,
      error: error.message,
    });
    return {
      name: architecture.name,
      defaultBox: Boolean(architecture.defaultBox),
      fileName: '',
      fileSize: 0,
      checksum: '',
      checksumType: '',
      downloadUrl: '',
      downloadCount: 0,
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
  list: () => api.boxes.watches().then(data => new Set(rows(data).map(entry => entry.boxId))),
  toggle: (item, next) =>
    next
      ? api.boxes.watch(item.organization.name, item.name)
      : api.boxes.unwatch(item.organization.name, item.name),
};

export const boxesAdapter = {
  listAll: () => api.boxes.discover().then(data => withLogos(rows(data), 'Unknown', boxItem)),
  listOrg: org => api.boxes.list(org).then(data => withLogos(rows(data), org, boxItem)),
  getItem,
  getItemSummary,
  getVersion,
  getProvider,
  getOrganization: fetchOrganization,
  watches,
};
