import { fetchOrganization, withLogos } from '../../organizations/api/logos';

import { api } from './api';

const rows = data => (Array.isArray(data) ? data : []);

const isoItem = (iso, orgName, logo) => ({
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
  downloads: iso.downloadCount || 0,
  os: null,
  metadata: null,
  readme: null,
  artifact: {
    fileName: iso.fileName || '',
    fileSize: iso.size || 0,
    checksum: iso.checksum || '',
    checksumType: iso.checksumType || '',
    downloadUrl: '',
    downloadCount: iso.downloadCount || 0,
  },
  links: {},
  extras: { raw: iso },
  versions: [],
});

const isoList = org => api.isos.list(org).then(data => withLogos(rows(data), org, isoItem));

const getIso = async (org, name) => {
  const items = await isoList(org);
  const item = items.find(entry => entry.name === name);
  if (!item) {
    throw new Error(`${org}/${name} not found`);
  }
  return item;
};

const isoWatches = {
  list: () => api.isos.watches().then(data => new Set(rows(data).map(entry => entry.isoId))),
  toggle: (item, next) =>
    next
      ? api.isos.watch(item.organization.name, item.extras.raw.id)
      : api.isos.unwatch(item.organization.name, item.extras.raw.id),
};

export const isosAdapter = {
  listAll: () => api.isos.discover().then(data => withLogos(rows(data), 'Unknown', isoItem)),
  listOrg: isoList,
  getItem: getIso,
  getItemSummary: getIso,
  getOrganization: fetchOrganization,
  watches: isoWatches,
};
