import { featuresOf, machineOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { queue } from './tasks.js';

const ACTIVE = ['pending', 'running'];
const PENDING_LIMIT = 10;
const SILENT_EVERY = 3;
const TRANSPORT_MAC = '00FF00FF00FF';
const MACHINE_MISSING = 'Machine not found';
const ZONE_MISSING = 'Zone not found';
const NOT_RUNNING = 'Machine is not running';
const NO_VM = 'No VM exists behind this machine yet';
const CHANNEL_OFF = 'Guest agent channel is disabled';
const UTM_OSINFO = 'osinfo is not supported on utm machines (no utmctl verb)';
const UTM_SETUP =
  'the guest-agent UART is VirtualBox plumbing — utm guests use qemu-guest-agent via utmctl already';
const SETUP_QUEUED =
  'Guest-agent UART setup queued (machine is powered off) — the guest needs qemu-ga on its COM2 (baked into current box templates).';
const SETUP_ACCRUED =
  'Guest-agent UART setup accrued — applies at the next agent-driven power cycle; the guest needs qemu-ga on its COM2 (baked into current box templates).';
const ZONE_WIRED = 'Guest-agent channel is already configured';
const ZONE_SETUP =
  'Guest-agent channel configured — applies at the next zone boot; the guest needs qemu-ga on its virtio-serial port (Windows guests need hostbridge=q35).';
const OS_INFO = {
  id: 'debian',
  name: 'Debian GNU/Linux',
  'pretty-name': 'Debian GNU/Linux 13 (trixie)',
  version: '13 (trixie)',
  'version-id': '13',
  'kernel-release': '6.12.38+deb13-amd64',
  'kernel-version': '#1 SMP PREEMPT_DYNAMIC Debian 6.12.38-1',
  machine: 'x86_64',
};
const ROLES = ['domino', 'traveler', 'nomadweb', 'leap'];

const wired = new Map();

const wiredOf = host => {
  if (!wired.has(host.id)) {
    wired.set(host.id, new Set());
  }
  return wired.get(host.id);
};

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const indexOf = (host, row) => host.machines.findIndex(entry => entry.name === row.name);

const pad = (number, width) => String(number).padStart(width, '0');

const uuidOf = (host, index) =>
  `5b1c2a44-0d5e-4c0e-9b6e-${pad(Number(host.id) || 0, 4)}${pad(index, 8)}`;

const addressOf = (host, index) => `192.168.${(Number(host.id) || 0) + 10}.${index + 20}`;

const macOf = index => `080027AA${pad(index, 4)}`;

const provisioned = index => index % 2 === 0;

const responds = (host, index) =>
  featuresOf(host).includes('guest-agent') && index % SILENT_EVERY !== SILENT_EVERY - 1;

const guestInfoOf = (host, row, index) => {
  if (row.status !== 'running') {
    return {};
  }
  const answering = responds(host, index);
  const additions = host.kind === 'hyperweaver' && row.hypervisor !== 'utm';
  const source = additions ? 'additions' : '';
  const reported = answering || additions;
  return {
    guest_info: {
      ips: reported ? [addressOf(host, index)] : [],
      source: answering ? 'guest-agent' : source,
      agent_responding: answering,
      checked_at: now(),
    },
  };
};

const diskOf = row => `/machines/${row.name}/boot.vdi`;

const vboxView = (host, row, index) => ({
  name: row.name,
  ostype: 'Debian (64-bit)',
  UUID: uuidOf(host, index),
  CfgFile: `/machines/${row.name}/${row.name}.vbox`,
  memory: '8192',
  cpus: '4',
  firmware: 'BIOS',
  chipset: 'piix3',
  VMState: row.status,
  acpi: 'on',
  vrde: 'off',
  boot1: 'disk',
  boot2: 'dvd',
  boot3: 'none',
  boot4: 'none',
  storagecontrollername0: 'SATA Controller',
  storagecontrollertype0: 'IntelAhci',
  'SATA Controller-0-0': diskOf(row),
  'SATA Controller-1-0': 'emptydrive',
  nic1: 'nat',
  nictype1: '82540EM',
  macaddress1: TRANSPORT_MAC,
  cableconnected1: 'on',
  nic2: 'bridged',
  nictype2: '82540EM',
  bridgeadapter2: 'eth0',
  macaddress2: macOf(index),
  cableconnected2: 'on',
});

const specOf = (row, index) => ({
  provisioner: { name: 'startcloud', version: '0.1.27' },
  settings: {
    hostname: row.name,
    domain: 'example.com',
    server_id: pad(index + 1, 4),
    vcpus: 4,
    memory: '8G',
    box: 'STARTcloud/debian13-server',
  },
  roles: ROLES.map((name, order) => ({ name, enabled: (index + order) % 2 === 0 })),
});

const tagsOf = row => (Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : null);

const machineRow = (host, row, index) => {
  const made = provisioned(index);
  const utm = row.hypervisor === 'utm';
  return {
    id: index + 1,
    name: row.name,
    host: host.facts.hostname,
    status: row.status,
    backing: made ? 'vagrant' : 'vbox',
    hypervisor: row.hypervisor,
    home: made ? `/machines/${row.name}` : null,
    uuid: uuidOf(host, index),
    server_id: made ? pad(index + 1, 4) : null,
    is_orphaned: false,
    auto_discovered: !made,
    last_seen: now(),
    notes: row.notes || null,
    tags: tagsOf(row),
    configuration: {
      ...(utm ? {} : vboxView(host, row, index)),
      ...guestInfoOf(host, row, index),
    },
    spec: made ? specOf(row, index) : null,
    created_at: ago(index * 60 + 600),
    updatedAt: now(),
  };
};

const switchWord = index => (provisioned(index) ? 'on' : 'off');

const zoneView = (row, index) => ({
  zonename: row.name,
  zonepath: `/rpool/zones/${row.name}`,
  brand: 'bhyve',
  autoboot: index % 2 === 0 ? 'true' : 'false',
  'ip-type': 'exclusive',
  hostid: `00c0ff${pad(index, 2)}`,
  ram: '4G',
  vcpus: '2',
  bootrom: 'BHYVE_RELEASE_CSM',
  hostbridge: 'i440fx',
  type: 'generic',
  acpi: 'true',
  xhci: 'on',
  rng: 'off',
  'cloud-init': switchWord(index),
  bootdisk: {
    path: `rpool/zones/${row.name}/boot`,
    size: '40G',
    sparse: 'true',
    blocksize: '8K',
  },
  disk: [{ path: `rpool/zones/${row.name}/data`, size: '100G', sparse: 'true', blocksize: '8K' }],
  cdrom: index % 2 === 0 ? [] : ['/rpool/iso/debian-13.iso'],
  net: [
    {
      physical: `vnice3_${pad(index + 1, 4)}_0`,
      'global-nic': 'igb0',
      'vlan-id': '11',
      'allowed-address': `10.0.0.${index + 20}/24`,
      'mac-addr': `02:08:20:aa:bb:${pad(index, 2)}`,
    },
  ],
});

const zoneDocument = (row, index) =>
  provisioned(index)
    ? {
        provisioner: {
          provisioner_name: 'startcloud',
          provisioner_version: '0.1.27',
          roles: ROLES.map((name, order) => ({ name, order }))
            .filter(role => (index + role.order) % 2 === 0)
            .map(role => ({ name: role.name })),
        },
        settings: { hostname: row.name, domain: 'example.com', vcpus: '2', memory: '4G' },
      }
    : {};

const zoneRow = (host, row, index) => ({
  id: index + 1,
  name: row.name,
  zone_id: `${pad(index + 1, 8)}--${row.name}`,
  host: host.facts.hostname,
  status: row.status,
  brand: row.brand,
  vnc_port: row.status === 'running' ? 5901 + index : null,
  is_orphaned: false,
  auto_discovered: !provisioned(index),
  last_seen: now(),
  server_id: pad(index + 1, 8),
  vm_type: provisioned(index) ? 'production' : 'development',
  notes: row.notes || null,
  tags: tagsOf(row),
  configuration: {
    ...zoneView(row, index),
    ...zoneDocument(row, index),
    ...guestInfoOf(host, row, index),
  },
  createdAt: ago(index * 60 + 600),
  updatedAt: now(),
});

/**
 * One machine's row as the agent of the host's kind answers it in `GET
 * machines`: hyperweaver-agent's registry row, with `hypervisor`,
 * `backing`, `home`, `uuid`, `spec` and VirtualBox's own view as its
 * `configuration`, and zoneweaver-agent's zone row, with `zone_id`,
 * `brand`, `vnc_port`, `vm_type` and the zone's configuration, neither
 * carrying the other's members; a running machine carries `guest_info`.
 *
 * @param {Object} host - The host
 * @param {Object} row - The machine the mock holds
 * @returns {Object} The row
 */
export const listedRow = (host, row) => {
  const index = indexOf(host, row);
  return host.kind === 'zoneweaver' ? zoneRow(host, row, index) : machineRow(host, row, index);
};

const devicesOf = (row, index) => ({
  controllers: [{ name: 'SATA Controller', type: 'sata' }],
  attachments: [
    { controller: 'SATA Controller', port: 0, device: 0, path: diskOf(row), kind: 'disk' },
    { controller: 'SATA Controller', port: 1, device: 0, path: '', kind: 'cdrom' },
  ],
  nics: [
    { adapter: 1, mode: 'nat', mac: TRANSPORT_MAC },
    { adapter: 2, mode: 'bridged', network: 'eth0', mac: macOf(index) },
  ],
});

const machineKnobs = (host, row, index) => {
  if (row.hypervisor === 'utm') {
    return {};
  }
  return {
    ram: 8192,
    vcpus: 4,
    bootrom: 'bios',
    hostbridge: 'piix3',
    diskif: 'sata',
    netif: 'e1000',
    os_type: 'Debian_64',
    vnc: 'off',
    acpi: 'on',
    boot_order: ['disk', 'dvd'],
    guest_agent: wiredOf(host).has(row.name) || responds(host, index),
    nics: [
      {
        adapter: 1,
        cable_connected: 'on',
        nic_type: '82540EM',
        mac: TRANSPORT_MAC,
        provisional: true,
        remove_on_completion: false,
      },
      { adapter: 2, cable_connected: 'on', nic_type: '82540EM', mac: macOf(index) },
    ],
    devices: devicesOf(row, index),
  };
};

const zoneKnobs = (host, row, index) => ({
  ...(featuresOf(host).includes('guest-agent')
    ? { guest_agent: wiredOf(host).has(row.name) || responds(host, index) }
    : {}),
  vnc: 'on',
  bootorder: ['bootdisk', 'cdrom0'],
  ...(provisioned(index) ? { consoleport: 6001 + index } : {}),
  nics: [{ physical: `vnice3_${pad(index + 1, 4)}_0`, props: {}, netif: 'virtio-net-viona' }],
  cpu_topology: null,
});

const pendingOf = (host, row) =>
  host.tasks
    .filter(task => task.machine_name === row.name && ACTIVE.includes(task.status))
    .slice(0, PENDING_LIMIT);

const detail = ctx => {
  const { host, row } = ctx;
  const index = indexOf(host, row);
  const info = listedRow(host, row);
  const shared = {
    machine_info: info,
    configuration: info.configuration,
    active_vnc_session: null,
    pending_tasks: pendingOf(host, row),
    system_status: row.status,
  };
  if (host.kind === 'zoneweaver') {
    return ok({ ...shared, pending_changes: null, knob_current: zoneKnobs(host, row, index) });
  }
  return ok({
    ...shared,
    web_address: provisioned(index) ? `https://${row.name}.example.com/welcome.html` : null,
    knob_current: machineKnobs(host, row, index),
    pending_changes: null,
  });
};

const found = handler => ctx => {
  const row = machineOf(ctx.host, nameOf(ctx));
  const missing = ctx.host.kind === 'zoneweaver' ? ZONE_MISSING : MACHINE_MISSING;
  return row ? handler({ ...ctx, row }) : refusal(404, missing);
};

const channel = handler => ctx => {
  if (!featuresOf(ctx.host).includes('guest-agent')) {
    return refusal(503, CHANNEL_OFF);
  }
  const row = machineOf(ctx.host, nameOf(ctx));
  return row ? handler({ ...ctx, row }) : refusal(404, MACHINE_MISSING);
};

const silent = ({ host, row }) => {
  if (row.status !== 'running') {
    return refusal(400, NOT_RUNNING);
  }
  if (row.hypervisor !== 'utm' && !responds(host, indexOf(host, row))) {
    return refusal(
      502,
      'Guest agent did not answer (timeout) — the machine needs the guest-agent channel (POST /machines/{name}/guest-agent/setup) and qemu-ga running in the guest'
    );
  }
  return null;
};

const properties = ctx => {
  const { host, row } = ctx;
  if (host.kind !== 'hyperweaver') {
    return problem(404, 'Not Found');
  }
  if (row.hypervisor === 'utm') {
    return refusal(404, NO_VM);
  }
  const index = indexOf(host, row);
  const stamp = now();
  const flags = 'TRANSIENT, TRANSRESET';
  const live =
    row.status === 'running'
      ? [
          {
            name: '/VirtualBox/GuestInfo/Net/0/V4/IP',
            value: '10.0.2.15',
            timestamp: stamp,
            flags,
          },
          {
            name: '/VirtualBox/GuestInfo/Net/1/V4/IP',
            value: addressOf(host, index),
            timestamp: stamp,
            flags,
          },
          { name: '/VirtualBox/GuestInfo/OS/Product', value: 'Linux', timestamp: stamp, flags },
        ]
      : [];
  const seeds = provisioned(index)
    ? [
        { name: '/Hyperweaver/CloudInit/enabled', value: 'true', timestamp: stamp },
        { name: '/Hyperweaver/CloudInit/dns_domain', value: 'example.com', timestamp: stamp },
      ]
    : [];
  const entries = [...live, ...seeds];
  return ok({ machine_name: row.name, properties: entries, total: entries.length });
};

const osinfo = ctx => {
  if (ctx.row.hypervisor === 'utm') {
    return refusal(400, UTM_OSINFO);
  }
  return silent(ctx) || ok({ machine_name: ctx.row.name, osinfo: OS_INFO });
};

const interfacesOf = (host, row) => {
  const index = indexOf(host, row);
  return [
    {
      name: 'lo',
      'hardware-address': '00:00:00:00:00:00',
      'ip-addresses': [{ 'ip-address-type': 'ipv4', 'ip-address': '127.0.0.1', prefix: 8 }],
    },
    {
      name: 'enp0s8',
      'hardware-address': '08:00:27:aa:bb:cc',
      'ip-addresses': [
        { 'ip-address-type': 'ipv4', 'ip-address': addressOf(host, index), prefix: 24 },
      ],
    },
  ];
};

const network = ctx => {
  const { host, row } = ctx;
  const refused = silent(ctx);
  if (refused) {
    return refused;
  }
  if (row.hypervisor === 'utm') {
    return ok({ machine_name: row.name, ips: [addressOf(host, indexOf(host, row))] });
  }
  return ok({ machine_name: row.name, interfaces: interfacesOf(host, row) });
};

const zoneSetup = ({ host, row }) => {
  const already = wiredOf(host).has(row.name) || responds(host, indexOf(host, row));
  wiredOf(host).add(row.name);
  return ok({
    success: true,
    machine_name: row.name,
    requires_restart: !already,
    socket: `/rpool/zones/${row.name}/root/tmp/qga.sock`,
    message: already ? ZONE_WIRED : ZONE_SETUP,
  });
};

const machineSetup = ctx => {
  const { host, person, row } = ctx;
  const pipe = `/machines/${row.name}/qga.sock`;
  const document = {
    vbox: { serial: [{ port: 2, io_base: '0x2F8', irq: 3, mode: `server ${pipe}` }] },
  };
  wiredOf(host).add(row.name);
  if (['stopped', 'aborted'].includes(row.status)) {
    const task = queue({
      host,
      by: person.username,
      operation: 'machine_modify',
      target: row.name,
      metadata: document,
    });
    return ok({
      success: true,
      task_id: task.id,
      machine_name: row.name,
      operation: 'machine_modify',
      status: 'pending',
      requires_restart: true,
      pipe,
      message: SETUP_QUEUED,
    });
  }
  return ok({
    success: true,
    machine_name: row.name,
    operation: 'machine_modify',
    status: 'pending_power_cycle',
    requires_restart: true,
    pending_changes: document,
    pipe,
    message: SETUP_ACCRUED,
  });
};

const setup = ctx => {
  if (ctx.host.kind === 'zoneweaver') {
    return zoneSetup(ctx);
  }
  return ctx.row.hypervisor === 'utm' ? refusal(400, UTM_SETUP) : machineSetup(ctx);
};

const kept = (host, name, members) => {
  host.machines = host.machines.map(row => (row.name === name ? { ...row, ...members } : row));
};

const tags = ctx => {
  const { host, row, body } = ctx;
  if (body.tags === undefined) {
    return refusal(400, 'tags field is required');
  }
  if (body.tags !== null && !Array.isArray(body.tags)) {
    return refusal(400, 'tags must be an array or null');
  }
  const next = body.tags || [];
  kept(host, row.name, { tags: next });
  return ok({ success: true, machine_name: row.name, tags: next });
};

const notes = ctx => {
  const { host, row, body } = ctx;
  if (body.notes === undefined) {
    return refusal(400, 'notes field is required');
  }
  if (body.notes !== null && typeof body.notes !== 'string') {
    return refusal(400, 'notes must be a string or null');
  }
  const next = body.notes || null;
  kept(host, row.name, { notes: next || '' });
  return ok({ success: true, machine_name: row.name, notes: next });
};

/**
 * The reads and the writes of the machine page on both agents, each
 * answering as the agent of the host's kind does: `GET machines/{name}`,
 * the detail, hyperweaver-agent's with `web_address` and
 * `knob_current.devices` and zoneweaver-agent's with the zone's own
 * `knob_current` and no devices; `GET machines/{name}/guest-properties`
 * on the hyperweaver kind alone, 404 on a zoneweaver host; the guest
 * agent's `guest/osinfo`, `guest/network` and `guest-agent/setup`, 503 on
 * a host that lists no `guest-agent`, 502 for a guest that stays silent,
 * a UTM machine refusing the first and the last and answering the flat
 * `ips` of the second; and `PUT machines/{name}/tags` and `notes`, kept
 * on the machine at once, null clearing them.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMachineDetail = agentRoute => {
  agentRoute('GET', 'machines/:name', found(detail));
  agentRoute('GET', 'machines/:name/guest-properties', found(properties));
  agentRoute('GET', 'machines/:name/guest/osinfo', channel(osinfo));
  agentRoute('GET', 'machines/:name/guest/network', channel(network));
  agentRoute('POST', 'machines/:name/guest-agent/setup', channel(setup));
  agentRoute('PUT', 'machines/:name/tags', found(tags));
  agentRoute('PUT', 'machines/:name/notes', found(notes));
};
