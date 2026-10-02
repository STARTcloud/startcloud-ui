const lower = value => String(value ?? '').toLowerCase();

const SEVERITY_TONES = { critical: 'danger', major: 'warning', minor: 'info' };

/**
 * The tone a fault's severity draws in, hyperweaver-ui's: danger for
 * critical, warning for major, info for minor, secondary otherwise.
 *
 * @param {string} severity - The severity
 * @returns {string} The Bootstrap tone
 */
export const severityTone = severity => SEVERITY_TONES[lower(severity)] || 'secondary';

/**
 * The badge class of a fault's severity, hyperweaver-ui's
 * `getSeverityTagClass`.
 *
 * @param {string} severity - The severity
 * @returns {string} The badge class
 */
export const getSeverityTagClass = severity => `text-bg-${severityTone(severity)}`;

const CLASS_KEYS = {
  ZFS: 'host.faultTable.classZfs',
  FMD: 'host.faultTable.classFmd',
  CPU: 'host.faultTable.classCpu',
  MEM: 'host.faultTable.classMemory',
};

/**
 * The class of a fault read from its message id, hyperweaver-ui's: the
 * key of a word for ZFS, FMD, CPU and MEM, the id's first segment for
 * every other, and the unknown key for none.
 *
 * @param {string} msgId - The fault's `msgId`
 * @returns {{ key: string, text: string }} The key of the word, or the text
 */
export const faultClass = msgId => {
  const [prefix] = String(msgId || '').split('-');
  if (CLASS_KEYS[prefix]) {
    return { key: CLASS_KEYS[prefix], text: '' };
  }
  return prefix ? { key: '', text: prefix } : { key: 'host.faultTable.classUnknown', text: '' };
};

/**
 * The FMRI of what a fault affects, the first word of `details.affects`,
 * null for none.
 *
 * @param {string} affects - The `affects` line
 * @returns {string|null} The FMRI
 */
export const extractFmriFromAffects = affects =>
  affects ? String(affects).split(/\s+/u)[0] : null;

/**
 * The body of `POST system/fault-management/actions/{action}`,
 * hyperweaver-ui's: the uuid as `target` for an acquit, the FMRI for a
 * repair and a replacement.
 *
 * @param {string} action - `acquit`, `repaired` or `replaced`
 * @param {Object} fault - The fault row
 * @returns {Object} The body
 */
export const faultActionBody = (action, fault) =>
  action === 'acquit'
    ? { target: fault.uuid }
    : { fmri: extractFmriFromAffects(fault.details?.affects) };

/**
 * The three actions of every fault row, hyperweaver-ui's, each with the
 * key of its label and its tone.
 */
export const FAULT_ACTIONS = [
  { key: 'acquit', labelKey: 'host.faultTable.acquit', tone: 'success' },
  { key: 'repaired', labelKey: 'host.faultTable.markRepaired', tone: 'info' },
  { key: 'replaced', labelKey: 'host.faultTable.markReplaced', tone: 'warning' },
];

/**
 * The request filters the faults open with, hyperweaver-ui's: the
 * resolved left out, no summary, fifty faults.
 */
export const FAULT_PARAMS = { all: false, summary: false, limit: 50 };

export const FAULT_LIMITS = [25, 50, 100, 200];

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesFault = matcher(row => [
  row.uuid,
  row.msgId,
  row.severity,
  row.time,
  row.details?.affects,
  row.details?.faultClass,
  row.details?.description,
]);

export const matchesFaultModule = matcher(row => [row.module, row.version, row.description]);

/**
 * The filter group of the faults table, the severity of each fault.
 */
export const FAULT_FILTERS = [
  {
    key: 'severity',
    labelKey: 'host.faultTable.severity',
    values: row => (row.severity ? [lower(row.severity)] : []),
    order: ['critical', 'major', 'minor'],
    activeClass: 'bg-danger',
    labelFor: value => value.charAt(0).toUpperCase() + value.slice(1),
  },
];

const MODULE_TYPES = [
  ['retire', 'retireAgent', 'info'],
  ['detector', 'detector', 'warning'],
  ['response', 'response', 'success'],
];

/**
 * The type of a fault manager module read from its name,
 * hyperweaver-ui's: a retire agent, a detector, a response agent or a
 * module, each with the key of its word and its tone.
 *
 * @param {string} module - The module's name
 * @returns {{ type: string, key: string, tone: string }} The type
 */
export const moduleType = module => {
  const name = String(module || '');
  const found = MODULE_TYPES.find(([word]) => name.includes(word));
  if (!found) {
    return { type: 'module', key: 'host.faultManagerConfig.moduleTypeModule', tone: 'secondary' };
  }
  const [, type, tone] = found;
  return {
    type,
    key: `host.faultManagerConfig.moduleType${type.charAt(0).toUpperCase()}${type.slice(1)}`,
    tone,
  };
};

/**
 * The glyph key of a fault manager module read from its name,
 * hyperweaver-ui's: the chip, the disk, the database, the network or
 * the gear.
 *
 * @param {string} module - The module's name
 * @returns {string} The glyph key
 */
export const moduleGlyph = module => {
  const name = String(module || '');
  if (name.includes('cpumem')) {
    return 'chip';
  }
  if (name.includes('disk')) {
    return 'disk';
  }
  if (name.includes('zfs')) {
    return 'database';
  }
  if (name.includes('network')) {
    return 'network';
  }
  return 'gear';
};

/**
 * The last segment of each module's name, hyperweaver-ui's module types
 * summary, each once.
 *
 * @param {Array<Object>} modules - The `config` rows
 * @returns {Array<string>} The words
 */
export const moduleWords = modules => [
  ...new Set(
    modules.map(row =>
      String(row.module || '')
        .split('-')
        .pop()
    )
  ),
];

/**
 * The filter group of the fault manager modules table, the type of each.
 */
export const MODULE_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.faultManagerConfig.thType',
    values: row => [moduleType(row.module).type],
    order: ['retireAgent', 'detector', 'response', 'module'],
    activeClass: 'bg-info',
    labelFor: (value, t) => t(moduleType(value === 'module' ? '' : value).key),
  },
];
