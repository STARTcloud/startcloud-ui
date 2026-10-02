import { gatesOf } from './capabilities';
import { machineNoun } from './hosts';
import { canRestartMachines, canStartStopMachines } from './permissions';

const NOUN_KEYS = {
  zone: { one: 'common.nounZone', many: 'common.nounZones' },
  machine: { one: 'common.nounMachine', many: 'common.nounMachines' },
};

const STATUS_TONES = {
  running: 'success',
  starting: 'info',
  stopping: 'info',
  shutting_down: 'info',
  suspended: 'warning',
  paused: 'warning',
  configured: 'warning',
  installed: 'warning',
  ready: 'warning',
  stopped: 'danger',
  aborted: 'danger',
  incomplete: 'danger',
  down: 'danger',
};

const SENTENCES = {
  running: 'machine.machineListPanel.runningSentence',
  stopped: 'machine.machineListPanel.stoppedSentence',
  paused: 'machine.machineListPanel.pausedSentence',
  suspended: 'machine.machineListPanel.suspendedSentence',
  configured: 'machine.machineListPanel.configuredSentence',
  starting: 'machine.machineListPanel.transitioningSentence',
  stopping: 'machine.machineListPanel.transitioningSentence',
};

const GUEST_ADDRESS = /^\/VirtualBox\/GuestInfo\/Net\/(?<nic>\d+)\/V4\/IP$/u;

const CLOUD_INIT_PREFIX = '/Hyperweaver/CloudInit/';

const ZONE_FACTS = [
  { key: 'zonename', labelKey: 'machine.machineInfo.nameLabel', kind: 'code' },
  { key: 'zonepath', labelKey: 'machine.machineInfo.pathLabel', kind: 'code' },
  { key: 'bootargs', labelKey: 'machine.machineInfo.bootArgsLabel', kind: 'code' },
  { key: 'hostid', labelKey: 'machine.machineInfo.hostIdLabel', kind: 'badge' },
  { key: 'pool', labelKey: 'machine.machineInfo.poolLabel', kind: 'badge' },
  { key: 'scheduling-class', labelKey: 'machine.machineInfo.schedulingClassLabel', kind: 'badge' },
  { key: 'limitpriv', labelKey: 'machine.machineInfo.limitPrivilegesLabel', kind: 'badge' },
  { key: 'fs-allowed', labelKey: 'machine.machineInfo.fsAllowedLabel', kind: 'badge' },
];

const ZONE_SPECS = [
  { key: 'ram', labelKey: 'machine.machineHardware.ramLabel', kind: 'text' },
  { key: 'vcpus', labelKey: 'machine.machineHardware.vcpusLabel', kind: 'text' },
  { key: 'bootrom', labelKey: 'machine.machineHardware.bootromLabel', kind: 'code' },
  { key: 'hostbridge', labelKey: 'machine.machineHardware.hostBridgeLabel', kind: 'code' },
  { key: 'brand', labelKey: 'machine.machineHardware.brandLabel', kind: 'code' },
  { key: 'type', labelKey: 'machine.machineHardware.typeLabel', kind: 'code' },
  { key: 'acpi', labelKey: 'machine.machineHardware.acpiLabel', kind: 'enabled', on: 'true' },
  {
    key: 'autoboot',
    labelKey: 'machine.machineHardware.autoBootLabel',
    kind: 'enabled',
    on: 'true',
  },
  { key: 'uefivars', labelKey: 'machine.machineHardware.uefiVarsLabel', kind: 'switch', on: 'on' },
  { key: 'xhci', labelKey: 'machine.machineHardware.xhciLabel', kind: 'switch', on: 'on' },
  { key: 'rng', labelKey: 'machine.machineHardware.rngLabel', kind: 'switch', on: 'on' },
  {
    key: 'cloud-init',
    labelKey: 'machine.machineHardware.cloudInitLabel',
    kind: 'switch',
    on: 'on',
  },
];

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const listOf = value => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
};

/**
 * The key one machine's detail is held under, the host and the machine's
 * name.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {string} The key
 */
export const detailKey = (id, name) => `${id}|${name}`;

/**
 * The key of the word the listed servers' instances go by,
 * hyperweaver-ui's resource label: the zone's while every server names
 * `bhyve` alone and the machine's otherwise (`machineNoun`), the word of
 * one instance or, with `many`, of several. The word is written with a
 * capital; a sentence that takes it inside lower-cases it.
 *
 * @param {Array<Object>} servers - The registry rows
 * @param {boolean} [many] - Whether the word names several
 * @returns {string} The locale key
 */
export const nounKeyOf = (servers, many = false) =>
  NOUN_KEYS[machineNoun(servers)][many ? 'many' : 'one'];

/**
 * The route of one machine's page, the machine's name encoded.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {string} The path
 */
export const machineRoute = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

/**
 * The machine a task's row is for, read under the member the agent that
 * answered the row names it by: `machine_name` in a row of
 * hyperweaver-agent and `zone_name` in a row of zoneweaver-agent's task
 * routes; empty for a row that carries neither. The one reader of a task
 * row's machine, so a row of either agent finds the copies it staled.
 *
 * @param {Object|null} row - The task row, of a read or of `task-updated`
 * @returns {string} The machine name, or the empty string
 */
export const taskMachineOf = row => String(row?.machine_name || row?.zone_name || '');

/**
 * Whether a route names a machine its host does not have: true once the
 * host's stats, its machine rows and the machine's detail have each
 * answered or are not offered, and none of the three names the machine;
 * false while any of them is still asked for, and false while the stats
 * failed, because a host that cannot be reached says nothing of its
 * machines.
 *
 * @param {Object} options - What the page holds of the machine
 * @param {string} options.name - The machine name of the route
 * @param {Object|null} options.stats - The host's stats
 * @param {boolean} options.failed - Whether the stats failed
 * @param {{ machine: Object|null, settled: boolean }} options.row - The machine's row and whether the rows answered
 * @param {{ detail: Object|null, settled: boolean }} options.answer - The detail and whether it answered
 * @returns {boolean} True when the machine is not on the host
 */
export const isUnknownMachine = ({ name, stats, failed, row, answer }) => {
  if (failed || !row.settled || !answer.settled) {
    return false;
  }
  const named = Array.isArray(stats?.allmachines) && stats.allmachines.includes(name);
  return !named && !row.machine && !answer.detail;
};

/**
 * The word a machine's row reads as its state, lower-cased, `unknown`
 * while the row carries none.
 *
 * @param {Object|null} row - The machine's row
 * @returns {string} The status
 */
export const statusOf = row => String(row?.status || 'unknown').toLowerCase();

/**
 * The tone a machine's status draws in, hyperweaver-ui's: success while it
 * runs, info while it starts or stops, warning while it is held or not
 * yet booted (suspended, paused, configured, installed, ready), danger
 * while it is off or broken (stopped, aborted, incomplete, down) and
 * secondary for every other word.
 *
 * @param {string} status - The machine's status
 * @returns {string} The Bootstrap tone
 */
export const statusTone = status => STATUS_TONES[String(status || '').toLowerCase()] || 'secondary';

/**
 * The key of the sentence that says a machine's state in words,
 * hyperweaver-ui's own, empty for a status that has none.
 *
 * @param {string} status - The machine's status
 * @returns {string} The locale key, or the empty string
 */
export const sentenceKey = status => SENTENCES[String(status || '').toLowerCase()] || '';

/**
 * A row's configuration, the object both agents answer it as, an empty
 * object while the row carries none.
 *
 * @param {Object|null} row - The machine's row, or the detail answer
 * @returns {Object} The configuration
 */
export const configurationOf = row => (isObject(row?.configuration) ? row.configuration : {});

/**
 * A machine's tags as a list of strings, none while the row carries no
 * list.
 *
 * @param {Object|null} row - The machine's row
 * @returns {Array<string>} The tags
 */
export const tagsOf = row => (Array.isArray(row?.tags) ? row.tags.map(String) : []);

/**
 * The provisioner a machine was made from, `name/version`, read as each
 * agent answers it: hyperweaver-agent's `spec.provisioner`, `{ name,
 * version }`, and zoneweaver-agent's `configuration.provisioner`,
 * `{ provisioner_name, provisioner_version }`; empty for a machine
 * without one.
 *
 * @param {Object|null} row - The machine's row
 * @returns {string} The reference, or the empty string
 */
export const provisionerOf = row => {
  const spec = row?.spec?.provisioner;
  if (spec?.name) {
    return `${spec.name}/${spec.version}`;
  }
  const document = configurationOf(row).provisioner;
  return document?.provisioner_name
    ? `${document.provisioner_name}/${document.provisioner_version || '?'}`
    : '';
};

const documentRole = role => (typeof role === 'string' ? role : role?.name);

/**
 * The roles a machine carries, read as each agent answers them:
 * hyperweaver-agent's `spec.roles`, the names of the enabled ones, and
 * zoneweaver-agent's `configuration.provisioner.roles`, names or rows
 * that carry one.
 *
 * @param {Object|null} row - The machine's row
 * @returns {Array<string>} The role names
 */
export const rolesOf = row => {
  if (Array.isArray(row?.spec?.roles)) {
    return row.spec.roles.filter(role => role?.enabled && role.name).map(role => role.name);
  }
  const roles = configurationOf(row).provisioner?.roles;
  return Array.isArray(roles) ? roles.map(documentRole).filter(Boolean) : [];
};

const settingsOf = row => {
  if (isObject(row?.spec?.settings)) {
    return row.spec.settings;
  }
  const { settings } = configurationOf(row);
  return isObject(settings) ? settings : {};
};

/**
 * The system line of a machine, its processors, its memory and the box
 * it was made from, read from hyperweaver-agent's `spec.settings` or
 * zoneweaver-agent's `configuration.settings`, the parts a row carries
 * joined by a middle dot.
 *
 * @param {Object|null} row - The machine's row
 * @param {Function} t - The translator
 * @returns {string} The line, empty for a row that carries no part
 */
export const systemLine = (row, t) => {
  const settings = settingsOf(row);
  return [
    settings.vcpus ? t('hosts.machines.vcpus', { count: Number(settings.vcpus) }) : '',
    settings.memory ? t('hosts.machines.ram', { memory: settings.memory }) : '',
    settings.box ? String(settings.box) : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

/**
 * Whether a machine's row matches the navbar's query: its name, its
 * server id, a tag, its provisioner or its hypervisor.
 *
 * @param {Object} row - The machine's row
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when the row matches
 */
export const matchesMachine = (row, needle) =>
  [
    row.name || '',
    String(row.server_id ?? ''),
    provisionerOf(row),
    row.hypervisor || '',
    ...tagsOf(row),
  ].some(text => text.toLowerCase().includes(needle));

/**
 * The counts the machines heading draws: every row, the running ones and
 * the rest.
 *
 * @param {Array<Object>} rows - The machine rows
 * @returns {{ total: number, running: number, stopped: number }} The counts
 */
export const machineCounts = rows => {
  const running = rows.filter(row => statusOf(row) === 'running').length;
  return { total: rows.length, running, stopped: rows.length - running };
};

/**
 * The actions a machine's row of the list offers, by the person's role,
 * the machine's own status and the gates the Controls menu shares
 * (`gatesOf`): Power on while it neither runs nor is paused; Pause,
 * Suspend, Shutdown and Restart while it runs, the first two behind their
 * gates; Resume behind its gate.
 *
 * @param {Object} options - The host's row, the machine's row and the role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @param {string} [options.role] - The person's role
 * @returns {{ start: boolean, pause: boolean, suspend: boolean, shutdown: boolean, resume: boolean, restart: boolean }} The actions offered
 */
export const rowActionsOf = ({ server, machine, role }) => {
  const status = statusOf(machine);
  const gates = gatesOf({ server, machine });
  const operate = canStartStopMachines(role);
  const running = status === 'running';
  return {
    start: operate && !running && status !== 'paused',
    pause: operate && running && gates.pause,
    suspend: operate && running && gates.suspend,
    shutdown: operate && running,
    resume: operate && gates.resume,
    restart: operate && running && canRestartMachines(role),
  };
};

const deviceValue = entry => {
  if (typeof entry === 'string') {
    return entry;
  }
  return entry?.path || entry?.name || JSON.stringify(entry);
};

const bootDisks = configuration =>
  configuration.bootdisk
    ? [
        {
          name: 'bootdisk',
          value: deviceValue(configuration.bootdisk),
          size: configuration.bootdisk?.size || '',
          boot: true,
        },
      ]
    : [];

const zoneNic = (entry, index) => ({
  name: `net${index}`,
  physical: entry?.physical || '',
  allowedAddress: entry?.['allowed-address'] || '',
  mac: entry?.['mac-addr'] || entry?.mac || '',
  globalNic: entry?.['global-nic'] || '',
  vlanId: entry?.['vlan-id'] === undefined ? '' : String(entry['vlan-id']),
  address: entry?.address || '',
  defrouter: entry?.defrouter || '',
});

/**
 * The devices of a zone as its configuration names them, the boot disk,
 * the disks, the CD and DVD drives and the network resources; null for a
 * configuration that is no zone's or names no device.
 *
 * @param {Object} configuration - The detail answer's `configuration`
 * @returns {{ disks: Array<Object>, cdroms: Array<Object>, nics: Array<Object> }|null} The devices
 */
export const zoneHardware = configuration => {
  if (!configuration?.zonename) {
    return null;
  }
  const disks = [
    ...bootDisks(configuration),
    ...listOf(configuration.disk).map((entry, index) => ({
      name: `disk${index}`,
      value: deviceValue(entry),
      size: entry?.size || '',
      boot: false,
    })),
  ];
  const cdroms = listOf(configuration.cdrom).map((entry, index) => ({
    name: `cdrom${index}`,
    value: deviceValue(entry),
  }));
  const nics = listOf(configuration.net).map(zoneNic);
  return disks.length + cdroms.length + nics.length > 0 ? { disks, cdroms, nics } : null;
};

/**
 * The hardware a machine's detail answer carries: hyperweaver-agent's
 * `knob_current.devices`, its storage controllers, the media attached to
 * them and its network adapters, and the devices of a zone from
 * zoneweaver-agent's `configuration`.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {{ controllers: Array<Object>, attachments: Array<Object>, nics: Array<Object>, zone: Object|null }} The hardware
 */
export const hardwareOf = detail => {
  const devices = detail?.knob_current?.devices;
  return {
    nics: Array.isArray(devices?.nics) ? devices.nics : [],
    controllers: Array.isArray(devices?.controllers) ? devices.controllers : [],
    attachments: Array.isArray(devices?.attachments) ? devices.attachments : [],
    zone: zoneHardware(configurationOf(detail)),
  };
};

/**
 * Whether a machine's hardware names a device to draw.
 *
 * @param {Object} hardware - The hardware of `hardwareOf`
 * @returns {boolean} True when it names one
 */
export const hasDevices = hardware =>
  Boolean(hardware.zone) ||
  hardware.controllers.length + hardware.attachments.length + hardware.nics.length > 0;

/**
 * The line of one network adapter of a hyperweaver-agent machine: its
 * mode, the network it is on and its MAC address.
 *
 * @param {Object} nic - The adapter, `{ adapter, mode, network?, mac? }`
 * @param {Function} t - The translator
 * @returns {string} The line
 */
export const nicSummary = (nic, t) =>
  [
    nic.mode,
    nic.network ? t('hosts.machines.devices.onNetwork', { network: nic.network }) : '',
    nic.mac,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The line of one network resource of a zone: its link, the link it
 * runs over, its allowed address and its MAC address.
 *
 * @param {Object} nic - The resource as `zoneHardware` answers it
 * @param {Function} t - The translator
 * @returns {string} The line
 */
export const zoneNicSummary = (nic, t) =>
  [
    nic.physical,
    nic.globalNic ? t('hosts.machines.devices.overLink', { link: nic.globalNic }) : '',
    nic.allowedAddress,
    nic.mac,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The facts of a zone the machine information draws, each only while the
 * zone's configuration carries it: the zone's name and path, its boot
 * arguments, host id, pool, scheduling class, privileges and allowed
 * file systems.
 *
 * @param {Object} configuration - The detail answer's `configuration`
 * @returns {Array<{ key: string, labelKey: string, kind: string, value: string }>} The facts
 */
export const zoneFacts = configuration => {
  if (!configuration?.zonename) {
    return [];
  }
  return ZONE_FACTS.filter(fact => configuration[fact.key]).map(fact => ({
    ...fact,
    value: String(configuration[fact.key]),
  }));
};

/**
 * The specifications of a zone the hardware card draws, the values its
 * configuration carries: a plain value as it is, a switch as `on` while
 * the value reads the word that turns it on.
 *
 * @param {Object} configuration - The detail answer's `configuration`
 * @returns {Array<{ key: string, labelKey: string, kind: string, value: string, on: boolean }>} The specifications
 */
export const zoneSpecs = configuration => {
  if (!configuration?.zonename) {
    return [];
  }
  return ZONE_SPECS.map(spec => ({
    key: spec.key,
    labelKey: spec.labelKey,
    kind: spec.kind,
    value: String(configuration[spec.key] ?? ''),
    on: String(configuration[spec.key]) === spec.on,
  }));
};

/**
 * The port a zone's web console answers on: `pinned` while its
 * configuration pins one, `knob_current.consoleport`, `live` while the
 * machine's row carries the port of a session, `vnc_port`, and `auto`
 * while the agent hands out the next free port of its pool.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {{ kind: string, port: string }} The port and how it came about
 */
export const consolePortOf = detail => {
  const pinned = detail?.knob_current?.consoleport;
  if (pinned) {
    return { kind: 'pinned', port: String(pinned) };
  }
  const live = detail?.machine_info?.vnc_port;
  return live ? { kind: 'live', port: String(live) } : { kind: 'auto', port: '' };
};

/**
 * The NAT port forwards a machine's configuration carries, none while it
 * carries no list.
 *
 * @param {Object|null} detail - The answer of `GET machines/{name}`
 * @returns {Array<Object>} The rows, `{ name, protocol, host_ip, host_port, guest_ip, guest_port, adapter? }`
 */
export const natForwardsOf = detail => {
  const forwards = configurationOf(detail).nat_forwards;
  return Array.isArray(forwards) ? forwards : [];
};

/**
 * One NAT port forward as a line, the rule's name, then the host's side
 * and the guest's, a star for an address the rule leaves open.
 *
 * @param {Object} forward - The row
 * @returns {string} The line
 */
export const forwardLine = forward => {
  const host = `${forward.host_ip || '*'}:${forward.host_port}`;
  const guest = `${forward.guest_ip || '*'}:${forward.guest_port}`;
  return `${forward.name}: ${host} → ${guest}`;
};

/**
 * The addresses the guest additions report, one a network adapter, from
 * the guest properties named `/VirtualBox/GuestInfo/Net/{n}/V4/IP`.
 *
 * @param {Array<Object>} properties - The rows of `GET machines/{name}/guest-properties`
 * @returns {Array<{ nic: string, ip: string }>} The addresses
 */
export const guestAddresses = properties =>
  properties
    .map(property => {
      const match = GUEST_ADDRESS.exec(property.name || '');
      return match ? { nic: match.groups.nic, ip: String(property.value) } : null;
    })
    .filter(Boolean);

/**
 * The cloud-init values the agent seeded a machine with, the guest
 * properties under `/Hyperweaver/CloudInit/`, each named without the
 * prefix.
 *
 * @param {Array<Object>} properties - The rows of `GET machines/{name}/guest-properties`
 * @returns {Array<{ name: string, value: string }>} The seeds
 */
export const cloudInitSeeds = properties =>
  properties
    .filter(property => (property.name || '').startsWith(CLOUD_INIT_PREFIX))
    .map(property => ({
      name: property.name.slice(CLOUD_INIT_PREFIX.length),
      value: String(property.value),
    }));

/**
 * The key of the words that name where a guest's addresses came from:
 * the guest additions, or the guest agent for every other source, in
 * the words of the hyperweaver-ui card that draws them, `scope` the
 * card's namespace, `machineInfo` or `machineGuestAgent`.
 *
 * @param {string} source - The `source` of `guest_info`
 * @param {string} scope - The namespace of the card under `machine`
 * @returns {string} The locale key
 */
export const guestSourceKey = (source, scope) =>
  `machine.${scope}.${source === 'additions' ? 'guestAdditionsSource' : 'guestAgentSource'}`;

/**
 * The tags a person typed, a comma between two, each trimmed and the
 * empty ones dropped.
 *
 * @param {string} text - The field's text
 * @returns {Array<string>} The tags
 */
export const parseTags = text =>
  String(text)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

/**
 * A machine's tags as the text the field holds, a comma and a space
 * between two.
 *
 * @param {Array<string>} tags - The tags
 * @returns {string} The text
 */
export const tagsText = tags => tags.join(', ');

/**
 * The organizations a machine belongs to, by name: each uuid of the
 * row's `org_uuids` as the name of the person's membership that carries
 * it and as the uuid itself where none does; null for a row without the
 * list, the row of an agent served directly.
 *
 * @param {Object|null} row - The machine's row
 * @param {Array<Object>} memberships - The person's memberships, `{ uuid, name }`
 * @returns {Array<string>|null} The names, or null
 */
export const organizationsOf = (row, memberships) => {
  if (!Array.isArray(row?.org_uuids)) {
    return null;
  }
  return row.org_uuids.map(
    uuid => memberships.find(membership => membership.uuid === uuid)?.name || uuid
  );
};
