import { taskMachineOf } from './machines';

export const PRIORITY_FLOORS = [20, 40, 60, 80, 100];

export const DEFAULT_FLOOR = 40;

/**
 * The priority filter's five floors in the order the drop-up draws them,
 * each the `min_priority` a read sends and the key of its label.
 */
export const PRIORITY_OPTIONS = [
  { value: 20, labelKey: 'footer.pane.priorityAll' },
  { value: 40, labelKey: 'footer.pane.priorityLowPlus' },
  { value: 60, labelKey: 'footer.pane.priorityMediumPlus' },
  { value: 80, labelKey: 'footer.pane.priorityHighPlus' },
  { value: 100, labelKey: 'footer.pane.priorityCritical' },
];

/**
 * The stored priority floor as one of the five floors, the default 40
 * while the value is missing or names no floor.
 *
 * @param {*} value - The stored value
 * @returns {number} The floor
 */
export const floorOf = value =>
  PRIORITY_FLOORS.includes(Number(value)) ? Number(value) : DEFAULT_FLOOR;

/**
 * The word a task's priority number reads as: `critical` from 100, `high`
 * from 80, `medium` from 60, `service` from 50, `low` from 40 and
 * `background` under it.
 *
 * @param {number} value - The task's priority
 * @returns {string} The word
 */
export const priorityKey = value => {
  if (value >= 100) {
    return 'critical';
  }
  if (value >= 80) {
    return 'high';
  }
  if (value >= 60) {
    return 'medium';
  }
  if (value >= 50) {
    return 'service';
  }
  if (value >= 40) {
    return 'low';
  }
  return 'background';
};

const OPERATION_KEYS = {
  provisioner_import: 'footer.operation.provisionerImport',
  machine_prepare: 'footer.operation.machinePrepare',
  machine_create_orchestration: 'footer.operation.machineCreateOrchestration',
  machine_create_storage: 'footer.operation.machineCreateStorage',
  machine_create_config: 'footer.operation.machineCreateConfig',
  machine_create_finalize: 'footer.operation.machineCreateFinalize',
  template_download: 'footer.operation.templateDownload',
  machine_provision_orchestration: 'footer.operation.machineProvisionOrchestration',
  machine_wait_ssh: 'footer.operation.machineWaitSsh',
  machine_sync_parent: 'footer.operation.machineSyncParent',
  machine_sync: 'footer.operation.machineSync',
  machine_provision_parent: 'footer.operation.machineProvisionParent',
  machine_provision: 'footer.operation.machineProvision',
  machine_modify: 'footer.operation.machineModify',
  reset: 'footer.operation.reset',
  pause: 'footer.operation.pause',
  resume: 'footer.operation.resume',
  snapshot_take: 'footer.operation.snapshotTake',
  snapshot_restore: 'footer.operation.snapshotRestore',
  snapshot_delete: 'footer.operation.snapshotDelete',
  machine_clone_current: 'footer.operation.machineCloneCurrent',
  template_delete: 'footer.operation.templateDelete',
  template_export: 'footer.operation.templateExport',
  template_upload: 'footer.operation.templateUpload',
  template_move: 'footer.operation.templateMove',
  zone_modify: 'footer.operation.zoneModify',
  provisioning_network_setup: 'footer.operation.provisioningNetworkSetup',
  provisioning_network_teardown: 'footer.operation.provisioningNetworkTeardown',
  artifact_scan: 'footer.operation.artifactScan',
  artifact_download: 'footer.operation.artifactDownload',
  hcl_download: 'footer.operation.hclDownload',
  agent_update: 'footer.operation.agentUpdate',
};

/**
 * The key of a task operation's friendly label, empty for an operation
 * that draws as the wire's own word.
 *
 * @param {string} operation - The task's `operation`
 * @returns {string} The locale key, or the empty string
 */
export const taskOperationKey = operation => OPERATION_KEYS[operation] || '';

/**
 * A task operation as the table and the dialog draw it: its friendly
 * label where it has one, the wire's own word otherwise.
 *
 * @param {string} operation - The task's `operation`
 * @param {Function} t - The translator
 * @returns {string} The label
 */
export const taskOperationLabel = (operation, t) => {
  const key = taskOperationKey(operation);
  return key ? t(key) : operation;
};

const instantOf = value => (value ? new Date(value).getTime() : 0);

/**
 * The eleven columns of the tasks table in the order they draw, each a
 * column of the one `SubTable`: the member of the task row it reads, the
 * key of its heading, its content kind, the fold priority where the
 * kind's own does not fit (the operation never folds, the target and the
 * status fold last, the id and the error first) and `value`, what a
 * header sorts by, the instant of a date, the number of a progress or a
 * priority and the text of everything else.
 */
export const TASK_COLUMNS = [
  {
    key: 'id',
    kind: 'text',
    priority: 6,
    labelKey: 'footer.tasks.columnId',
    value: task => String(task.id ?? ''),
  },
  {
    key: 'operation',
    kind: 'name',
    labelKey: 'footer.tasks.columnOperation',
    value: (task, ctx) => taskOperationLabel(task.operation, ctx.t),
  },
  {
    key: 'machine_name',
    kind: 'text',
    priority: 2,
    labelKey: 'footer.tasks.columnTarget',
    value: task => taskMachineOf(task),
  },
  {
    key: 'status',
    kind: 'word',
    priority: 2,
    labelKey: 'footer.tasks.columnStatus',
    value: task => task.status || '',
  },
  {
    key: 'progress',
    kind: 'text',
    priority: 3,
    labelKey: 'footer.tasks.columnProgress',
    value: task => Number(task.progress_percent) || 0,
  },
  {
    key: 'priority',
    kind: 'word',
    priority: 4,
    labelKey: 'footer.tasks.columnPriority',
    value: task => Number(task.priority) || 0,
  },
  {
    key: 'created_by',
    kind: 'text',
    labelKey: 'footer.tasks.columnCreatedBy',
    value: task => task.created_by || '',
  },
  {
    key: 'created_at',
    kind: 'date',
    labelKey: 'footer.tasks.columnCreated',
    value: task => instantOf(task.created_at),
  },
  {
    key: 'started_at',
    kind: 'date',
    priority: 4,
    labelKey: 'footer.tasks.columnStarted',
    value: task => instantOf(task.started_at),
  },
  {
    key: 'completed_at',
    kind: 'date',
    priority: 4,
    labelKey: 'footer.tasks.columnCompleted',
    value: task => instantOf(task.completed_at),
  },
  {
    key: 'error_message',
    kind: 'text',
    priority: 6,
    labelKey: 'footer.tasks.columnError',
    value: task => task.error_message || '',
  },
];

export const DEFAULT_COLUMNS = [
  'operation',
  'machine_name',
  'status',
  'progress',
  'priority',
  'created_at',
];

const COLUMN_KEYS = TASK_COLUMNS.map(column => column.key);

/**
 * The stored column keys as a list of known columns, the six default ones
 * while the value is no list or names no column.
 *
 * @param {*} value - The stored value
 * @returns {Array<string>} The column keys shown
 */
export const columnsOf = value => {
  const known = Array.isArray(value) ? value.filter(key => COLUMN_KEYS.includes(key)) : [];
  return known.length > 0 ? known : DEFAULT_COLUMNS;
};

/**
 * The shown columns with one toggled: a hidden column is added, a shown
 * one removed unless it is the last one left.
 *
 * @param {Array<string>} columns - The column keys shown
 * @param {string} key - The column to toggle
 * @returns {Array<string>} The column keys shown after the toggle
 */
export const withColumnToggled = (columns, key) => {
  if (!columns.includes(key)) {
    return [...columns, key];
  }
  return columns.length > 1 ? columns.filter(column => column !== key) : columns;
};

/**
 * A task's timestamp in the person's own locale, a dash while the task
 * has none.
 *
 * @param {string} value - The timestamp
 * @returns {string} The date and time
 */
export const formatTaskDate = value => (value ? new Date(value).toLocaleString() : '-');

export const ACTIVE_TASK_STATUSES = ['pending', 'running'];

export const TERMINAL_TASK_STATUSES = ['completed', 'completed_with_errors', 'failed', 'cancelled'];

export const HOST_LEVEL_TARGETS = ['system', 'artifact', 'filesystem'];

/**
 * The machine a task's stream ticket is bound to: the task's own machine
 * as its agent names it (`taskMachineOf`), and none for a host-level
 * task, whose target reads `system`, `artifact` or `filesystem`.
 *
 * @param {Object} task - The task row
 * @returns {string} The machine name, empty for an unbound ticket
 */
export const ticketMachineOf = task => {
  const machine = taskMachineOf(task);
  return machine && !HOST_LEVEL_TARGETS.includes(machine) ? machine : '';
};

/**
 * The class a task's row is tinted with: danger for a failed task,
 * warning for a running one, none otherwise.
 *
 * @param {string} status - The task's `status`
 * @returns {string} The class, or the empty string
 */
export const taskRowClass = status => {
  if (status === 'failed' || status === 'completed_with_errors') {
    return 'task-failed';
  }
  return status === 'running' ? 'task-running' : '';
};

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * A byte count as a size a person reads, in the unit that keeps it
 * under 1024.
 *
 * @param {number} bytes - The byte count
 * @returns {string} The size, empty for a value that is no count
 */
export const formatByteSize = bytes => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

/**
 * A task's `progress_info`, an object on the wire, or null.
 *
 * @param {Object} task - The task row
 * @returns {Object|null} The progress object
 */
export const taskProgressInfo = task => {
  const info = task?.progress_info;
  return info && typeof info === 'object' ? info : null;
};

const transferSamples = new Map();

/**
 * The transfer line of a task whose `progress_info` carries byte counts:
 * what was received, the total when the wire names one, and while the
 * task runs the speed between this read and the one before it.
 *
 * @param {Object} task - The task row
 * @returns {string} The line, empty for a task that transfers nothing
 */
export const transferProgressLine = task => {
  const info = taskProgressInfo(task);
  if (!info || !Number.isFinite(info.received_bytes)) {
    transferSamples.delete(task?.id);
    return '';
  }
  const received = formatByteSize(info.received_bytes);
  const total = Number.isFinite(info.total_bytes) ? ` / ${formatByteSize(info.total_bytes)}` : '';
  if (task.status !== 'running') {
    transferSamples.delete(task.id);
    return `${received}${total}`;
  }
  const now = Date.now();
  const previous = transferSamples.get(task.id);
  transferSamples.set(task.id, { bytes: info.received_bytes, at: now });
  if (previous && now > previous.at && info.received_bytes > previous.bytes) {
    const rate = ((info.received_bytes - previous.bytes) * 1000) / (now - previous.at);
    return `${received}${total} · ${formatByteSize(rate)}/s`;
  }
  return `${received}${total}`;
};

/**
 * The order of the tasks table, the newest task first by `created_at`.
 *
 * @param {Object} first - A task row
 * @param {Object} second - Another task row
 * @returns {number} The comparison
 */
export const newestFirst = (first, second) =>
  new Date(second.created_at) - new Date(first.created_at);

/**
 * A second read merged into the rows a first read answered: a row both
 * hold takes the new read's members in place, and the rows only the new
 * read holds go first, newest first.
 *
 * @param {Array<Object>} previous - The rows held
 * @param {Array<Object>} next - The rows the new read answered
 * @returns {Array<Object>} The merged rows
 */
export const mergeTasks = (previous, next) => {
  const incoming = new Map(next.map(task => [task.id, task]));
  const held = new Set(previous.map(task => task.id));
  const added = next.filter(task => !held.has(task.id)).sort(newestFirst);
  return [...added, ...previous.map(task => incoming.get(task.id) || task)];
};

/**
 * One row the stream pushed merged into the rows held, by `rowKey`: a
 * row held takes the pushed members in place, a row not held goes first,
 * and the table keeps `limit` rows at most, the number a read asks for.
 *
 * @param {Array<Object>} rows - The rows held
 * @param {Object} row - The pushed row, carrying its `rowKey`
 * @param {number} limit - The most rows the table holds
 * @returns {Array<Object>} The merged rows
 */
export const mergeTaskRow = (rows, row, limit) => {
  const held = rows.some(task => task.rowKey === row.rowKey);
  const merged = held
    ? rows.map(task => (task.rowKey === row.rowKey ? { ...task, ...row } : task))
    : [row, ...rows];
  return merged.slice(0, limit);
};
