import { getDistroIconUrl, getOsDisplayName } from '../../../utils/distroIcons';

const organizationOf = box =>
  box?.user?.primaryOrganization?.name ||
  box?.organization?.name ||
  (typeof box?.organization === 'string' ? box.organization : '') ||
  box?.user?.username ||
  box?.owner ||
  '';

const versionNumberOf = version =>
  typeof version === 'string'
    ? version
    : version?.versionNumber || version?.version || version?.name || '';

const architecturesOf = versionRows => [
  ...new Set(
    versionRows.flatMap(version =>
      (Array.isArray(version?.providers) ? version.providers : []).flatMap(provider =>
        (Array.isArray(provider?.architectures) ? provider.architectures : [])
          .map(architecture => architecture?.name)
          .filter(Boolean)
      )
    )
  ),
];

const rowOf = box => {
  const organization = organizationOf(box);
  const boxName = box?.name || '';
  if (!boxName) {
    return null;
  }
  const versionRows = Array.isArray(box.versions) ? box.versions : [];
  return {
    value: organization ? `${organization}/${boxName}` : boxName,
    organization,
    boxName,
    versions: versionRows.map(versionNumberOf).filter(Boolean),
    architectures: architecturesOf(versionRows),
  };
};

const listOf = payload => {
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.boxes) && payload.boxes) ||
      (Array.isArray(payload?.data) && payload.data);
  return Array.isArray(list) ? list : [];
};

/**
 * The rows of the image picker from a registry's catalog, BoxVault's
 * discover answer as the agent relays it, filtered to what the host can
 * install: the bare array of boxes, or the same list under `boxes` or
 * `data`, each box read for its organization, its name, its versions and
 * the architectures its providers list; an entry without a name is
 * skipped.
 *
 * @param {Array|Object} payload - The catalog answer
 * @returns {Array<{ value: string, organization: string, boxName: string, versions: Array<string>, architectures: Array<string> }>} The rows
 */
export const flattenBoxCatalog = payload => listOf(payload).map(rowOf).filter(Boolean);

const dateOf = (entry, snake, camel) => entry?.[snake] || entry?.[camel] || null;

const accessOf = (entry, snake, camel) => {
  const value = entry?.[snake] ?? entry?.[camel];
  return typeof value === 'boolean' ? value : null;
};

const providerOf = provider => ({
  name: provider?.name || '',
  description: provider?.description || '',
  architectures: (Array.isArray(provider?.architectures) ? provider.architectures : [])
    .filter(architecture => architecture?.name)
    .map(architecture => ({ name: architecture.name })),
});

const versionOf = version => ({
  version: versionNumberOf(version),
  createdAt: dateOf(version, 'created_at', 'createdAt'),
  updatedAt: dateOf(version, 'updated_at', 'updatedAt'),
  description: typeof version === 'string' ? '' : version?.description || '',
  releaseNotes: null,
  deprecated: false,
  deprecationReason: null,
  providers: (Array.isArray(version?.providers) ? version.providers : [])
    .map(providerOf)
    .filter(provider => provider.name),
  artifacts: [],
});

const latestOf = versions =>
  versions
    .map(version => version.createdAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

const itemOf = box => {
  const organization = organizationOf(box);
  const name = box?.name || '';
  if (!name) {
    return null;
  }
  const versions = (Array.isArray(box.versions) ? box.versions : [])
    .map(versionOf)
    .filter(version => version.version);
  const isPublic = accessOf(box, 'is_public', 'isPublic');
  return {
    id: organization ? `${organization}/${name}` : name,
    organization: { name: organization, logo: '' },
    name,
    label: name,
    description: box.short_description || box.shortDescription || box.description || '',
    icon: '',
    artwork: '',
    isPublic,
    guestAccess: Boolean(accessOf(box, 'guest_access', 'guestAccess')),
    published: null,
    createdAt: dateOf(box, 'created_at', 'createdAt'),
    updatedAt: dateOf(box, 'updated_at', 'updatedAt'),
    latestReleaseAt: latestOf(versions),
    downloads: null,
    os: box.metadata
      ? {
          label: getOsDisplayName(box.metadata),
          iconUrl: getDistroIconUrl(box.metadata.distro) || '',
        }
      : null,
    metadata: box.metadata || null,
    readme: null,
    links: {},
    extras: { raw: box },
    versions,
  };
};

/**
 * The boxes of a registry's catalog as the item shape every boxes listing
 * draws, BoxVault's discover answer as the agent relays it under
 * `templates/remote/{source}`: the bare array of boxes, or the list under
 * `boxes` or `data`, each box its organization, its name as its label,
 * its description, its visibility where the answer carries one, its
 * versions newest first with their providers and architectures, no
 * download counts and no links; an entry without a name is skipped.
 *
 * @param {Array|Object} payload - The catalog answer
 * @returns {Array<Object>} The items
 */
export const remoteBoxItemsOf = payload => listOf(payload).map(itemOf).filter(Boolean);

/**
 * The architecture a pull of one version of a box asks for when nobody
 * picked one: the first architecture its providers list, empty while they
 * list none.
 *
 * @param {Object} item - A box of the item shape
 * @param {string} version - The version
 * @returns {string} The architecture
 */
export const firstArchitectureOf = (item, version) =>
  (item.versions.find(entry => entry.version === version)?.providers || []).flatMap(provider =>
    provider.architectures.map(architecture => architecture.name)
  )[0] || '';

const carriesId = source => typeof source?.id === 'string' && source.id !== '';

/**
 * The key of one row of `GET templates/sources`, the member each agent
 * answers it under: hyperweaver-agent's `id`, the segment of
 * `templates/remote/{source}` and the value of every `source_name`, and
 * the `name` of an agent whose rows carry no `id`.
 *
 * @param {Object} source - The source row
 * @returns {string} The key
 */
export const sourceKeyOf = source => (carriesId(source) ? source.id : source?.name || '');

/**
 * The words a source row is drawn with: the `name` of a row that carries
 * an `id`, its display name, and otherwise its `display_name` or its
 * `name`.
 *
 * @param {Object} source - The source row
 * @returns {string} The label
 */
export const sourceLabelOf = source =>
  carriesId(source) ? source.name || source.id : source?.display_name || source?.name || '';

/**
 * The display name a source row seeds the registry form with: the `name`
 * of a row that carries an `id`, else its `display_name`.
 *
 * @param {Object} source - The source row
 * @returns {string} The display name
 */
export const sourceDisplayNameOf = source =>
  carriesId(source) ? source.name || '' : source?.display_name || '';

/**
 * The registry a box is fetched from when the spec names none: the source
 * of `GET templates/sources` marked `default`, else the first, else null.
 *
 * @param {Array<Object>} sources - The sources
 * @returns {Object|null} The default source
 */
export const pickDefaultSource = sources => {
  const list = Array.isArray(sources) ? sources : [];
  return list.find(source => source?.default === true) || list[0] || null;
};
