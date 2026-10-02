import {
  featuresOf,
  hypervisorsOf,
  machineOf,
  machineOrgsOf,
  rowOf,
  setMachineOrgs,
} from './fleet.js';
import { AGENT_MODE, ok, problem, refusal } from './kit.js';
import { isAdmin, manages, membershipsOf, organizations } from './people.js';
import { queue, settles } from './tasks.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const KIB = 1024;
const DEFAULT_MEMORY = 32 * GIB;
const SIZE_PATTERN = /^(?<amount>\d+(?:\.\d+)?)\s*(?<unit>[KMGTP])?B?$/iu;
const UNITS = { K: KIB, M: MIB, G: GIB, T: KIB ** 4, P: KIB ** 5 };
const IMMEDIATE_KEYS = [
  'boot_priority',
  'consoleport',
  'consolehost',
  'vagrant_user',
  'vagrant_user_pass',
  'vagrant_user_private_key_path',
];
const FLAG_KEYS = ['physical', 'adapter', 'remove_on_completion'];
const SCALAR_KEYS = [
  'ram',
  'vcpus',
  'bootrom',
  'hostbridge',
  'diskif',
  'netif',
  'os_type',
  'vnc',
  'acpi',
  'xhci',
  'uefivars',
  'rng',
  'bootorder',
  'bootnext',
  'autoboot',
  'guest_agent',
  'boot_order',
  'boot_priority',
  'consoleport',
  'consolehost',
  'cpu_configuration',
  'complex_cpu_conf',
];
const MACHINE_MISSING = 'Machine not found';
const NOT_RUNNING = 'Machine is not running';
const MUST_BE_OFF = 'Machine must be powered off';
const NO_CHANGES = 'No changes provided';
const USB_DEVICES = [
  {
    uuid: 'a1b2c3d4-0001-4000-8000-000000000001',
    address: '/dev/bus/usb/001/004',
    vendor_id: '0x0781',
    product_id: '0x5583',
    manufacturer: 'SanDisk',
    product: 'Ultra Fit',
    serial_number: '4C530001',
    port: 4,
    state: 'Busy',
  },
  {
    uuid: 'a1b2c3d4-0002-4000-8000-000000000002',
    address: '/dev/bus/usb/001/007',
    vendor_id: '0x1050',
    product_id: '0x0407',
    manufacturer: 'Yubico',
    product: 'YubiKey OTP+FIDO+CCID',
    serial_number: '',
    port: 7,
    state: 'Available',
  },
];
const VNIC_PROPERTIES = [
  { property: 'mtu', value: '1500', default: '1500', possible: [] },
  { property: 'maxbw', value: '', default: '', possible: [] },
  { property: 'priority', value: 'high', default: 'high', possible: ['low', 'medium', 'high'] },
  {
    property: 'protection',
    value: 'mac-nospoof',
    default: '',
    possible: ['mac-nospoof', 'ip-nospoof', 'dhcp-nospoof', 'restricted'],
  },
  { property: 'allowed-ips', value: '', default: '', possible: [] },
];
const DIRECTORIES = {
  '/': ['etc', 'home', 'rpool', 'var'],
  '/home': ['mark', 'shared'],
  '/home/mark': ['.ssh', 'id_ed25519', 'notes.txt'],
  '/home/mark/.ssh': ['id_ed25519', 'id_ed25519.pub', 'known_hosts'],
  '/rpool': ['iso', 'zones'],
  '/rpool/iso': ['debian-13.iso', 'omnios-r151054.iso'],
  '/var': ['log', 'tmp'],
  '/etc': ['hosts', 'resolv.conf'],
};
const OS_LINE = 'Linux dev 6.12.38+deb13-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux';

const stores = new Map();

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, {
      pending: new Map(),
      knobs: new Map(),
      filters: new Map(),
      execs: new Map(),
      vnicProps: new Map(),
      datasetProps: new Map(),
      nextPid: 4100,
    });
  }
  return stores.get(host.id);
};

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const running = row => row.status === 'running';

const operationOf = host => (isZone(host) ? 'zone_modify' : 'machine_modify');

const behind = (token, handler) => ctx =>
  offers(ctx.host, token) ? handler(ctx) : problem(404, 'Not Found');

const kind = (wanted, handler) => ctx =>
  ctx.host.kind === wanted ? handler(ctx) : problem(404, 'Not Found');

const found = handler => ctx => {
  const row = machineOf(ctx.host, nameOf(ctx));
  return row ? handler({ ...ctx, row }) : refusal(404, MACHINE_MISSING);
};

const bytesOf = value => {
  if (typeof value === 'number') {
    return value * MIB;
  }
  const match = SIZE_PATTERN.exec(String(value || '').trim());
  if (!match) {
    return 0;
  }
  const unit = (match.groups.unit || 'M').toUpperCase();
  return Number(match.groups.amount) * UNITS[unit];
};

const shortOf = (host, body) => {
  const requested = bytesOf(body.ram);
  const total = Number(host.facts.totalmem) || DEFAULT_MEMORY;
  const free = Number(host.facts.freemem) || total / 4;
  if (!requested || requested <= free) {
    return [];
  }
  return [
    {
      resource: 'memory',
      strategy: 'actual',
      message: `Requested ${(requested / GIB).toFixed(2)} GB exceeds available host memory (${(free / GIB).toFixed(2)} GB free)`,
      host_total_bytes: total,
      host_free_bytes: free,
      requested_bytes: requested,
      projected_percent: Number((((total - free + requested) / total) * 100).toFixed(2)),
    },
  ];
};

const warningsOf = (host, body) => {
  const requested = bytesOf(body.ram);
  const total = Number(host.facts.totalmem) || DEFAULT_MEMORY;
  const free = Number(host.facts.freemem) || total / 4;
  if (!requested || requested <= free / 2) {
    return [];
  }
  return [
    {
      resource: 'memory',
      level: 'warning',
      message: `Memory after this change would leave ${((free - requested) / GIB).toFixed(2)} GB free on the host`,
      projected_percent: Number((((total - free + requested) / total) * 100).toFixed(2)),
    },
  ];
};

const flagOnly = list =>
  Array.isArray(list) &&
  list.every(entry => Object.keys(entry).every(key => FLAG_KEYS.includes(key)));

const immediateOnly = body =>
  Object.keys(body).every(
    key =>
      IMMEDIATE_KEYS.includes(key) ||
      ((key === 'update_nics' || key === 'nics') && flagOnly(body[key]))
  );

/**
 * The knob values a machine's settings hold beyond what the detail seeds,
 * every scalar a completed modify task or an immediate write kept.
 *
 * @param {Object} host - The host
 * @param {Object} row - The machine the mock holds
 * @returns {Object} The knobs
 */
export const knobOverridesOf = (host, row) => storeOf(host).knobs.get(row.name) || {};

/**
 * The changes a running machine accrued for its next power cycle, null
 * while it accrued none.
 *
 * @param {Object} host - The host
 * @param {Object} row - The machine the mock holds
 * @returns {Object|null} The accrued changes
 */
export const pendingChangesOf = (host, row) => storeOf(host).pending.get(row.name) || null;

const keepKnobs = (host, name, changes) => {
  const { knobs } = storeOf(host);
  const kept = Object.fromEntries(
    Object.entries(changes).filter(([key]) => SCALAR_KEYS.includes(key))
  );
  knobs.set(name, { ...(knobs.get(name) || {}), ...kept });
};

const kept = (host, row, body) => {
  keepKnobs(host, row.name, body);
  return ok({
    success: true,
    machine_name: row.name,
    operation: operationOf(host),
    status: 'completed',
    message: isZone(host)
      ? 'Zone metadata updated successfully.'
      : 'Machine metadata updated successfully.',
    requires_restart: false,
  });
};

const resized = ({ row, body }) =>
  ok({
    success: true,
    machine_name: row.name,
    resized_disks: body.resize_disks.map(disk => ({
      name: disk.name,
      resized_to: disk.size,
      shrunk: Boolean(disk.allow_shrink),
      requires_restart: running(row),
      diskif: 'virtio',
    })),
    message: `Resized ${body.resize_disks.length} disk(s) of ${row.name}`,
  });

const accrued = ({ host, row, body }) => {
  const { pending } = storeOf(host);
  pending.set(row.name, { ...(pending.get(row.name) || {}), ...body });
  return ok({
    success: true,
    machine_name: row.name,
    operation: operationOf(host),
    status: 'pending_power_cycle',
    requires_restart: true,
    pending_changes: pending.get(row.name),
    message: `Changes accrued for ${row.name} — they apply at the next power cycle`,
  });
};

const queuedModify = ({ host, person, row, body }) => {
  const operation = operationOf(host);
  const task = queue({ host, by: person.username, operation, target: row.name, metadata: body });
  const warnings = warningsOf(host, body);
  return ok({
    success: true,
    task_id: task.id,
    machine_name: row.name,
    operation,
    status: 'pending',
    requires_restart: true,
    message: `Modification task queued for ${row.name}`,
    ...(warnings.length > 0 ? { resource_warnings: warnings } : {}),
  });
};

/**
 * Modify one machine, the `PUT machines/{name}` body that carries
 * neither `snapshots` nor `provisioner`, hyperweaver-ui's modify wire: a
 * body of the members an agent keeps at once answers `completed` with no
 * task; `resize_disks` of a zone answers `resized_disks` at once; a
 * memory the host cannot spare is refused 400 with `details`; a running
 * machine accrues everything else as `pending_power_cycle`; a machine
 * that is off queues a `machine_modify` or `zone_modify` task, its
 * `resource_warnings` beside it while the memory asked for is more than
 * half the host's free memory.
 *
 * @param {Object} ctx - The request's context with its `row`
 * @returns {Object} The answer
 */
export const modified = ctx => {
  const { host, row, body } = ctx;
  if (!body || Object.keys(body).length === 0) {
    return refusal(400, NO_CHANGES);
  }
  if (Array.isArray(body.resize_disks) && isZone(host)) {
    return resized(ctx);
  }
  if (immediateOnly(body)) {
    return kept(host, row, body);
  }
  const short = shortOf(host, body);
  if (short.length > 0) {
    return refusal(400, 'Insufficient resources', { details: short });
  }
  return running(row) ? accrued(ctx) : queuedModify(ctx);
};

const afterModify = (host, task) => {
  const metadata = task.metadata || {};
  if (task.machine_name && metadata && typeof metadata === 'object') {
    keepKnobs(host, task.machine_name, metadata);
  }
};

const clearedPending = ({ host, row }) => {
  const { pending } = storeOf(host);
  const held = pending.get(row.name) || {};
  pending.delete(row.name);
  return ok({
    success: true,
    machine_name: row.name,
    cleared_keys: Object.keys(held),
    message: `Cleared ${Object.keys(held).length} pending change group(s) for ${row.name}`,
  });
};

const appliedPending = ctx => {
  const { host, row } = ctx;
  const { pending } = storeOf(host);
  const held = pending.get(row.name);
  if (!held) {
    return refusal(400, 'No pending changes to apply');
  }
  if (running(row)) {
    return refusal(400, `${MUST_BE_OFF} to apply pending changes`);
  }
  pending.delete(row.name);
  return queuedModify({ ...ctx, body: held });
};

const secureBoot = ({ host, row, body }) => {
  if (row.hypervisor === 'utm') {
    return refusal(400, 'Secure Boot is a VirtualBox mechanism');
  }
  if (running(row)) {
    return refusal(400, `${MUST_BE_OFF} to change Secure Boot`);
  }
  const bootrom = knobOverridesOf(host, row).bootrom || 'bios';
  if (bootrom !== 'efi') {
    return refusal(400, `Secure Boot needs EFI firmware; ${row.name} boots with ${bootrom}`);
  }
  const steps = [
    body.enabled ? 'secureboot on' : 'secureboot off',
    ...(body.enroll_default_keys ? ['enrollms', 'enrolloraclesecurebootkeys'] : []),
    ...(body.init_var_store ? ['inituefivarstore'] : []),
  ];
  return ok({
    success: true,
    machine_name: row.name,
    enabled: Boolean(body.enabled),
    steps,
    message: `Secure Boot ${body.enabled ? 'enabled' : 'disabled'} on ${row.name}`,
  });
};

const usbDevices = () => ok({ devices: USB_DEVICES, total: USB_DEVICES.length });

const filtersOf = (host, name) => storeOf(host).filters.get(name) || [];

const listedFilters = ({ host, row }) =>
  ok({
    machine_name: row.name,
    filters: filtersOf(host, row.name),
    total: filtersOf(host, row.name).length,
  });

const addedFilter = ({ host, row, body }) => {
  if (!body.name) {
    return refusal(400, 'name is required');
  }
  const rows = filtersOf(host, row.name);
  const index = rows.length;
  storeOf(host).filters.set(row.name, [...rows, { index, ...body }]);
  return ok({
    success: true,
    machine_name: row.name,
    index,
    name: body.name,
    message: `USB filter ${body.name} added at index ${index}`,
  });
};

const deletedFilter = ({ host, row, params }) => {
  const index = Number(params.index);
  const rows = filtersOf(host, row.name);
  if (!rows.some(filter => filter.index === index)) {
    return refusal(404, `No USB filter at index ${index}`);
  }
  storeOf(host).filters.set(
    row.name,
    rows.filter(filter => filter.index !== index).map((filter, at) => ({ ...filter, index: at }))
  );
  return ok({
    success: true,
    machine_name: row.name,
    index,
    message: `USB filter ${index} removed`,
  });
};

const usbLive =
  verb =>
  ({ row, body }) => {
    if (!body.device) {
      return refusal(400, 'device is required');
    }
    if (!running(row)) {
      return refusal(400, NOT_RUNNING);
    }
    if (
      !USB_DEVICES.some(device => device.uuid === body.device || device.address === body.device)
    ) {
      return refusal(404, `USB device ${body.device} not found on the host`);
    }
    return ok({
      success: true,
      machine_name: row.name,
      device: body.device,
      message: `USB device ${body.device} ${verb}ed`,
    });
  };

const display = ({ row, body }) => {
  if (row.hypervisor === 'utm') {
    return refusal(400, 'setting the display size is a VirtualBox mechanism');
  }
  if (!running(row)) {
    return refusal(400, NOT_RUNNING);
  }
  const width = Number(body.width);
  const height = Number(body.height);
  if (!width || !height) {
    return refusal(400, 'width and height are required');
  }
  return ok({
    success: true,
    machine_name: row.name,
    width,
    height,
    depth: Number(body.depth) || 32,
    display: Number(body.display) || 0,
    message: `Display of ${row.name} set to ${width}x${height}`,
  });
};

const channel = handler => ctx => {
  if (!offers(ctx.host, 'guest-agent') && !hypervisorsOf(ctx.host).includes('virtualbox')) {
    return refusal(503, 'Guest agent channel is disabled');
  }
  return handler(ctx);
};

const execOutcome = (body, pid) => {
  const path = String(body.path || '');
  const args = Array.isArray(body.args) ? body.args : [];
  if (!path) {
    return refusal(400, 'path is required');
  }
  if (path.endsWith('sleep') || args.includes('--wait')) {
    return null;
  }
  const stdout = path.endsWith('uname') ? OS_LINE : `${[path, ...args].join(' ')}\nok`;
  return ok({ exited: true, exitcode: 0, signal: null, stdout, stderr: '', pid });
};

const guestExec = ({ host, row, body }) => {
  if (!running(row)) {
    return refusal(400, NOT_RUNNING);
  }
  const store = storeOf(host);
  const pid = store.nextPid;
  store.nextPid += 1;
  const outcome = execOutcome(body, pid);
  if (outcome) {
    return outcome;
  }
  store.execs.set(pid, { reads: 0, path: body.path, args: body.args || [] });
  return ok({ exited: false, pid });
};

const guestExecStatus = ({ host, row, params }) => {
  const pid = Number(params.pid);
  const store = storeOf(host);
  const held = store.execs.get(pid);
  if (!held) {
    return refusal(404, `No guest process ${pid} of ${row.name}`);
  }
  held.reads += 1;
  if (held.reads < 2) {
    return ok({ exited: false, pid });
  }
  store.execs.delete(pid);
  return ok({
    exited: true,
    exitcode: 0,
    signal: null,
    stdout: `${[held.path, ...held.args].join(' ')}\ndone`,
    stderr: '',
    pid,
  });
};

const guestControl = ({ row, body }) => {
  if (row.hypervisor === 'utm') {
    return refusal(400, 'guest control is a VirtualBox mechanism');
  }
  if (!running(row)) {
    return refusal(400, NOT_RUNNING);
  }
  if (!body.path) {
    return refusal(400, 'path is required');
  }
  if (!body.username || !body.password) {
    return refusal(400, 'username and password are required for guest control');
  }
  const args = Array.isArray(body.args) ? body.args : [];
  return ok({
    exit_code: 0,
    stdout: String(body.path).endsWith('uname') ? OS_LINE : `${[body.path, ...args].join(' ')}\nok`,
    stderr: '',
  });
};

const pad = (number, width) => String(number).padStart(width, '0');

const vnicsOf = host =>
  host.machines.map((row, index) => ({
    link: `vnice3_${pad(index + 1, 4)}_0`,
    over: 'igb0',
    speed: 1000,
    macaddress: `02:08:20:aa:bb:${pad(index, 2)}`,
    macaddrtype: 'fixed',
    vid: 11,
    mtu: 1500,
    state: row.status === 'running' ? 'up' : 'down',
    zone: row.name,
  }));

const vnics = ctx => {
  const rows = vnicsOf(ctx.host);
  return ok({ vnics: rows, returned: rows.length, source: 'live' });
};

const vnicOf = handler => ctx => {
  const vnic = decodeURIComponent(ctx.params.vnic);
  const known = vnicsOf(ctx.host).some(row => row.link === vnic);
  return known ? handler({ ...ctx, vnic }) : refusal(404, `VNIC ${vnic} not found`);
};

const vnicProperties = ({ host, vnic }) => {
  const edits = storeOf(host).vnicProps.get(vnic) || {};
  const properties = VNIC_PROPERTIES.map(row => ({
    ...row,
    value: edits[row.property] ?? row.value,
  }));
  return ok({ vnic, properties, timestamp: new Date().toISOString() });
};

const vnicPropertiesSet = ({ host, person, vnic, body }) => {
  const { properties } = body;
  if (!properties || typeof properties !== 'object' || Object.keys(properties).length === 0) {
    return refusal(400, 'properties is required');
  }
  const { vnicProps } = storeOf(host);
  vnicProps.set(vnic, { ...(vnicProps.get(vnic) || {}), ...properties });
  const task = queue({
    host,
    by: person.username,
    operation: 'vnic_set_properties',
    target: 'system',
    metadata: { vnic, properties, temporary: Boolean(body.temporary) },
  });
  return ok(
    {
      success: true,
      message: `Link property task created for ${vnic}`,
      task_id: task.id,
      vnic,
      properties,
    },
    202
  );
};

const datasetOf = handler => ctx => {
  const name = ctx.url.searchParams.get('name') || '';
  if (!name) {
    return refusal(400, 'Dataset name is required');
  }
  return handler({ ...ctx, dataset: name });
};

const volumeSizeOf = (host, dataset) => {
  const owner = host.machines
    .map(row => [row, `rpool/zones/${row.name}`])
    .find(([, base]) => dataset.startsWith(base));
  if (!owner) {
    return null;
  }
  return dataset.endsWith('/boot') ? 40 * GIB : 100 * GIB;
};

const datasetProperties = ({ host, dataset }) => {
  const size = volumeSizeOf(host, dataset);
  const edits = storeOf(host).datasetProps.get(dataset) || {};
  const local = value => ({ value, source: 'local' });
  const inherited = value => ({ value, source: 'inherited' });
  const base = {
    type: local(size === null ? 'filesystem' : 'volume'),
    used: local(String(Math.round((size ?? 2 * GIB) * 0.4))),
    compression: inherited('lz4'),
    ...(size === null
      ? { mountpoint: local(`/${dataset}`) }
      : {
          volsize: local(String(size)),
          volblocksize: local('8192'),
          refreservation: local(edits.sparse === 'false' ? String(size) : '0'),
        }),
  };
  const properties = Object.fromEntries(
    Object.entries({
      ...base,
      ...Object.fromEntries(Object.entries(edits).map(([key, value]) => [key, local(value)])),
    })
  );
  return ok({ name: dataset, properties });
};

const datasetPropertiesSet = ({ host, person, dataset, body }) => {
  const { properties } = body;
  if (!properties || typeof properties !== 'object' || Object.keys(properties).length === 0) {
    return refusal(400, 'properties is required');
  }
  const { datasetProps } = storeOf(host);
  datasetProps.set(dataset, { ...(datasetProps.get(dataset) || {}), ...properties });
  const task = queue({
    host,
    by: person.username,
    operation: 'dataset_set_properties',
    target: 'system',
    metadata: { dataset, properties },
  });
  return ok(
    { success: true, message: `Property update task created for ${dataset}`, task_id: task.id },
    202
  );
};

const datasetSnapshot = ({ host, person, dataset, body }) => {
  if (!body.snapshot_name) {
    return refusal(400, 'snapshot_name is required');
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'dataset_snapshot',
    target: 'system',
    metadata: { dataset, snapshot_name: body.snapshot_name, recursive: Boolean(body.recursive) },
  });
  return ok(
    {
      success: true,
      message: `Snapshot task created for ${dataset}@${body.snapshot_name}`,
      task_id: task.id,
    },
    202
  );
};

const listedDirectory = ctx => {
  const path = ctx.url.searchParams.get('path') || '/';
  const wanted = path.length > 1 ? path.replace(/\/+$/u, '') : '/';
  const names = DIRECTORIES[wanted];
  if (!names) {
    return refusal(404, `No such directory: ${wanted}`);
  }
  const items = names.map(name => {
    const full = wanted === '/' ? `/${name}` : `${wanted}/${name}`;
    return { name, path: full, isDirectory: Boolean(DIRECTORIES[full]) };
  });
  return ok({ path: wanted, items, total: items.length });
};

const serverOf = ctx => {
  const id = decodeURIComponent(ctx.params.id);
  const host = [...ctx.hosts.values()].find(entry => String(entry.id) === id) || null;
  return host && rowOf(host) ? host : null;
};

const managerOf = (person, uuids) => {
  if (isAdmin(person)) {
    return true;
  }
  const names = membershipsOf(person).map(entry => entry.org);
  return uuids.some(uuid =>
    names.some(name => organizations.get(name)?.uuid === uuid && manages(person, name))
  );
};

const knownUuids = () => [...organizations.values()].map(org => org.uuid);

const orgsBody = body => {
  if (!Array.isArray(body.orgs) || !body.orgs.every(uuid => typeof uuid === 'string')) {
    return null;
  }
  return [...new Set(body.orgs)];
};

const serverOrgs = ctx => {
  const host = serverOf(ctx);
  if (!host) {
    return refusal(404, 'Server not found');
  }
  return ok({ success: true, orgs: rowOf(host).org_uuids || [] });
};

const serverOrgsSet = ctx => {
  const host = serverOf(ctx);
  if (!host) {
    return refusal(404, 'Server not found');
  }
  const row = rowOf(host);
  if (!managerOf(ctx.person, row.org_uuids || [])) {
    return refusal(403, 'Only an admin or a manager of an owning organization may assign a server');
  }
  const orgs = orgsBody(ctx.body);
  if (!orgs) {
    return refusal(400, 'orgs must be a list of organization uuids');
  }
  row.org_uuids = orgs;
  return ok({ success: true, orgs });
};

const machineOrgs = ctx => {
  const host = serverOf(ctx);
  const row = host ? machineOf(host, nameOf(ctx)) : null;
  if (!row) {
    return refusal(404, MACHINE_MISSING);
  }
  return ok({ success: true, orgs: machineOrgsOf(host, row.name) });
};

const machineOrgsSet = ctx => {
  const host = serverOf(ctx);
  const row = host ? machineOf(host, nameOf(ctx)) : null;
  if (!row) {
    return refusal(404, MACHINE_MISSING);
  }
  const owners = rowOf(host).org_uuids || [];
  if (!managerOf(ctx.person, owners.length > 0 ? owners : knownUuids())) {
    return refusal(
      403,
      'Only an admin or a manager of an owning organization may assign a machine'
    );
  }
  const orgs = orgsBody(ctx.body);
  if (!orgs) {
    return refusal(400, 'orgs must be a list of organization uuids');
  }
  setMachineOrgs(host, row.name, orgs);
  return ok({ success: true, orgs });
};

/**
 * The Settings page of a machine on both agents, hyperweaver-ui's calls
 * the truth of every body: the modify of `PUT machines/{name}` through
 * `modified`, reached from the machine tools' handler for a body that is
 * neither a snapshots policy nor a provisioner document, its knobs kept
 * on the machine when the task completes; the accrued changes,
 * `DELETE machines/{name}/pending-changes` and
 * `POST machines/{name}/pending-changes/apply`, refused while the
 * machine runs; Secure Boot at `POST machines/{name}/nvram/secureboot`,
 * refused while the machine runs or boots with BIOS; the host's USB
 * devices at `GET system/usb` and a machine's capture filters, added and
 * removed by index, with the live attach and detach of a running
 * machine; the display size of a running VirtualBox machine; a guest
 * command through the guest agent, `POST machines/{name}/guest/exec`,
 * whose `sleep` outlives the wait and answers `exited` on the second
 * read of its pid, and through the Guest Additions,
 * `POST machines/{name}/guestcontrol/run`; on a zoneweaver host that
 * lists `vnics` the VNICs and one VNIC's link properties, a queued task
 * on the target `system` when set; on one that lists `zfs` a dataset's
 * properties by `?name=`, a queued property update and a queued
 * snapshot; the host's directories at `GET filesystem` behind
 * `file-browser`; and on the server role the owning organizations of a
 * server and of a machine at `/api/servers/{id}/orgs` and
 * `/api/servers/{id}/machines/{name}/orgs`, written by an admin or a
 * manager of an owning organization alone, 403 to everyone else.
 *
 * @param {Object} router - `sessionRoute` and `agentRoute`
 * @param {Map} hosts - The hosts of the fleet
 * @returns {void}
 */
export const mountMachineSettings = ({ sessionRoute, agentRoute }, hosts) => {
  const modify = handler => behind('machine-modify', found(handler));
  const guest = handler => channel(found(handler));
  const zfs = handler => ctx =>
    isZone(ctx.host) && offers(ctx.host, 'zfs') ? handler(ctx) : problem(404, 'Not Found');
  const withHosts = handler => ctx => handler({ ...ctx, hosts });
  settles('machine_modify', afterModify);
  settles('zone_modify', afterModify);
  agentRoute('DELETE', 'machines/:name/pending-changes', modify(clearedPending));
  agentRoute('POST', 'machines/:name/pending-changes/apply', modify(appliedPending));
  agentRoute('POST', 'machines/:name/nvram/secureboot', kind('hyperweaver', modify(secureBoot)));
  agentRoute('GET', 'system/usb', kind('hyperweaver', usbDevices));
  agentRoute('GET', 'machines/:name/usb/filters', kind('hyperweaver', found(listedFilters)));
  agentRoute('POST', 'machines/:name/usb/filters', kind('hyperweaver', found(addedFilter)));
  agentRoute(
    'DELETE',
    'machines/:name/usb/filters/:index',
    kind('hyperweaver', found(deletedFilter))
  );
  agentRoute('POST', 'machines/:name/usb/attach', kind('hyperweaver', found(usbLive('attach'))));
  agentRoute('POST', 'machines/:name/usb/detach', kind('hyperweaver', found(usbLive('detach'))));
  agentRoute('POST', 'machines/:name/display', kind('hyperweaver', found(display)));
  agentRoute('POST', 'machines/:name/guest/exec', guest(guestExec));
  agentRoute('GET', 'machines/:name/guest/exec/:pid', guest(guestExecStatus));
  agentRoute('POST', 'machines/:name/guestcontrol/run', kind('hyperweaver', found(guestControl)));
  agentRoute('GET', 'network/vnics', behind('vnics', vnics));
  agentRoute('GET', 'network/vnics/:vnic/properties', behind('vnics', vnicOf(vnicProperties)));
  agentRoute('PUT', 'network/vnics/:vnic/properties', behind('vnics', vnicOf(vnicPropertiesSet)));
  agentRoute('GET', 'storage/dataset', zfs(datasetOf(datasetProperties)));
  agentRoute('PUT', 'storage/dataset/properties', zfs(datasetOf(datasetPropertiesSet)));
  agentRoute('POST', 'storage/dataset/snapshots', zfs(datasetOf(datasetSnapshot)));
  agentRoute('GET', 'filesystem', behind('file-browser', listedDirectory));
  if (!AGENT_MODE) {
    sessionRoute('GET', '/api/servers/:id/orgs', withHosts(serverOrgs));
    sessionRoute('PUT', '/api/servers/:id/orgs', withHosts(serverOrgsSet));
    sessionRoute('GET', '/api/servers/:id/machines/:name/orgs', withHosts(machineOrgs));
    sessionRoute('PUT', '/api/servers/:id/machines/:name/orgs', withHosts(machineOrgsSet));
  }
};
