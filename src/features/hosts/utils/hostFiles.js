import { artifactStatusOf } from './manageCatalog';
import { artifactVersionOf } from './roleFiles';

const text = value => (value === null || value === undefined ? '' : String(value));

const lower = value => text(value).toLowerCase();

const registryOf = row => (row?.registry && typeof row.registry === 'object' ? row.registry : null);

/**
 * One artifact row of a host as a file of the downloads collection, the
 * item shape every listing draws: its id, one empty organization for
 * every row so nothing groups by organization, the organization its
 * registry names as `vendor`, its file name as the name, the kind, platform, architecture,
 * language and variant of the registry or the row's own `file_type`, the
 * sha256 it is known by, the product, release and patch of the registry
 * or the role the row is cached under, the version the agent parsed, the
 * storage location, whether the bytes are on the host, the status word
 * of `artifactStatusOf`, and the row itself as `artifact` for every
 * write that takes the agent's row.
 *
 * @param {Object} row - The artifact row of `GET artifacts`
 * @returns {Object} The file item
 */
export const hostFileOf = row => {
  const registry = registryOf(row);
  const version = artifactVersionOf(row);
  const product = text(registry?.download || row.role);
  const vendor = text(registry?.organization);
  const status = artifactStatusOf(row);
  return {
    id: String(row.id),
    organization: { name: '', logo: '' },
    name: text(row.filename),
    label: '',
    description: '',
    icon: '',
    artwork: '',
    fileName: text(row.filename),
    fileSize: Number(row.size) || 0,
    checksum: text(row.expected_sha256 || row.checksum),
    checksumType: row.expected_sha256 || row.checksum ? 'sha256' : '',
    kind: text(registry?.kind || row.file_type),
    platform: text(registry?.platform),
    architecture: text(registry?.architecture),
    language: text(registry?.language),
    variant: text(registry?.variant),
    sourceUrl: text(row.source_url),
    product,
    family: product,
    vendor,
    release: text(registry?.release),
    patch: text(registry?.patch),
    version: version.full_version,
    role: text(row.role),
    location: text(row.storage_location?.name),
    locationId: text(row.storage_location_id ?? row.storage_location?.id),
    fileExists: row.file_exists !== false,
    source: text(row.source),
    status: status.key,
    statusTone: status.tone,
    statusValues: status.values,
    registry,
    artifact: row,
    links: {},
    extras: {},
    versions: [],
  };
};

/**
 * Every artifact row of a host as file items, in the order answered.
 *
 * @param {Array<Object>|null} rows - The artifact rows
 * @returns {Array<Object>} The file items
 */
export const hostFilesOf = rows =>
  (Array.isArray(rows) ? rows : []).filter(row => row && row.id !== undefined).map(hostFileOf);

/**
 * Whether a file item matches the navbar's query: its name, kind,
 * product, release, patch, version, role, location, vendor and platform.
 *
 * @param {Object} item - The file item
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when it matches
 */
export const matchesHostFile = (item, needle) =>
  [
    item.name,
    item.kind,
    item.product,
    item.release,
    item.patch,
    item.version,
    item.role,
    item.location,
    item.vendor,
    item.platform,
  ].some(value => lower(value).includes(needle));

const GROUP_PREFIX = 'host-files:';

const groupOf = (by, name) => ({ key: `${GROUP_PREFIX}${by}:${name}`, label: name, items: [] });

/**
 * The listing's groups by the field in force, `family`, the product the
 * file belongs to, or `vendor`, the organization its registry names: one
 * group per value in the order the items first carry it, the items
 * without the field last under one "Other" group.
 *
 * @param {Array<Object>} items - The file items, already sorted
 * @param {Function} t - The translator
 * @param {string} by - `family` or `vendor`
 * @returns {Array<Object>} The groups
 */
export const hostFileGroupsOf = (items, t, by) => {
  const groups = new Map();
  const rest = [];
  items.forEach(item => {
    const name = text(item[by]);
    if (!name) {
      rest.push(item);
      return;
    }
    if (!groups.has(name)) {
      groups.set(name, groupOf(by, name));
    }
    groups.get(name).items.push(item);
  });
  const own = [...groups.values()];
  return rest.length === 0
    ? own
    : [...own, { key: `${GROUP_PREFIX}${by}:`, label: t('pages.group.other'), items: rest }];
};

/**
 * The artifact ids of the file items named among `items`, the ids a bulk
 * delete sends for the names the listing picked.
 *
 * @param {Array<Object>} items - The file items held
 * @param {Array<string>} names - The picked names
 * @returns {Array<number|string>} The artifact ids
 */
export const artifactIdsOf = (items, names) =>
  items.filter(item => names.includes(item.name)).map(item => item.artifact.id);
