import { cacheLabel } from './cacheLevel';
import { vmStatus } from './vmStatus';

export const CSV_COLUMNS = [
  'hostname',
  'pool',
  'cache',
  'user',
  'displayName',
  'session',
  'status',
  'drives',
  'icons',
  'seen',
  'ip',
  'agentVersion',
  'publication',
];

const publicationOf = vm => {
  if (vm.uds?.publication_id === null || vm.uds?.publication_id === undefined) {
    return '';
  }
  return vm.uds.stale_image ? 'stale' : 'current';
};

const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;

/**
 * The filtered, sorted rows as pretty JSON.
 * @param {Array<Object>} rows - The vm objects
 * @returns {string} The JSON text
 */
export const exportJson = rows => JSON.stringify(rows, null, 2);

/**
 * The filtered, sorted rows as CSV over `CSV_COLUMNS`, the headers
 * translated and the cache label translated, every other value raw.
 * @param {Array<Object>} rows - The vm objects
 * @param {Object} options - The formatting inputs
 * @param {Function} options.t - The translator
 * @param {number} options.now - The reference epoch in milliseconds
 * @returns {string} The CSV text
 */
export const exportCsv = (rows, { t, now }) => {
  const header = CSV_COLUMNS.map(column => t(`vdi.export.${column}`));
  const lines = rows.map(vm => [
    vm.hostname,
    vm.uds?.pool_name || '',
    cacheLabel(vm.uds, t),
    vm.user?.username || '',
    vm.user?.display_name || '',
    vm.user?.session_state || '',
    vmStatus(vm, now),
    (vm.drives || []).map(drive => `${drive.letter}:${drive.status}`).join('; '),
    vm.desktop?.icon_count ?? '',
    vm.last_checkin || '',
    vm.ip_address || '',
    vm.agent_version || '',
    publicationOf(vm),
  ]);
  return [header, ...lines].map(line => line.map(csvCell).join(',')).join('\n');
};
