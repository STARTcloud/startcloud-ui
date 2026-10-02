import { randomUUID } from 'crypto';

import { BLUE, BOLD, CYAN, GREEN, RED, RESET, YELLOW, ago } from './kit.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DONE = `${GREEN}ok${RESET}`;
const CHANGED = `${YELLOW}changed${RESET}`;
const FAILED = `${RED}${BOLD}failed${RESET}`;
const ENDED = ['completed', 'completed_with_errors', 'failed', 'cancelled'];
const WAITING = ['pending', 'prepared'];
const PERCENTS = {
  pending: 0,
  prepared: 0,
  running: 45,
  completed: 100,
  completed_with_errors: 100,
  failed: 35,
  cancelled: 20,
};
const HISTORY_OPERATIONS = ['start', 'stop', 'reset', 'snapshot_take', 'suspend', 'start'];
const HISTORY_STATUSES = ['completed', 'completed', 'failed', 'completed', 'cancelled'];
const HISTORY_PEOPLE = ['mark', 'admin', 'user', 'super', 'system'];
const HISTORY_ERRORS = {
  start: 'the hypervisor refused the start: not enough free memory on the host',
  stop: 'the guest did not power off within 120 seconds',
  reset: 'the machine left the running state before the reset',
  snapshot_take: 'no space left on the snapshot volume',
  suspend: 'the state file could not be written',
};
const PRIORITIES = {
  start: 60,
  stop: 80,
  reset: 80,
  pause: 80,
  suspend: 80,
  resume: 80,
  delete: 100,
  snapshot_take: 60,
  artifact_scan: 20,
  artifact_download: 40,
  template_download: 40,
  agent_update: 50,
};
const GENERIC_LINES = [
  'Reading the request',
  `${DONE} the request is valid`,
  'Doing the work',
  `${DONE} done`,
];
const HOST_LINES = [
  'Warning every signed-in person',
  'Waiting out the grace period',
  `${YELLOW}The mock keeps the host up${RESET}`,
];
const LINES = {
  start: [
    'Powering the machine on',
    `${DONE} the hypervisor accepted the start`,
    'Waiting for the guest agent',
    `${DONE} the guest agent answered`,
  ],
  stop: [
    'Asking the guest to shut down',
    'Waiting for the machine to power off',
    `${DONE} the machine is off`,
  ],
  reset: [`${YELLOW}Hard reset${RESET} of the machine`, `${DONE} the machine is up`],
  pause: ['Freezing the machine in memory', `${DONE} the machine is paused`],
  suspend: [
    'Writing the state of the machine to disk',
    `${CYAN}state file${RESET} 2.1 GB written`,
    `${DONE} the machine is suspended`,
  ],
  resume: ['Thawing the machine', `${DONE} the machine is running`],
  delete: [
    'Stopping the machine',
    'Removing the media the agent created',
    `${DONE} the machine is gone`,
  ],
  zone_detach: [
    'Detaching the zone from the host',
    `${CHANGED} the zone reads configured`,
    `${DONE} the zone is detached`,
  ],
  zone_attach: [
    'Validating the zone against the host',
    'Attaching the zone',
    `${CHANGED} the zone reads installed`,
    `${DONE} the zone is attached`,
  ],
  zone_move: [
    'Creating the dataset at the new path',
    `${CYAN}send${RESET} 8.4 GB of 8.4 GB`,
    'Renaming the zonepath',
    `${DONE} the zone has moved`,
  ],
  machine_move: [
    'Creating the folder at the new path',
    `${CYAN}copy${RESET} 3 files, 21.7 GB`,
    'Registering the machine at the new path',
    `${DONE} the machine has moved`,
  ],
  snapshot_take: ['Freezing the disks', 'Writing the snapshot', `${DONE} the snapshot is taken`],
  artifact_scan: [
    'Scanning the artifact folders',
    `${BLUE}info${RESET} 14 images, 3 of them new`,
    `${DONE} the index is written`,
  ],
  artifact_download: [
    'Resolving the source',
    `${CYAN}download${RESET} started`,
    `${CYAN}download${RESET} half way`,
    'Verifying the checksum',
    `${DONE} the artifact is stored`,
  ],
  template_download: [
    'Resolving the template in the registry',
    `${CYAN}download${RESET} started`,
    `${CYAN}download${RESET} half way`,
    'Unpacking the template',
    `${DONE} the template is ready`,
  ],
  agent_update: [
    'Reading the package index',
    `${CHANGED} the agent package moves one version up`,
    `${YELLOW}The mock keeps the agent as it is${RESET}`,
  ],
  machine_prepare: ['Checking the name and the resources', `${DONE} the machine can be created`],
  machine_create_storage: [
    'Creating the boot disk',
    'Creating the data disk',
    `${DONE} the storage is created`,
  ],
  machine_create_config: [
    'Writing the machine definition',
    `${CHANGED} 2 network adapters attached`,
    `${DONE} the machine is registered`,
  ],
  machine_create_finalize: [
    'Writing the provisioning metadata',
    `${DONE} the machine is ready for its first start`,
  ],
  machine_wait_ssh: [
    'Waiting for port 22',
    `${BLUE}info${RESET} attempt 3 of 60`,
    `${DONE} the machine answers over SSH`,
  ],
  machine_sync: [
    'Syncing the provisioner folders',
    `${CYAN}rsync${RESET} 412 files, 38 MB`,
    `${DONE} the folders are in sync`,
  ],
  machine_provision_orchestration: [
    'Waiting for port 22',
    `${DONE} the machine answers over SSH`,
    'Syncing the provisioner folders',
    `${CYAN}rsync${RESET} 412 files, 38 MB`,
    `${BOLD}PLAY [all]${RESET}`,
    `${BOLD}TASK [common : install packages]${RESET}`,
    `${CHANGED}: [machine]`,
    `${BOLD}PLAY RECAP${RESET} ok=12 changed=5 unreachable=0 failed=0`,
    `${DONE} the machine is provisioned`,
  ],
  machine_sync_parent: [
    'Syncing the provisioner folders',
    `${CYAN}rsync${RESET} 412 files, 38 MB`,
    `${DONE} the folders are in sync`,
  ],
  machine_provision_parent: [
    `${BOLD}PLAY [all]${RESET}`,
    `${BOLD}TASK [common : write the configuration]${RESET}`,
    `${DONE}: [machine]`,
    `${BOLD}PLAY RECAP${RESET} ok=12 changed=0 unreachable=0 failed=0`,
    `${DONE} the provisioners ran`,
  ],
  machine_provision: [
    `${BOLD}PLAY [all]${RESET}`,
    `${BOLD}TASK [common : install packages]${RESET}`,
    `${CHANGED}: [machine]`,
    `${BOLD}TASK [common : write the configuration]${RESET}`,
    `${DONE}: [machine]`,
    `${BOLD}TASK [service : start]${RESET}`,
    `${CHANGED}: [machine]`,
    `${BOLD}PLAY RECAP${RESET} ok=12 changed=5 unreachable=0 failed=0`,
  ],
};

const hostOperation = operation => operation.startsWith('system_host_');

/**
 * The output lines a task of one operation writes as it runs.
 *
 * @param {string} operation - The task's `operation`
 * @returns {Array<string>} The lines, colours and all
 */
export const linesFor = operation =>
  LINES[operation] || (hostOperation(operation) ? HOST_LINES : GENERIC_LINES);

/**
 * One task row in the members both agents answer.
 *
 * @param {Object} options - The members that differ between rows
 * @returns {Object} The task row
 */
export const taskRow = ({ machine, operation, status, minutes = 0, by = 'mark', more = {} }) => ({
  id: randomUUID(),
  machine_name: machine,
  operation,
  status,
  priority: PRIORITIES[operation] || (hostOperation(operation) ? 100 : 60),
  created_by: by,
  depends_on: null,
  parent_task_id: null,
  error_message: null,
  progress_percent: PERCENTS[status],
  progress_info: null,
  metadata: null,
  created_at: ago(minutes),
  started_at: WAITING.includes(status) ? null : ago(minutes - 0.05),
  completed_at: ENDED.includes(status) ? ago(minutes - 0.6) : null,
  ...more,
});

const outputOf = task => {
  const lines = linesFor(task.operation);
  const written = lines.slice(0, Math.ceil((lines.length * task.progress_percent) / 100));
  const at = Date.parse(task.started_at || task.created_at);
  const end = at + written.length * 1000;
  const entries = written.map((data, index) => ({
    stream: 'stdout',
    data,
    timestamp: at + index * 1000,
  }));
  if (!task.error_message) {
    return entries;
  }
  return [
    ...entries,
    { stream: 'stderr', data: `${FAILED} ${task.operation}`, timestamp: end },
    { stream: 'stderr', data: `${RED}${task.error_message}${RESET}`, timestamp: end + 1 },
  ];
};

const childrenOf = (parent, rows) =>
  rows.map((row, index) => ({
    ...row,
    parent_task_id: parent.id,
    priority: parent.priority,
    created_by: parent.created_by,
    created_at: parent.created_at,
    depends_on: null,
    metadata: { step: index + 1, steps: rows.length },
  }));

const chained = rows =>
  rows.map((row, index) => ({ ...row, depends_on: index ? rows[index - 1].id : null }));

const parentInfo = (children, status) => ({
  completed_tasks: children.filter(child => child.status === 'completed').length,
  failed_tasks: children.filter(child => child.status === 'failed').length,
  total_tasks: children.length,
  status,
});

const family = ({ machine, operation, status, minutes, by, steps }) => {
  const parent = taskRow({ machine, operation, status, minutes, by });
  const rows = steps.map(step => taskRow({ machine, minutes, ...step }));
  const children = chained(childrenOf(parent, rows));
  const done = children.filter(child => ENDED.includes(child.status)).length;
  return [
    {
      ...parent,
      progress_percent: Math.round((done / children.length) * 100),
      progress_info: parentInfo(children, status),
      error_message: children.find(child => child.error_message)?.error_message || null,
    },
    ...children,
  ];
};

const createdFamily = (machine, minutes) =>
  family({
    machine,
    operation: 'machine_create_orchestration',
    status: 'completed',
    minutes,
    by: 'admin',
    steps: [
      { operation: 'machine_prepare', status: 'completed' },
      {
        operation: 'template_download',
        status: 'completed',
        more: {
          progress_info: { status: 'downloading', received_bytes: 4 * GIB, total_bytes: 4 * GIB },
        },
      },
      { operation: 'machine_create_storage', status: 'completed' },
      { operation: 'machine_create_config', status: 'completed' },
      { operation: 'machine_create_finalize', status: 'completed' },
    ],
  });

const provisionFamily = (machine, minutes) =>
  family({
    machine,
    operation: 'machine_provision_orchestration',
    status: 'running',
    minutes,
    by: 'mark',
    steps: [
      { operation: 'machine_wait_ssh', status: 'completed' },
      { operation: 'machine_sync', status: 'completed' },
      {
        operation: 'machine_provision',
        status: 'running',
        more: {
          progress_info: {
            status: 'running_playbook',
            ansible_percent: 45,
            message: 'TASK [common : write the configuration]',
          },
        },
      },
      { operation: 'snapshot_take', status: 'pending' },
    ],
  });

const brokenFamily = (machine, minutes) =>
  family({
    machine,
    operation: 'machine_create_orchestration',
    status: 'failed',
    minutes,
    by: 'super',
    steps: [
      { operation: 'machine_prepare', status: 'completed' },
      {
        operation: 'template_download',
        status: 'failed',
        more: {
          error_message: 'the registry answered 503 Service Unavailable after 3 attempts',
          progress_info: {
            status: 'downloading',
            received_bytes: 1400 * MIB,
            total_bytes: 4 * GIB,
          },
        },
      },
      { operation: 'machine_create_storage', status: 'cancelled' },
      { operation: 'machine_create_config', status: 'cancelled' },
      { operation: 'machine_create_finalize', status: 'cancelled' },
    ],
  });

const singles = ([first, second = first, third = second]) => [
  taskRow({ machine: first, operation: 'stop', status: 'pending', minutes: 1, by: 'user' }),
  taskRow({
    machine: 'artifact',
    operation: 'artifact_download',
    status: 'running',
    minutes: 3,
    by: 'admin',
    more: {
      progress_info: { status: 'downloading', received_bytes: 945 * MIB, total_bytes: 2100 * MIB },
      metadata: { url: 'https://downloads.example.com/images/debian-13-amd64.iso' },
    },
  }),
  taskRow({
    machine: second,
    operation: 'machine_modify',
    status: 'prepared',
    minutes: 6,
    by: 'admin',
    more: { metadata: { memory: '8G', vcpus: 4 } },
  }),
  taskRow({
    machine: third,
    operation: 'snapshot_take',
    status: 'completed_with_errors',
    minutes: 18,
    by: 'mark',
    more: { error_message: 'the snapshot is taken, the memory state could not be saved' },
  }),
  taskRow({
    machine: 'system',
    operation: 'system_host_restart',
    status: 'cancelled',
    minutes: 95,
    by: 'super',
    more: { metadata: { grace_period: 60, message: 'Kernel update' } },
  }),
  taskRow({
    machine: 'filesystem',
    operation: 'artifact_scan',
    status: 'completed',
    minutes: 120,
    by: 'system',
  }),
  taskRow({
    machine: 'system',
    operation: 'agent_update',
    status: 'completed',
    minutes: 240,
    by: 'system',
    more: { metadata: { from: '1.1.9', to: '1.2.0' } },
  }),
  taskRow({
    machine: 'artifact',
    operation: 'template_upload',
    status: 'failed',
    minutes: 300,
    by: 'admin',
    more: {
      priority: 40,
      error_message: 'the upload stopped at 61%: connection reset by peer',
      progress_percent: 61,
      progress_info: { status: 'uploading', received_bytes: 1830 * MIB, total_bytes: 3 * GIB },
    },
  }),
];

const pastTasks = (machines, count) =>
  [...Array(count).keys()].map(index => {
    const operation = HISTORY_OPERATIONS[index % HISTORY_OPERATIONS.length];
    const status = HISTORY_STATUSES[index % HISTORY_STATUSES.length];
    return taskRow({
      machine: machines[index % machines.length],
      operation,
      status,
      minutes: 360 + index * 47,
      by: HISTORY_PEOPLE[index % HISTORY_PEOPLE.length],
      more: { error_message: status === 'failed' ? HISTORY_ERRORS[operation] || null : null },
    });
  });

const byNewest = (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at);

/**
 * The tasks one host starts with and the output each one already wrote:
 * every status and every priority, two parents with their subtasks, one
 * of them failed, transfers that carry byte counts, a provisioning step
 * that carries its playbook percent, and a history long enough to pass
 * the fifty rows the tasks table asks for.
 *
 * @param {Object} options - `machines`, the names to spread the rows over, `kept`, rows to keep as they are, and `count`, the length of the history
 * @returns {{ tasks: Array<Object>, outputs: Array<Array> }} The rows, newest first, and their output
 */
export const seedTasks = ({ machines, kept = [], count = 12 }) => {
  if (machines.length === 0) {
    return { tasks: kept, outputs: [] };
  }
  const [first, second = first, third = second] = machines;
  const seeded = [
    ...singles(machines),
    ...provisionFamily(second, 9),
    ...createdFamily(third, 150),
    ...brokenFamily(`${first}-clone`, 200),
    ...pastTasks(machines, count),
  ].sort(byNewest);
  return {
    tasks: [...kept, ...seeded],
    outputs: seeded.map(task => [task.id, outputOf(task)]),
  };
};
