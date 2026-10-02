const KIB = 1024;
const UNITS = ['B', 'K', 'M', 'G', 'T', 'P', 'E'];
const SIZE_UNITS = {
  '': 1,
  K: KIB,
  M: KIB ** 2,
  G: KIB ** 3,
  T: KIB ** 4,
  P: KIB ** 5,
  E: KIB ** 6,
};
const PERCENT = 100;
const CRITICAL_PERCENT = 90;
const FILLING_PERCENT = 75;
const DOWN_STATES = ['FAULTED', 'UNAVAIL', 'REMOVED', 'OFFLINE'];
const SHORT_NAME = 16;
const HEAD = 7;
const TAIL = 6;

const upper = value => String(value ?? '').toUpperCase();

/**
 * Lines of `key=value` as a properties object; a blank line and a line
 * without `=` are dropped.
 *
 * @param {string} text - The lines
 * @returns {Object<string, string>} The properties
 */
export const parsePropertyLines = text =>
  String(text ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.indexOf('=') > 0)
    .reduce((properties, line) => {
      const at = line.indexOf('=');
      properties[line.slice(0, at).trim()] = line.slice(at + 1).trim();
      return properties;
    }, {});

/**
 * The tone a zpool health is drawn in, hyperweaver-ui's: success for
 * ONLINE, warning for DEGRADED, danger for FAULTED, UNAVAIL, REMOVED and
 * OFFLINE, secondary for every other word.
 *
 * @param {string} health - The health word
 * @returns {string} The Bootstrap tone
 */
export const healthTone = health => {
  const word = upper(health);
  if (word === 'ONLINE') {
    return 'success';
  }
  if (word === 'DEGRADED') {
    return 'warning';
  }
  return DOWN_STATES.includes(word) ? 'danger' : 'secondary';
};

/**
 * The badge class of a zpool health, `text-bg-` and its tone.
 *
 * @param {string} health - The health word
 * @returns {string} The class
 */
export const healthBadgeClass = health => `text-bg-${healthTone(health)}`;

/**
 * The text class of a zpool health, the state dot of a drive chip.
 *
 * @param {string} health - The health word
 * @returns {string} The class
 */
export const healthTextClass = health => `text-${healthTone(health)}`;

/**
 * The sentence a queued answer names, hyperweaver-ui's: the agent's own
 * message or the fallback, the task's id after it where the answer
 * names one.
 *
 * @param {Object|null} answer - The agent's answer
 * @param {string} fallback - The sentence when the answer names none
 * @returns {string} The sentence
 */
export const queuedMessage = (answer, fallback) => {
  const base = answer?.message || fallback;
  return answer?.task_id ? `${base} (task ${answer.task_id})` : base;
};

/**
 * A raw byte count, a number or a bare digit string, in human units; a
 * string already human passes through; a dash and nothing become an em
 * dash.
 *
 * @param {number|string} value - The size
 * @returns {string} The size a person reads
 */
export const humanSize = value => {
  if (value === null || value === undefined || value === '' || value === '-') {
    return '—';
  }
  const bare = typeof value === 'number' || /^\d+(?:\.\d+)?$/u.test(String(value).trim());
  if (!bare) {
    return String(value);
  }
  let bytes = Number(value);
  let unit = 0;
  while (bytes >= KIB && unit < UNITS.length - 1) {
    bytes /= KIB;
    unit += 1;
  }
  const rounded = bytes >= PERCENT || unit === 0 ? Math.round(bytes) : Number(bytes.toFixed(1));
  return `${rounded}${UNITS[unit]}`;
};

/**
 * A size as ZFS prints it, `1.23G`, in bytes; null for a dash and
 * anything unreadable.
 *
 * @param {string} text - The size
 * @returns {number|null} The bytes
 */
export const parseZfsSize = text => {
  const match = /^(?<num>[\d.]+)(?<unit>[KMGTPE]?)B?$/iu.exec(String(text ?? '').trim());
  return match ? Number(match.groups.num) * SIZE_UNITS[match.groups.unit.toUpperCase()] : null;
};

/**
 * The share used of used and available, a whole percent; null while
 * either side is unreadable or both are nothing.
 *
 * @param {string} used - The used size
 * @param {string} avail - The available size
 * @returns {number|null} The percent
 */
export const usedPercent = (used, avail) => {
  const usedBytes = parseZfsSize(used);
  const availBytes = parseZfsSize(avail);
  if (usedBytes === null || availBytes === null || usedBytes + availBytes === 0) {
    return null;
  }
  return Math.round((usedBytes / (usedBytes + availBytes)) * PERCENT);
};

/**
 * The tone a capacity is drawn in: danger from ninety percent, warning
 * from seventy-five, success under.
 *
 * @param {number} percent - The percent used
 * @returns {string} The Bootstrap tone
 */
export const capacityVariant = percent => {
  if (percent >= CRITICAL_PERCENT) {
    return 'danger';
  }
  return percent >= FILLING_PERCENT ? 'warning' : 'success';
};

/**
 * Every device of a parsed zpool status, the vdev groups flattened.
 *
 * @param {Object|null} parsed - The `parsed` member of `storage/pools/{pool}/status`
 * @returns {Array<Object>} The devices
 */
export const flatVdevDevices = parsed =>
  (Array.isArray(parsed?.vdevs) ? parsed.vdevs : []).flatMap(group => group.devices || []);

/**
 * The key one vdev group is told from another by, its type and its
 * first device.
 *
 * @param {Object} group - The vdev group
 * @returns {string} The key
 */
export const vdevKey = group => `${group.type}:${group.devices?.[0]?.name || 'empty'}`;

/**
 * A long ctd or WWN device name shortened for a chip, its head and its
 * tail with an ellipsis between; a short name as it is.
 *
 * @param {string} name - The device name
 * @returns {string} The short name
 */
export const shortDevice = name => {
  const text = String(name);
  return text.length > SHORT_NAME ? `${text.slice(0, HEAD)}…${text.slice(-TAIL)}` : text;
};

/**
 * The percent a pool's `capacity_percent` names, held between 0 and 100;
 * null for a pool that names none.
 *
 * @param {Object} pool - The pool's row of `storage/pools`
 * @returns {number|null} The percent
 */
export const percentOf = pool => {
  const parsed = Number.parseInt(String(pool.capacity_percent ?? '').replace('%', ''), 10);
  return Number.isNaN(parsed) ? null : Math.max(0, Math.min(PERCENT, parsed));
};

/**
 * Whether a disk is solid state, an SSD or an NVMe.
 *
 * @param {string} type - The disk's `disk_type`
 * @returns {boolean} True for SSD and NVMe
 */
export const solidState = type => type === 'SSD' || type === 'NVMe';

/**
 * The vdev rows of the builder as the wire's mixed array: a plain row's
 * devices as strings, a typed row as `{ type, devices }`, an empty row
 * left out.
 *
 * @param {Array<{ type: string, devices: Array<string> }>} rows - The builder's rows
 * @returns {Array<string|Object>} The vdevs of the body
 */
export const buildVdevs = rows =>
  rows.flatMap(row => {
    if (row.devices.length === 0) {
      return [];
    }
    return row.type === '' ? row.devices : [{ type: row.type, devices: row.devices }];
  });

/**
 * The rows of a `zfs list`, filesystems and volumes, as the tree of
 * their names: a node its row, its name, its label, the last segment of
 * its name, its children and its snapshots, each snapshot folded under
 * the dataset its name precedes the `@` of.
 *
 * @param {Array<Object>} rows - The rows of `storage/datasets`
 * @returns {Array<Object>} The root nodes
 */
export const buildTree = rows => {
  const nodes = new Map();
  const roots = [];
  rows
    .filter(row => row.type !== 'snapshot')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(row => {
      const slash = row.name.lastIndexOf('/');
      const node = {
        row,
        name: row.name,
        label: slash >= 0 ? row.name.slice(slash + 1) : row.name,
        children: [],
        snapshots: [],
      };
      nodes.set(row.name, node);
      const parent = slash >= 0 ? nodes.get(row.name.slice(0, slash)) : null;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
  rows
    .filter(row => row.type === 'snapshot')
    .forEach(row => {
      nodes.get(row.name.split('@')[0])?.snapshots.push(row);
    });
  return roots;
};

/**
 * Whether a node draws: while its own type is shown and its name matches
 * the needle, or a shown snapshot of it matches, or any descendant does,
 * an ancestor kept as structure.
 *
 * @param {Object} node - The node
 * @param {string} needle - The query, lower-cased
 * @param {Object<string, boolean>} show - The types shown
 * @returns {boolean} True when the node draws
 */
export const nodeMatches = (node, needle, show) => {
  const typeOn = show[node.row.type] ?? true;
  const nameOk = !needle || node.name.toLowerCase().includes(needle);
  if (typeOn && nameOk) {
    return true;
  }
  if (
    show.snapshot &&
    node.snapshots.some(snap => !needle || snap.name.toLowerCase().includes(needle))
  ) {
    return true;
  }
  return node.children.some(child => nodeMatches(child, needle, show));
};

/**
 * Every node's name of a tree, the roots and their descendants.
 *
 * @param {Array<Object>} nodes - The nodes
 * @returns {Array<string>} The names
 */
export const allNodeNames = nodes =>
  nodes.flatMap(node => [node.name, ...allNodeNames(node.children)]);

/**
 * A set with one name toggled in or out.
 *
 * @param {Set<string>} set - The set
 * @param {string} name - The name
 * @returns {Set<string>} The next set
 */
export const toggleIn = (set, name) => {
  const next = new Set(set);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  return next;
};
