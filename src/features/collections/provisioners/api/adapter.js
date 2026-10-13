import { api } from './provisioners';

let catalogPromise = null;
let memberships = [];
let personKey = '';

/**
 * The person's memberships, the logos and descriptions a private entry's
 * organization draws with, and the person the session holds; another
 * person drops the cached catalog read, because the folded document the
 * worker answers follows the token, while a session whose memberships
 * arrive after its restore keeps the one read.
 *
 * @param {Array<Object>} list - The session's organizations
 * @param {string} person - The session's user id, empty for none
 */
export const setMemberships = (list, person) => {
  memberships = list;
  if (person !== personKey) {
    personKey = person;
    catalogPromise = null;
  }
};

export const resetCatalogCache = () => {
  catalogPromise = null;
};

const membershipFor = name => memberships.find(org => org.name === name) || null;

const sameUuid = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

const membershipByUuid = uuid => memberships.find(org => sameUuid(org.uuid, uuid)) || null;

const fetchCatalog = () => {
  catalogPromise ||= Promise.all([
    api.catalog.public(),
    api.catalog.health().catch(() => null),
  ]).then(([catalog, health]) => ({ catalog, health }));
  return catalogPromise;
};

const ownerOf = repo => repo.split('/')[0];
const ownerLogo = owner => `https://github.com/${owner}.png?size=64`;
const artifactName = url => url.split('/').pop();

const latestReleasedAt = versions =>
  versions
    .map(entry => entry.released_at)
    .filter(Boolean)
    .sort()
    .pop() || null;

const providerCoverage = versions => {
  const measured = Object.values(versions || {}).filter(entry => Array.isArray(entry?.providers));
  const counts = {};
  measured.forEach(entry => {
    entry.providers.forEach(provider => {
      counts[provider] = (counts[provider] || 0) + 1;
    });
  });
  return { counts, total: measured.length };
};

const objectOf = value => (value && typeof value === 'object' ? value : {});

const versionExtrasOf = measured => ({
  tier: typeof measured?.tier === 'string' ? measured.tier : '',
  rules: objectOf(measured?.rules),
  failedRules: Array.isArray(measured?.failed_rules) ? measured.failed_rules : [],
  boxes: objectOf(measured?.boxes),
});

const toVersion = (entry, health) => {
  const measured = health.versions?.[entry.version];
  return {
    version: entry.version,
    createdAt: entry.released_at || null,
    description: '',
    releaseNotes: null,
    deprecated: false,
    deprecationReason: null,
    providers: (measured?.providers || []).map(name => ({
      name,
      description: '',
      architectures: [],
    })),
    artifacts: entry.artifacts.map(artifact => ({
      name: artifactName(artifact.url),
      checksum: artifact.checksum,
      checksumType: artifact.checksum_type,
      downloadUrl: artifact.url,
    })),
    extras: versionExtrasOf(measured),
  };
};

const ownerOrganizationOf = provisioner => {
  const owner = ownerOf(provisioner.repo);
  return { name: owner, logo: ownerLogo(owner) };
};

const privateOrganizationOf = entry => {
  const membership = membershipByUuid(entry.uuid);
  return {
    name: entry.name,
    uuid: entry.uuid,
    logo: membership?.logo || ownerLogo(entry.name),
    description: membership?.description || '',
  };
};

const isPrivateEntry = provisioner =>
  Boolean(provisioner.organization) &&
  typeof provisioner.organization === 'object' &&
  typeof provisioner.organization.uuid === 'string';

const toItem = (provisioner, healthEntry) => {
  const health = healthEntry?.health || {};
  const presentation = healthEntry?.presentation || {};
  const isPrivate = isPrivateEntry(provisioner);
  const organization = isPrivate
    ? privateOrganizationOf(provisioner.organization)
    : ownerOrganizationOf(provisioner);
  return {
    id: `${organization.name}/${provisioner.name}`,
    organization,
    name: provisioner.name,
    label: presentation.label || provisioner.name,
    description: provisioner.description || '',
    icon: presentation.icon || '',
    artwork: '',
    isPublic: !isPrivate,
    published: null,
    createdAt: null,
    latestReleaseAt: health.latest_release_at || latestReleasedAt(provisioner.versions),
    downloads: typeof health.downloads === 'number' ? health.downloads : null,
    os: null,
    metadata: null,
    readme: null,
    links: {
      repo: `https://github.com/${provisioner.repo}`,
      homepage: presentation.homepage || '',
      issues: `https://github.com/${provisioner.repo}/issues/new`,
    },
    extras: {
      repo: provisioner.repo,
      tier: healthEntry?.tier || 'unrated',
      rules: objectOf(healthEntry?.rules),
      failedRules: healthEntry?.failed_rules || [],
      artifactsOk: health.artifacts_ok !== false,
      sidecarsOk: health.sidecars_ok !== false,
      coverage: providerCoverage(health.versions),
    },
    versions: provisioner.versions.map(entry => toVersion(entry, health)),
  };
};

/**
 * The items of one catalog document and its health document, the shape
 * every provisioners listing draws: a provisioner carrying `organization`
 * a private item of that organization, its uuid and name from the entry,
 * its logo and description from the matching membership where one is held
 * and the owner logo otherwise; a provisioner carrying none a public item
 * under the owner of its repository.
 *
 * @param {{ catalog: Object|null, health: Object|null }} data - The catalog and its health
 * @returns {Array<Object>} The items
 */
export const catalogItemsFrom = ({ catalog, health }) =>
  (catalog?.provisioners || []).map(provisioner =>
    toItem(provisioner, health?.provisioners?.[provisioner.name])
  );

const listAll = async () => catalogItemsFrom(await fetchCatalog());

const listOrg = async org => (await listAll()).filter(item => item.organization.name === org);

const getItem = async (org, name) => {
  const items = await listOrg(org);
  const item = items.find(entry => entry.name === name);
  if (!item) {
    throw new Error(`${org}/${name} not found`);
  }
  return item;
};

const getVersion = async (org, name, version) => {
  const item = await getItem(org, name);
  const entry = item.versions.find(candidate => candidate.version === version);
  if (!entry) {
    throw new Error(`${org}/${name}@${version} not found`);
  }
  return entry;
};

const getProvider = async (org, name, version, provider) => {
  const entry = await getVersion(org, name, version);
  return { name: provider, description: '', architectures: entry.artifacts };
};

const organizationOf = (org, membership) =>
  membership
    ? {
        name: org,
        uuid: membership.uuid,
        logo: membership.logo || ownerLogo(org),
        description: membership.description || '',
      }
    : { name: org, logo: ownerLogo(org) };

const getOrganization = org => Promise.resolve(organizationOf(org, membershipFor(org)));

const watches = {
  list: async () => new Set((await api.watches.list()).items || []),
  toggle: async (item, next) => {
    if (next) {
      await api.watches.add(item.id);
      return;
    }
    await api.watches.remove(item.id);
  },
};

export const catalogAdapter = {
  listAll,
  listOrg,
  getItem,
  getItemSummary: getItem,
  getVersion,
  getProvider,
  getOrganization,
  watches,
};
