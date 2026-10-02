import { seedTasks } from './fleet-tasks.js';
import {
  AGENT_MODE,
  APIKEY_MODE,
  ORG_UUIDS,
  SELF,
  ZONE_MODE,
  fixture,
  secondsUp,
  typedProblem,
  uniqueOf,
} from './kit.js';

const GIB = 1024 ** 3;
const CHROME_TOKENS = ['sidebar', 'hosts', 'footer'];
const DESK_FEATURES = [
  'host-power',
  'guest-agent',
  'machine-screenshot',
  'monitoring',
  'swap',
  'provisioning',
  'provisioner-registry',
  'network-spaces',
  'machine-create',
  'machine-modify',
  'machine-snapshots',
  'templates',
  'artifacts',
  'ssh',
  'processes',
  'secrets',
];
const DESK_CONSOLES = ['vnc', 'rdp'];
const LAB_FEATURES = [
  'machines',
  'tasks',
  'host-power',
  'machine-suspend',
  'monitoring',
  'swap',
  'provisioning',
];
const ZONE_FEATURES = [
  'machine-screenshot',
  'monitoring',
  'zfs',
  'swap',
  'provisioning',
  'provisioner-registry',
  'host-fast-reboot',
  'machine-resume-suspended',
  'vnics',
  'devices',
  'machine-create',
  'machine-modify',
  'machine-snapshots',
  'templates',
  'artifacts',
  'services',
  'processes',
  'system-users',
  'time-sync',
  'packages',
  'repositories',
  'boot-environments',
  'fault-management',
  'log-streaming',
  'syslog',
];
const STUDIO_FEATURES = [
  'machines',
  'tasks',
  'host-terminal',
  'machine-suspend',
  'host-launchers',
  'guest-agent',
  'machine-screenshot',
  'monitoring',
  'swap',
  'provisioning',
  'provisioner-registry',
  'machine-create',
  'machine-modify',
  'machine-snapshots',
  'templates',
];
const STORE_FEATURES = [
  'machines',
  'host-terminal',
  'host-power',
  'host-fast-reboot',
  'monitoring',
  'zfs',
  'swap',
  'provisioning',
  'vnics',
  'services',
  'processes',
  'system-users',
  'time-sync',
  'packages',
  'boot-environments',
  'fault-management',
];
const AGENT_FEATURES = [
  'machines',
  'tasks',
  'host-terminal',
  'host-power',
  'machine-suspend',
  'host-launchers',
  'guest-agent',
  'machine-screenshot',
  'monitoring',
  'swap',
  'provisioning',
  'provisioner-registry',
  'network-spaces',
  'machine-create',
  'machine-modify',
  'machine-snapshots',
  'templates',
  'artifacts',
  'processes',
  'secrets',
];
const LIVE_AGENT_FEATURES = [
  'tasks',
  'machines',
  'machine-suspend',
  'machine-create',
  'machine-modify',
  'machine-snapshots',
  'machine-screenshot',
  'swap',
  'monitoring',
  'processes',
  'provisioning',
  'provisioner-registry',
  'secrets',
  'ssh',
  'templates',
  'host-launchers',
  'host-terminal',
  'hosts-file',
  'dns',
  'hostname',
  'ip-addresses',
  'network-spaces',
  'hosts',
  'footer',
  'health',
  'events',
  'admin',
  'setup',
  'host-power',
  'artifacts',
  'file-browser',
  'guest-agent',
];
const CPU_TIMES = { user: 914520, nice: 0, sys: 402310, idle: 8812400, irq: 0 };
const STREAMING_AGENT = 'hyperweaver-agent';
const AGENT_EVENTS = { path: '/api/events', topics: ['health', 'tasks', 'hosts'] };

const streamed = capabilities =>
  capabilities.agent === STREAMING_AGENT
    ? {
        ...capabilities,
        events: AGENT_EVENTS,
        features: uniqueOf([...capabilities.features, 'events']),
      }
    : capabilities;

const machine = (name, status, hypervisor, notes = '') => ({
  name,
  status,
  brand: hypervisor,
  hypervisor,
  notes,
  tags: [],
});

const DESK_MACHINES = [
  machine('build-win11', 'running', 'virtualbox', 'Nightly builds'),
  machine('ci-runner-1', 'running', 'virtualbox'),
  machine('ci-runner-2', 'running', 'virtualbox'),
  machine('db-replica', 'stopped', 'virtualbox', 'Replica of the staging database'),
  machine('kiosk-demo', 'aborted', 'virtualbox'),
  machine('legacy-xp', 'suspended', 'virtualbox', 'Kept for one accounting program'),
  machine('qa-ubuntu', 'paused', 'virtualbox'),
];
const LAB_MACHINES = [
  machine('mirror', 'stopped', 'virtualbox', 'Package mirror'),
  machine('vpn-gw', 'running', 'virtualbox'),
];
const ZONE_MACHINES = [
  machine('broken-1', 'incomplete', 'bhyve', 'Install stopped half way'),
  machine('build-1', 'installed', 'bhyve'),
  machine('cache-1', 'suspended', 'bhyve'),
  machine('db-1', 'running', 'bhyve', 'Primary database'),
  machine('mail-1', 'running', 'bhyve'),
  machine('old-1', 'configured', 'bhyve', 'Detached, waiting for its new host'),
  machine('stage-1', 'ready', 'bhyve'),
];
const STUDIO_MACHINES = [
  machine('ios-build', 'running', 'utm', 'Signs the mobile builds'),
  machine('mac-test', 'stopped', 'utm'),
  machine('win-arm', 'running', 'virtualbox'),
  machine('docs-site', 'paused', 'virtualbox'),
];
const ATTIC_MACHINES = [
  machine('archive-1', 'stopped', 'virtualbox', 'Holds the old project archives'),
  machine('sandbox', 'running', 'virtualbox'),
];
const STORE_MACHINES = [
  machine('backup-1', 'installed', 'bhyve', 'Nightly backups land here'),
  machine('nfs-1', 'running', 'bhyve'),
];
const STUDIO_APPLICATIONS = [
  { name: 'utm', path: '/Applications/UTM.app/Contents/MacOS/UTM', args: [], exists: true },
  { name: 'royal-tsx', path: '/Applications/Royal TSX.app', args: [], exists: false },
  { name: 'screens', path: '/Applications/Screens 5.app', args: ['--new-window'], exists: true },
];
const MACHINE_ORGS = {
  1: {
    'ci-runner-1': [ORG_UUIDS.acme],
    'ci-runner-2': [ORG_UUIDS.acme],
    'db-replica': [ORG_UUIDS.prominic],
    'qa-ubuntu': [ORG_UUIDS.acme, ORG_UUIDS.prominic],
  },
  2: { mirror: [ORG_UUIDS.prominic], 'vpn-gw': [ORG_UUIDS.acme] },
  3: {
    'db-1': [ORG_UUIDS.prominic],
    'mail-1': [ORG_UUIDS.prominic],
    'build-1': [ORG_UUIDS.acme],
    'stage-1': [ORG_UUIDS.acme],
  },
  5: { 'backup-1': [ORG_UUIDS['nomad-field-team']] },
};
const LISTS = ['allmachines', 'runningmachines'];
const INVALID_ZONES = { 'web-2': fixture('zones', 'verify-200.json').output };

const factsOf = ({ hostname, platform, arch, type, release, version, model, cores, memory }) => ({
  hostname,
  eol: '\n',
  arch,
  cpus: [...Array(cores).keys()].map(() => ({ model, speed: 2400, times: CPU_TIMES })),
  endianness: 'LE',
  freemem: memory / 4,
  loadavg: [0.42, 0.37, 0.31],
  platform,
  release,
  totalmem: memory,
  type,
  uptime: 1036800,
  version,
});

const STUDIO_FACTS = factsOf({
  hostname: 'mac-1',
  platform: 'darwin',
  arch: 'arm64',
  type: 'Darwin',
  release: '25.0.0',
  version: 'Darwin Kernel Version 25.0.0',
  model: 'Apple M4 Pro',
  cores: 12,
  memory: 48 * GIB,
});
const STORE_FACTS = factsOf({
  hostname: 'store-1',
  platform: 'sunos',
  arch: 'x64',
  type: 'SunOS',
  release: '5.11',
  version: 'omnios-r151054',
  model: 'Intel(R) Xeon(R) Silver 4310 CPU @ 2.10GHz',
  cores: 24,
  memory: 256 * GIB,
});

const ATTIC_FACTS = factsOf({
  hostname: 'attic-1',
  platform: 'linux',
  arch: 'x64',
  type: 'Linux',
  release: '6.12.0',
  version: 'Debian 13',
  model: 'Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz',
  cores: 6,
  memory: 32 * GIB,
});

const factsFrom = (folder, file) => {
  const entries = Object.entries(fixture(folder, file));
  return Object.fromEntries(entries.filter(([key]) => !LISTS.includes(key)));
};

const hostOf = ({ id, kind, facts, machines, kept = [], applications = [], count = 12 }) => {
  const names = machines.map(row => row.name);
  const seeded = seedTasks({ machines: names, kept: kept.map(([task]) => task), count });
  return {
    id,
    kind,
    online: true,
    facts,
    machines,
    applications,
    tasks: seeded.tasks,
    outputs: new Map([...kept.map(([task, output]) => [task.id, output]), ...seeded.outputs]),
    runs: new Map(),
    streams: new Map(),
    terminals: new Map(),
  };
};

const fixtureTasks = () => {
  const answer = fixture('hosts', 'task-output-200.json');
  return fixture('hosts', 'tasks-200.json').tasks.map(task => [
    task,
    task.id === answer.task_id ? answer.output : [],
  ]);
};

const deskHost = id =>
  hostOf({
    id,
    kind: 'hyperweaver',
    facts: factsFrom('hosts', 'agents-1-stats.json'),
    machines: [...fixture('hosts', 'agents-1-machines.json').machines, ...DESK_MACHINES],
    kept: fixtureTasks(),
    applications: fixture('hosts', 'applications-200.json').applications,
    count: 48,
  });

const labHost = id =>
  hostOf({
    id,
    kind: 'hyperweaver',
    facts: factsFrom('agent', 'stats.json'),
    machines: [...fixture('agent', 'machines.json').machines, ...LAB_MACHINES],
  });

const agentHost = id =>
  hostOf({
    id,
    kind: 'hyperweaver',
    facts: factsFrom('agent', 'stats.json'),
    machines: [...fixture('agent', 'machines.json').machines, ...LAB_MACHINES],
    kept: fixtureTasks(),
    applications: fixture('hosts', 'applications-200.json').applications,
    count: 48,
  });

const zoneHost = id =>
  hostOf({
    id,
    kind: 'zoneweaver',
    facts: factsFrom('zones', 'stats.json'),
    machines: [...fixture('zones', 'machines.json').machines, ...ZONE_MACHINES],
    count: 20,
  });

const studioHost = id =>
  hostOf({
    id,
    kind: 'hyperweaver',
    facts: STUDIO_FACTS,
    machines: STUDIO_MACHINES,
    applications: STUDIO_APPLICATIONS,
  });

const storeHost = id =>
  hostOf({ id, kind: 'zoneweaver', facts: STORE_FACTS, machines: STORE_MACHINES, count: 4 });

const atticHost = id => ({
  ...hostOf({ id, kind: 'hyperweaver', facts: ATTIC_FACTS, machines: ATTIC_MACHINES, count: 2 }),
  online: false,
});

const selfHost = () => (ZONE_MODE ? zoneHost(SELF) : agentHost(SELF));

const registryHosts = () => [
  ['1', deskHost(1)],
  ['2', labHost(2)],
  ['3', zoneHost(3)],
  ['4', studioHost(4)],
  ['5', storeHost(5)],
  ['6', atticHost(6)],
];

export const hosts = new Map(AGENT_MODE ? [[SELF, selfHost()]] : registryHosts());

const agentRow = ({ first, id, hostname, name, capabilities, orgs = [] }) => ({
  ...first,
  id,
  hostname,
  entity_name: name,
  capabilities,
  org_uuids: orgs,
});

const capabilitiesFrom = (folder, features, added = []) => {
  const agent = fixture(folder, 'status.json');
  const own = agent.features.filter(token => !CHROME_TOKENS.includes(token));
  return streamed({
    role: 'agent',
    agent: agent.agent,
    hypervisors: agent.hypervisors,
    platform: agent.platform,
    arch: agent.arch,
    version: agent.version,
    hostname: agent.hostname,
    console: agent.console,
    features: features || uniqueOf([...own, ...added]),
  });
};

const STUDIO_CAPABILITIES = streamed({
  role: 'agent',
  agent: 'hyperweaver-agent',
  hypervisors: ['virtualbox', 'utm'],
  platform: 'darwin',
  arch: 'aarch64',
  version: '1.2.0',
  hostname: 'mac-1',
  console: ['rdp', 'vnc'],
  features: STUDIO_FEATURES,
});
const STORE_CAPABILITIES = {
  role: 'agent',
  agent: 'zoneweaver-agent',
  hypervisors: ['bhyve'],
  platform: 'omnios',
  arch: 'x86_64',
  version: '0.2.2',
  hostname: 'store-1',
  console: ['vnc', 'zlogin'],
  features: STORE_FEATURES,
};

export const ATTIC_ID = 6;

export const ATTIC_CAPABILITIES = streamed({
  role: 'agent',
  agent: 'hyperweaver-agent',
  hypervisors: ['virtualbox'],
  platform: 'linux',
  arch: 'x86_64',
  version: '1.1.9',
  hostname: 'attic-1',
  console: ['rdp'],
  features: [
    'machines',
    'tasks',
    'host-terminal',
    'host-power',
    'machine-suspend',
    'monitoring',
    'swap',
  ],
});

const registryRows = () => {
  const [first] = fixture('hosts', 'servers.json').servers;
  const desk = {
    ...first,
    capabilities: streamed({
      ...first.capabilities,
      console: DESK_CONSOLES,
      features: uniqueOf([...first.capabilities.features, ...DESK_FEATURES]),
    }),
    org_uuids: [ORG_UUIDS.acme],
  };
  return [
    desk,
    agentRow({
      first,
      id: 2,
      hostname: 'lab-1.example.com',
      name: 'Lab',
      capabilities: capabilitiesFrom('agent', LAB_FEATURES),
    }),
    agentRow({
      first,
      id: 3,
      hostname: 'zone-1.example.com',
      name: 'Zones',
      capabilities: capabilitiesFrom('zones', null, ZONE_FEATURES),
      orgs: [ORG_UUIDS.acme, ORG_UUIDS.prominic],
    }),
    agentRow({
      first,
      id: 4,
      hostname: 'mac-1.example.com',
      name: 'Studio',
      capabilities: STUDIO_CAPABILITIES,
      orgs: [ORG_UUIDS['nomad-field-team']],
    }),
    agentRow({
      first,
      id: 5,
      hostname: 'store-1.example.com',
      name: '',
      capabilities: STORE_CAPABILITIES,
    }),
    agentRow({
      first,
      id: ATTIC_ID,
      hostname: 'attic-1.example.com',
      name: 'Attic',
      capabilities: null,
      orgs: [ORG_UUIDS.acme],
    }),
  ];
};

export const REGISTRY = AGENT_MODE ? [] : registryRows();

/**
 * Register an agent the settings page's Servers tab added: a host of the
 * Lab kind under the new id and a registry row carrying the address, the
 * entity name and the self-signed flag the form sent.
 *
 * @param {Object} row - `id`, `hostname`, `port`, `protocol`, `entityName` and `allowInsecure`
 * @returns {void}
 */
export const registerHost = ({ id, hostname, port, protocol, entityName, allowInsecure }) => {
  const [first] = fixture('hosts', 'servers.json').servers;
  hosts.set(String(id), labHost(id));
  REGISTRY.push({
    ...agentRow({
      first,
      id,
      hostname,
      name: entityName,
      capabilities: capabilitiesFrom('agent', LAB_FEATURES),
    }),
    port,
    protocol,
    allow_insecure: allowInsecure,
    created_at: new Date().toISOString(),
  });
};

/**
 * Change whether the server accepts a registered agent's self-signed
 * certificate, the one editable member of a registry row.
 *
 * @param {string|number} id - The registry id
 * @param {boolean} allowInsecure - Whether to accept it
 * @returns {void}
 */
export const setAllowInsecure = (id, allowInsecure) => {
  const row = REGISTRY.find(entry => String(entry.id) === String(id));
  if (row) {
    row.allow_insecure = allowInsecure;
  }
};

/**
 * Remove an agent from the registry and its host with it.
 *
 * @param {string|number} id - The registry id
 * @returns {void}
 */
export const unregisterHost = id => {
  const index = REGISTRY.findIndex(entry => String(entry.id) === String(id));
  if (index >= 0) {
    REGISTRY.splice(index, 1);
  }
  hosts.delete(String(id));
};

const STATUS_FOLDER = (() => {
  if (ZONE_MODE) {
    return 'zones';
  }
  return AGENT_MODE ? 'agent' : 'hosts';
})();

const statusBase = fixture(STATUS_FOLDER, 'status.json');
const agentFeatures = ZONE_MODE ? ZONE_FEATURES : AGENT_FEATURES;
const ownFeatures = AGENT_MODE ? agentFeatures : [];

/**
 * The status fixture of the role the mock stands in for: on the
 * `hyperweaver-agent` role the tokens the agent's own status handler
 * advertises, its platform tokens and the four its configuration gates,
 * as that agent answers them, no chrome token it does not list; on the
 * `zoneweaver-agent` role the fixture's tokens with the ones the host
 * page's Overview and its charts are gated by.
 */
export const ROLE_STATUS = {
  ...statusBase,
  features: APIKEY_MODE ? LIVE_AGENT_FEATURES : uniqueOf([...statusBase.features, ...ownFeatures]),
};

export const hostFor = id => hosts.get(AGENT_MODE ? SELF : String(id)) || null;

export const rowOf = host => REGISTRY.find(row => String(row.id) === String(host.id)) || null;

/**
 * Whether the server reaches a host, and the registry row's capabilities
 * with it: a host it cannot reach keeps its row and loses them.
 *
 * @param {Object} host - The host
 * @param {boolean} online - Whether the agent answers
 * @returns {void}
 */
export const setOnline = (host, online) => {
  const row = rowOf(host);
  host.online = online;
  if (row) {
    row.capabilities = online ? ATTIC_CAPABILITIES : null;
  }
};

export const featuresOf = host =>
  (AGENT_MODE ? ROLE_STATUS.features : rowOf(host)?.capabilities?.features) || [];

export const hypervisorsOf = host =>
  (AGENT_MODE ? ROLE_STATUS.hypervisors : rowOf(host)?.capabilities?.hypervisors) || [];

export const labelOf = host => rowOf(host)?.entity_name || host.facts.hostname || String(host.id);

export const offline = host =>
  typedProblem({
    status: 502,
    name: 'bad-gateway',
    title: `The agent of ${labelOf(host)} did not answer`,
  });

export const machineOf = (host, name) => host.machines.find(row => row.name === name) || null;

/**
 * The organizations a machine belongs to, as the server role holds them
 * beside its registry and never the agent: the uuids of the machine's
 * own assignment, an empty list for a machine assigned to none.
 *
 * @param {Object} host - The host
 * @param {string} name - The machine name
 * @returns {Array<string>} The uuids
 */
export const machineOrgsOf = (host, name) => MACHINE_ORGS[host.id]?.[name] || [];

/**
 * Replace the organizations a machine belongs to, the server role's own
 * table and never the agent's.
 *
 * @param {Object} host - The host
 * @param {string} name - The machine name
 * @param {Array<string>} uuids - The organization uuids
 * @returns {void}
 */
export const setMachineOrgs = (host, name, uuids) => {
  MACHINE_ORGS[host.id] = { ...(MACHINE_ORGS[host.id] || {}), [name]: uuids };
};

export const runningOf = host =>
  host.machines.filter(row => row.status === 'running').map(row => row.name);

/**
 * One host's stats as `GET stats` answers them: the host's own facts, the
 * uptime counted on from the mock's start, every machine's name and the
 * names of the running ones.
 *
 * @param {Object} host - The host
 * @returns {Object} The stats
 */
export const statsOf = host => ({
  ...host.facts,
  uptime: Number(host.facts.uptime) + secondsUp(),
  allmachines: host.machines.map(row => row.name),
  runningmachines: runningOf(host),
});

export const setStatus = (host, name, status) => {
  host.machines = host.machines.map(row => (row.name === name ? { ...row, status } : row));
};

export const removeMachine = (host, name) => {
  host.machines = host.machines.filter(row => row.name !== name);
};

export const verdictOf = name => {
  const output = INVALID_ZONES[name] || '';
  return { valid: !output, output };
};
