import { featuresOf, hypervisorsOf, machineOf } from './fleet.js';
import { AGENT_MODE, ok, problem, refusal } from './kit.js';
import { organizations } from './people.js';
import { queue, settles, stoppedWord } from './tasks.js';

const GIB = 1024 ** 3;
const MEMORY_PATTERN = /^(?<amount>\d+(?:\.\d+)?)(?<unit>[GM])$/iu;
const BOOT_TYPES = ['template', 'image', 'blank', 'none'];
const SYNC_METHODS = ['rsync', 'scp'];
const HYPERVISORS = ['', 'virtualbox', 'utm'];
const REGISTRIES = {
  mirror: 'https://mirror.example.com',
  boxvault: 'https://boxvault.example.com',
};
const ARCHITECTURES = ['amd64', 'arm64'];
const BOXES = [
  {
    name: 'debian13',
    organization: 'startcloud',
    description: 'Debian 13 base box',
    versions: ['13.1.0', '13.0.0'],
  },
  {
    name: 'ubuntu2404',
    organization: 'startcloud',
    description: 'Ubuntu 24.04 base box',
    versions: ['24.04.2'],
  },
  {
    name: 'windows-server-2025',
    organization: 'acme',
    description: 'Windows Server 2025 evaluation',
    versions: ['2025.1'],
    isPublic: false,
  },
];
const TEMPLATES = [
  {
    id: 'tpl-0001',
    organization: 'startcloud',
    box_name: 'debian13',
    version: '13.1.0',
    architecture: 'amd64',
    provider: 'virtualbox',
    size_bytes: 734003200,
    dataset_path: 'rpool/templates/startcloud/debian13/13.1.0',
    available_pools: ['rpool'],
    created_at: '2026-09-20T09:00:00.000Z',
  },
];
const ISO_ARTIFACTS = [
  {
    id: 'art-0001',
    filename: 'debian-13.1.0-amd64-netinst.iso',
    path: '/var/lib/hyperweaver/artifacts/iso/debian-13.1.0-amd64-netinst.iso',
    size: 702545920,
    file_type: 'iso',
    extension: 'iso',
    mime_type: 'application/x-iso9660-image',
    checksum: '8f0a9c1e',
    checksum_algorithm: 'sha256',
    file_exists: true,
  },
  {
    id: 'art-0002',
    filename: 'Win11_24H2_English_x64.iso',
    path: '/var/lib/hyperweaver/artifacts/iso/Win11_24H2_English_x64.iso',
    size: 6842523648,
    file_type: 'iso',
    extension: 'iso',
    mime_type: 'application/x-iso9660-image',
    checksum: '1b2c3d4e',
    checksum_algorithm: 'sha256',
    file_exists: true,
  },
];
const ROLE_ARTIFACTS = [
  {
    id: 'art-0101',
    filename: 'Domino_14.5_Linux_English.tar',
    path: '/var/lib/hyperweaver/artifacts/installer/Domino_14.5_Linux_English.tar',
    size: 1610612736,
    file_type: 'installer',
    extension: 'tar',
    role: 'domino_install',
    expected_sha256: 'a1b2c3d4e5f6',
    version: '14.5',
    file_exists: true,
  },
];
const OS_TYPES = [
  { id: 'Debian_64', description: 'Debian (64-bit)', family: 'Linux', architecture: 'x86' },
  { id: 'Ubuntu_64', description: 'Ubuntu (64-bit)', family: 'Linux', architecture: 'x86' },
  {
    id: 'Windows11_64',
    description: 'Windows 11 (64-bit)',
    family: 'Windows',
    architecture: 'x86',
  },
  { id: 'FreeBSD_64', description: 'FreeBSD (64-bit)', family: 'BSD', architecture: 'x86' },
];
const ZONE_OS_TYPES = [
  { id: 'generic', description: 'Generic bhyve guest', family: 'Other' },
  { id: 'windows', description: 'Windows', family: 'Windows' },
  { id: 'openbsd', description: 'OpenBSD', family: 'BSD' },
];
const KNOB_VALUES = {
  'vbox.serial.type': ['16450', '16550A', '16750'],
  'nics.promisc': ['deny', 'allow-vms', 'allow-all'],
  'nics.nic_type': ['Am79C970A', 'Am79C973', '82540EM', '82543GC', '82545EM', 'virtio', 'usbnet'],
  'nics.cable_connected': ['on', 'off'],
  'disks.controller_type': ['ide', 'sata', 'scsi', 'sas', 'nvme', 'virtio', 'usb', 'floppy'],
  boot_order: ['floppy', 'dvd', 'disk', 'net', 'none'],
  'settings.sync_method': ['rsync', 'scp'],
  'settings.firmware_type': ['BIOS', 'UEFI'],
  'disks.boot.clone_strategy': ['clone', 'copy'],
};
const ZONE_KNOB_VALUES = {
  'zones.diskif': ['virtio', 'ahci', 'nvme'],
  'zones.netif': ['virtio', 'e1000'],
  'zones.hostbridge': ['i440fx', 'q35'],
  'zones.vnc': ['on', 'off'],
  'zones.acpi': ['on', 'off'],
  'zones.xhci': ['on', 'off'],
  'zones.bootrom': ['BHYVE_RELEASE', 'BHYVE_RELEASE_CSM', 'BHYVE_DEBUG'],
  'settings.sync_method': ['rsync', 'scp'],
  'settings.firmware_type': ['BIOS', 'UEFI'],
  'disks.boot.clone_strategy': ['clone', 'copy', 'localize'],
};
const MEDIA = [
  {
    path: 'D:\\vms\\media\\debian13-base.vdi',
    format: 'VDI',
    size_bytes: 8589934592,
    source_stamp: 'template',
    in_use_by: [],
  },
  {
    path: 'D:\\vms\\media\\scratch-data.vdi',
    format: 'VDI',
    size_bytes: 21474836480,
    source_stamp: 'blank',
    in_use_by: ['dev-1'],
  },
];
const POOLS = [
  {
    name: 'rpool',
    size: '1992864825344',
    alloc: '612854669312',
    free: '1380010156032',
    capacity_percent: '30',
    dedup_ratio: '1.00x',
    health: 'ONLINE',
    altroot: null,
  },
  {
    name: 'tank',
    size: '7999982616576',
    alloc: '3199993046630',
    free: '4799989569946',
    capacity_percent: '40',
    dedup_ratio: '1.00x',
    health: 'ONLINE',
    altroot: null,
  },
];
const DATASETS = {
  filesystem: [
    { name: 'rpool/zones', type: 'filesystem', used: '412316860416', avail: '1380010156032' },
    {
      name: 'rpool/zones/companyA',
      type: 'filesystem',
      used: '2147483648',
      avail: '1380010156032',
    },
    { name: 'tank/zones', type: 'filesystem', used: '3199993046630', avail: '4799989569946' },
  ],
  volume: [
    { name: 'rpool/vols/data', type: 'volume', used: '10737418240', avail: '0', in_use_by: null },
    {
      name: 'rpool/vols/old-root',
      type: 'volume',
      used: '34359738368',
      avail: '0',
      in_use_by: 'db-1',
    },
  ],
};
const INTERFACES = {
  hyperweaver: {
    interfaces: [
      { name: 'eth0', class: 'phys', status: 'up', wireless: false },
      { name: 'wlan0', class: 'phys', status: 'up', wireless: true },
      { name: 'eth1', class: 'phys', status: 'down', wireless: false },
    ],
    default: 'eth0',
  },
  zoneweaver: {
    interfaces: [
      { name: 'igb0', class: 'phys', state: 'up', provisioning: false },
      { name: 'aggr0', class: 'aggr', state: 'up', provisioning: true },
      { name: 'stub0', class: 'etherstub', state: 'up', provisioning: false },
    ],
    excluded_aggr_members: ['igb1', 'igb2'],
  },
};
const UNATTENDED_ISOS = {
  'debian-13.1.0-amd64-netinst.iso': {
    os_typeid: 'Debian_64',
    version: '13.1.0',
    supported: true,
    os_languages: ['en-US', 'de-DE'],
  },
  'Win11_24H2_English_x64.iso': {
    os_typeid: 'Windows11_64',
    version: '24H2',
    supported: true,
    os_languages: ['en-US'],
  },
};

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const behind = (token, handler) => ctx =>
  offers(ctx.host, token) ? handler(ctx) : problem(404, 'Not Found');

const kind = (wanted, handler) => ctx =>
  ctx.host.kind === wanted ? handler(ctx) : problem(404, 'Not Found');

const nextIdOf = host => {
  const taken = host.machines
    .map(row => Number(String(row.name).split('--')[0]))
    .filter(Number.isFinite);
  return taken.length > 0 ? Math.max(...taken) + 1 : 1000;
};

const defaults = ctx => {
  const { host } = ctx;
  if (isZone(host)) {
    return ok({
      settings: { vcpus: 2, memory: '2G', os_type: 'generic', firmware_type: 'UEFI' },
      zones: {
        brand: 'bhyve',
        vmtype: 'generic',
        hostbridge: 'i440fx',
        diskif: 'virtio',
        netif: 'virtio',
        acpi: 'on',
        vnc: 'on',
        bootorder: 'bootdisk,cdrom0',
      },
      disks: { boot: { pool: 'rpool', dataset: 'zones', sparse: true } },
      config: { template_pool: 'rpool' },
      knob_values: ZONE_KNOB_VALUES,
      knob_defaults: {
        vcpus: 2,
        ram: 2048,
        'zones.diskif': 'virtio',
        'settings.sync_method': 'rsync',
        'settings.firmware_type': 'UEFI',
        'transport.remove_on_completion': true,
        'disks.boot.clone_strategy': 'copy',
      },
      notes: ['bootorder and memreserve fall to the brand when unset'],
    });
  }
  return ok({
    settings: { vcpus: 2, memory: '2G', firmware_type: 'BIOS', sync_method: 'rsync' },
    zones: {},
    disks: { boot: { sparse: true, clone_strategy: 'copy' } },
    config: {},
    knob_values: KNOB_VALUES,
    knob_defaults: {
      vcpus: 2,
      ram: 2048,
      xhci: 'on',
      diskif: 'sata',
      boot_priority: 95,
      'settings.sync_method': 'rsync',
      'settings.firmware_type': 'BIOS',
      'transport.remove_on_completion': false,
      'disks.controller_type': 'sata',
      'disks.boot.clone_strategy': 'copy',
      'disks.sparse': true,
    },
    notes: ['VirtualBox recommends the rest per guest OS type'],
  });
};

const ostypes = ctx => {
  const { host } = ctx;
  if (isZone(host)) {
    return ok({ ostypes: ZONE_OS_TYPES, total: ZONE_OS_TYPES.length });
  }
  if (!hypervisorsOf(host).includes('virtualbox')) {
    return refusal(503, 'VirtualBox is not installed on this host');
  }
  return ok({ ostypes: OS_TYPES, total: OS_TYPES.length });
};

const nextId = ctx => ok({ server_id: nextIdOf(ctx.host) });

const templates = () => ok({ templates: TEMPLATES, total: TEMPLATES.length });

const discovered = () =>
  BOXES.map(box => ({
    id: BOXES.indexOf(box) + 1,
    name: box.name,
    description: box.description,
    isPublic: box.isPublic !== false,
    user: { id: 1, username: 'mark', primaryOrganization: { name: box.organization } },
    organization: { id: 1, name: box.organization },
    versions: box.versions.map(versionNumber => ({
      versionNumber,
      description: `${box.name} ${versionNumber}`,
      providers: [
        {
          name: 'virtualbox',
          architectures: ARCHITECTURES.map(name => ({
            name,
            defaultBox: name === 'amd64',
            files: [
              {
                fileName: 'vagrant.box',
                fileSize: 734003200,
                checksum: '8f0a9c1e',
                checksumType: 'sha256',
              },
            ],
          })),
        },
      ],
    })),
  }));

const remote = ctx => {
  const source = decodeURIComponent(ctx.params.source);
  if (!REGISTRIES[source]) {
    return refusal(404, 'Template source not found or disabled');
  }
  if (source === 'mirror') {
    return refusal(502, 'Failed to retrieve templates from remote source', {
      details: 'connect ECONNREFUSED',
    });
  }
  return ok(discovered());
};

const artifacts = () => {
  const rows = [...ISO_ARTIFACTS, ...ROLE_ARTIFACTS];
  return ok({ artifacts: rows, pagination: { total: rows.length, limit: 50, offset: 0 } });
};

const isoArtifacts = () => ok({ artifacts: ISO_ARTIFACTS, total: ISO_ARTIFACTS.length });

const media = () => ok({ media: MEDIA, total: MEDIA.length });

const pools = () => ok({ pools: POOLS, total: POOLS.length });

const datasets = ctx => {
  const type = ctx.url.searchParams.get('type') || 'filesystem';
  const rows = DATASETS[type] || [];
  return ok({ datasets: rows, total: rows.length });
};

const bridged = ctx => {
  const rows = INTERFACES[ctx.host.kind];
  return ok({ ...rows, total: rows.interfaces.length });
};

const ipSuggestions = ctx => {
  const count = Math.max(1, Number(ctx.url.searchParams.get('count')) || 20);
  const suggestions = [...Array(count).keys()].map(index => `192.168.1.${120 + index}`);
  return ok({
    interface: isZone(ctx.host) ? 'igb0' : 'eth0',
    subnet: '192.168.1.0/24',
    gateway: '192.168.1.1',
    used: ['192.168.1.1', '192.168.1.50', '192.168.1.51'],
    suggestions,
    total_used: 3,
  });
};

const bytesOf = memory => {
  const match = MEMORY_PATTERN.exec(String(memory || ''));
  if (!match) {
    return 0;
  }
  return Number(match.groups.amount) * (match.groups.unit.toUpperCase() === 'G' ? GIB : 1024 ** 2);
};

const shortOf = (host, body) => {
  const requested = bytesOf(body.settings?.memory);
  const total = Number(host.facts.totalmem) || 32 * GIB;
  const free = Number(host.facts.freemem) || total / 4;
  if (requested <= free) {
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

const createNameOf = body => {
  const { hostname, domain, server_id: serverId } = body.settings;
  if (body.name) {
    return body.name;
  }
  const prefix = serverId ? `${serverId}--` : '';
  return `${prefix}${hostname}.${domain}`;
};

const SPEC_RULES = [
  {
    broken: ({ body }) => !body.settings?.hostname || !body.settings?.domain,
    word: 'settings.hostname and settings.domain are required',
  },
  {
    broken: ({ body }) => body.provisioner && (!body.provisioner.name || !body.provisioner.version),
    word: 'provisioner needs both name and version',
  },
  {
    broken: ({ body }) => body.disks?.boot && !BOOT_TYPES.includes(body.disks.boot.type),
    word: `disks.boot.type must be one of ${BOOT_TYPES.join(', ')}`,
  },
  {
    broken: ({ body }) => body.sync_method && !SYNC_METHODS.includes(body.sync_method),
    word: 'sync_method must be rsync or scp',
  },
  {
    broken: ({ host, body }) => !isZone(host) && !HYPERVISORS.includes(body.hypervisor || ''),
    word: 'hypervisor must be virtualbox or utm',
  },
  {
    broken: ({ host, body }) => body.hypervisor === 'utm' && !hypervisorsOf(host).includes('utm'),
    word: 'utm machines need a darwin host',
  },
  {
    broken: ({ body }) => body.settings?.vcpus !== undefined && Number(body.settings.vcpus) < 1,
    word: 'settings.vcpus must be at least 1',
  },
];

const specRefusal = ctx => {
  const rule = SPEC_RULES.find(entry => entry.broken(ctx));
  return rule ? refusal(400, rule.word) : null;
};

const requiresDownload = body =>
  body.disks?.boot?.type === 'template' &&
  !TEMPLATES.some(
    row =>
      `${row.organization}/${row.box_name}` === body.settings?.box &&
      (!body.settings?.box_version || row.version === body.settings.box_version)
  );

const createRefusal = ctx => {
  const { host, body } = ctx;
  const refused = specRefusal(ctx);
  if (refused) {
    return refused;
  }
  const short = shortOf(host, body);
  if (short.length > 0) {
    return refusal(400, 'Insufficient resources', { details: short });
  }
  const name = createNameOf(body);
  if (machineOf(host, name)) {
    return refusal(409, `${isZone(host) ? 'Zone' : 'Machine'} ${name} already exists in database`);
  }
  return null;
};

const queuedCreate = ({ host, person, body }) => {
  const zone = isZone(host);
  const name = createNameOf(body);
  const operation = zone ? 'zone_create_orchestration' : 'machine_create_orchestration';
  const download = requiresDownload(body);
  const task = queue({
    host,
    by: person.username,
    operation,
    target: name,
    metadata: {
      hypervisor: zone ? 'bhyve' : body.hypervisor || 'virtualbox',
      start: Boolean(body.start_after_create),
      provisioner: body.provisioner || null,
      box: body.settings?.box || '',
    },
  });
  return ok(
    {
      success: true,
      parent_task_id: task.id,
      machine_name: name,
      ...(zone ? {} : { storage_path_id: null }),
      operation,
      status: 'pending',
      message: zone ? 'Zone creation queued' : 'Machine creation queued',
      requires_download: download,
      sub_tasks: {
        ...(download ? { download: `${task.id}-download` } : {}),
        prepare: `${task.id}-prepare`,
        storage: `${task.id}-storage`,
        config: `${task.id}-config`,
        finalize: `${task.id}-finalize`,
      },
    },
    zone ? 202 : 200
  );
};

const created = ctx => createRefusal(ctx) || queuedCreate(ctx);

const afterCreate = (host, task) => {
  const { hypervisor, start } = task.metadata || {};
  if (!machineOf(host, task.machine_name)) {
    host.machines = [
      ...host.machines,
      {
        name: task.machine_name,
        status: start ? 'running' : stoppedWord(host),
        brand: hypervisor,
        hypervisor,
        notes: '',
        tags: [],
      },
    ];
  }
};

const detected = ctx => {
  const iso = ctx.url.searchParams.get('iso') || '';
  if (!iso) {
    return refusal(400, 'iso is required');
  }
  const known = UNATTENDED_ISOS[iso.split(/[\\/]/u).pop()];
  return ok(
    known || {
      os_typeid: '',
      version: '',
      supported: false,
      os_languages: [],
    }
  );
};

const installed = ctx => {
  const { host, person, params, body } = ctx;
  const name = decodeURIComponent(params.name);
  const row = machineOf(host, name);
  if (!row) {
    return refusal(404, 'Machine not found');
  }
  if (row.hypervisor === 'utm') {
    return refusal(400, 'unattended install is a VirtualBox mechanism');
  }
  if (row.status === 'running') {
    return refusal(400, 'Machine must be powered off for an unattended install');
  }
  if (!body.iso && !body.path) {
    return refusal(400, 'iso or path is required');
  }
  if (!body.user || !body.password) {
    return refusal(400, 'user and password are required');
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'machine_unattended_install',
    target: name,
    metadata: { iso: body.iso || body.path, user: body.user, start: body.start !== false },
  });
  return ok(
    {
      success: true,
      task_id: task.id,
      machine_name: name,
      operation: 'machine_unattended_install',
      status: 'pending',
      message: `Unattended install queued for ${name}`,
    },
    202
  );
};

const afterInstall = (host, task) => {
  const row = machineOf(host, task.machine_name);
  if (row && task.metadata?.start) {
    host.machines = host.machines.map(entry =>
      entry.name === row.name ? { ...entry, status: 'running' } : entry
    );
  }
};

const knownOrganizations = () =>
  ok({
    success: true,
    organizations: [...organizations.values()]
      .filter(org => !org.personal)
      .map(org => ({ org_uuid: org.uuid, name: org.name })),
  });

const federated = ctx => Boolean(ctx.token?.provider?.startsWith('oidc-'));

const boxvault = handler => ctx =>
  federated(ctx) ? handler(ctx) : problem(403, 'A federated session is required for BoxVault');

const orgBoxes = ctx => {
  const slug = decodeURIComponent(ctx.params.org);
  const rows = discovered().filter(box => box.organization.name === slug);
  return rows.length > 0 ? ok(rows) : refusal(404, 'Organization not found');
};

const downloadLink = ctx => {
  const { org, box, version, provider, arch } = ctx.params;
  return ok({
    downloadUrl: `https://boxvault.example.com/api/organization/${org}/box/${box}/version/${version}/provider/${provider}/architecture/${arch}/file/download?token=signed`,
    expiresIn: 3600,
  });
};

/**
 * The create wizard's routes on both agents, each answering as the agent
 * of the host's kind does: `POST machines` behind `machine-create`, the
 * spec refused for a missing hostname or domain, a half-named
 * provisioner, an unknown boot type, sync method or hypervisor, or for
 * want of memory with `details`, and otherwise a queued orchestration
 * whose machine joins the host's rows when its task completes; the
 * feeds the pickers read, `machines/defaults`, `machines/ostypes` (503
 * without VirtualBox on the hyperweaver kind), `machines/ids/next`,
 * `templates` and `templates/remote/{source}` behind `templates` (the
 * mirror registry unreachable, BoxVault answering its discover shape),
 * `artifacts` and `artifacts/iso` behind `artifacts`, `media` on the
 * hyperweaver kind, `storage/pools` and `storage/datasets` behind `zfs`,
 * `provisioning/bridged-interfaces` and `network/ip-suggestions`; the
 * unattended install's `machines/unattended/detect` and
 * `machines/{name}/unattended` on the hyperweaver kind; and on the
 * server role `GET /api/organizations` and the BoxVault proxy under
 * `/api/boxvault/*`, refused 403 for a session that is not federated.
 *
 * @param {Object} router - `sessionRoute` and `agentRoute`
 * @returns {void}
 */
export const mountMachineCreate = ({ sessionRoute, agentRoute }) => {
  settles('machine_create_orchestration', afterCreate);
  settles('zone_create_orchestration', afterCreate);
  settles('machine_unattended_install', afterInstall);
  agentRoute('POST', 'machines', behind('machine-create', created));
  agentRoute('GET', 'machines/defaults', defaults);
  agentRoute('GET', 'machines/ostypes', ostypes);
  agentRoute('GET', 'machines/ids/next', nextId);
  agentRoute('GET', 'templates', behind('templates', templates));
  agentRoute('GET', 'templates/remote/:source', behind('templates', remote));
  agentRoute('GET', 'artifacts', behind('artifacts', artifacts));
  agentRoute('GET', 'artifacts/iso', behind('artifacts', isoArtifacts));
  agentRoute('GET', 'media', kind('hyperweaver', media));
  agentRoute('GET', 'storage/pools', behind('zfs', pools));
  agentRoute('GET', 'storage/datasets', behind('zfs', datasets));
  agentRoute('GET', 'provisioning/bridged-interfaces', bridged);
  agentRoute('GET', 'network/ip-suggestions', ipSuggestions);
  agentRoute('GET', 'machines/unattended/detect', kind('hyperweaver', detected));
  agentRoute('POST', 'machines/:name/unattended', kind('hyperweaver', installed));
  if (!AGENT_MODE) {
    sessionRoute('GET', '/api/organizations', knownOrganizations);
    sessionRoute(
      'GET',
      '/api/boxvault/api/discover',
      boxvault(() => ok(discovered()))
    );
    sessionRoute('GET', '/api/boxvault/api/organization/:org/box', boxvault(orgBoxes));
    sessionRoute(
      'POST',
      '/api/boxvault/api/organization/:org/box/:box/version/:version/provider/:provider/architecture/:arch/file/get-download-link',
      boxvault(downloadLink)
    );
  }
};
