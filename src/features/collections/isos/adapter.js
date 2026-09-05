import { fetchOrganization, logoFor, withLogos } from '../../organizations/api/logos';
import { getDistroIconUrl, getOsDisplayName } from '../boxes/distroIcons';

import { api } from './api';

const rows = data => (Array.isArray(data) ? data : []);

const sumDownloads = entries => entries.reduce((sum, entry) => sum + (entry.downloads || 0), 0);

const fileArtifact = file => ({
  name: file.architecture,
  fileName: file.fileName || '',
  fileSize: file.fileSize || 0,
  checksum: file.checksum || '',
  checksumType: file.checksumType || '',
  downloadUrl: '',
  downloadCount: file.downloadCount || 0,
  createdAt: file.createdAt || null,
  updatedAt: file.updatedAt || null,
});

const versionSummary = version => {
  const artifacts = (version.files || []).map(fileArtifact);
  return {
    version: version.versionNumber,
    createdAt: version.createdAt || null,
    updatedAt: version.updatedAt || null,
    downloads: artifacts.reduce((sum, artifact) => sum + artifact.downloadCount, 0),
    description: version.description || '',
    releaseNotes: version.releaseNotes ?? null,
    deprecated: Boolean(version.deprecated),
    deprecationReason: version.deprecationReason ?? null,
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
    isPublic: Boolean(iso.isPublic),
    published: Boolean(iso.published),
    createdAt: iso.createdAt || null,
    updatedAt: iso.updatedAt || null,
    latestReleaseAt: null,
    downloads: sumDownloads(versions),
    os: {
      label: getOsDisplayName(iso.metadata),
      iconUrl: getDistroIconUrl(iso.metadata?.distro) || '',
    },
    metadata: iso.metadata || null,
    readme: null,
    artifact: null,
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
  list: () => api.isos.watches().then(data => new Set(rows(data).map(entry => entry.isoId))),
  toggle: (item, next) =>
    next
      ? api.isos.watch(item.organization.name, item.name)
      : api.isos.unwatch(item.organization.name, item.name),
};

export const isosAdapter = {
  listAll: () => api.isos.discover().then(data => withLogos(rows(data), 'Unknown', isoItem)),
  listOrg: org => api.isos.list(org).then(data => withLogos(rows(data), org, isoItem)),
  getItem,
  getItemSummary,
  getVersion,
  getOrganization: fetchOrganization,
  watches,
};
