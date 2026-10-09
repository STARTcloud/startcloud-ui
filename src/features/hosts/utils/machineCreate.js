import { hostHasFeature } from './capabilities';
import { withAddressing, cdromEntry, filesystemEntries } from './machineHelpers';
import { SOURCE_FORM } from './manageCatalog';
import { canCreateMachines } from './permissions';

export const CREATE_STEPS = [
  'general',
  'box',
  'system',
  'disks',
  'resources',
  'network',
  'provisioning',
  'confirm',
];

export const BOX_SETTING_KEYS = ['box', 'box_version', 'box_arch', 'box_url'];

export const SETTING_KEYS = [
  'hostname',
  'domain',
  'server_id',
  'vcpus',
  'memory',
  'os_type',
  'boot_priority',
  'box',
  'box_version',
  'box_arch',
  'box_url',
  'firmware_type',
  'provider_type',
  'setup_wait',
  'show_console',
  'debug_build',
  'post_provision',
  'consoleport',
  'vagrant_user',
  'vagrant_user_pass',
  'vagrant_ssh_insert_key',
];

const CREATE_PARAM = 'create';
const CREATE_WORD = 'machine';
const SEED_KEYS = [
  'box',
  'box_version',
  'box_arch',
  'box_url',
  'provisioner',
  'provisioner_version',
  'provisioner_url',
  'provisioner_catalog',
];
const BOX_PROVIDER = /^box_[a-z0-9_-]+$/u;
const BOX_PICKS = {
  virtualbox: ['box_virtualbox'],
  bhyve: ['box_zone', 'box_bhyve'],
  utm: ['box_utm', 'box_virtualbox'],
};
const SOURCE_ID_CHARS = /[^a-z0-9]+/gu;
const SOURCE_ID_EDGES = /^_+|_+$/gu;
const BOOT_TYPES = { template: 'template', scratch: 'blank', existing: 'image', none: 'none' };
const NUMERIC_SETTINGS = ['setup_wait', 'consoleport'];
const BOOLEAN_SETTINGS = [
  'show_console',
  'debug_build',
  'post_provision',
  'vagrant_ssh_insert_key',
];
const NIC_WORDS = ['cable_connected', 'promisc', 'bandwidth_group', 'nic_type', 'route'];
const NIC_NUMBERS = ['speed', 'boot_prio'];

const blank = value => value === '' || value === undefined || value === null;

const trimmed = value => String(value ?? '').trim();

export const emptySettings = () => ({
  ...Object.fromEntries(SETTING_KEYS.map(key => [key, ''])),
  vcpus: 2,
  memory: '2G',
});

export const emptyDiskConfig = () => ({
  bootSize: '',
  bootSparse: true,
  bootPath: '',
  bootVolumeName: '',
  bootPool: '',
  bootDataset: '',
  bootCloneStrategy: 'copy',
  bootController: '',
  bootPort: '',
  bootDirectory: '',
  additional: [],
  cdroms: [],
  controllers: [],
  filesystems: [],
});

export const emptyCloudInit = () => ({
  enabled: false,
  dns_domain: '',
  password: '',
  resolvers: '',
  sshkey: '',
});

export const defaultExternalNetwork = () => ({
  type: 'external',
  bridge: '',
  dhcp4: true,
  dhcp6: false,
  mac: 'auto',
  dns: ['1.1.1.1', '8.8.8.8'],
});

/**
 * Whether New machine draws for a host: for a person who may create
 * machines on a host whose own row lists `machines` and `machine-create`,
 * the token of the agent that answers `POST machines`.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} [role] - The person's role
 * @returns {boolean} True when New machine draws
 */
export const hostCreates = (server, role) =>
  canCreateMachines(role) &&
  hostHasFeature(server, 'machines') &&
  hostHasFeature(server, 'machine-create');

const isBoxProviderKey = key => BOX_PROVIDER.test(key) && !SEED_KEYS.includes(key);

const providerKeysOf = keys => [...new Set(keys)].filter(isBoxProviderKey).sort();

/**
 * What a `?create=machine` deep link seeds the wizard with, the Deploy
 * hand-off's two seeds: BoxVault's `box`, `box_version`, `box_arch` and
 * `box_url`, and the catalog's `provisioner`, `provisioner_version`,
 * `provisioner_url`, `provisioner_catalog` and its `box_<provider>`
 * members, each fixed member empty where the query leaves it out and a
 * `box_<provider>` member present only where the query carries it, or
 * null while the query asks for no machine.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {Object|null} The seed, one member a key of the two seeds
 */
export const createSeedOf = params => {
  if (params.get(CREATE_PARAM) !== CREATE_WORD) {
    return null;
  }
  return {
    ...Object.fromEntries(SEED_KEYS.map(key => [key, params.get(key) || ''])),
    ...Object.fromEntries(
      providerKeysOf([...params.keys()])
        .filter(key => params.get(key))
        .map(key => [key, params.get(key)])
    ),
  };
};

/**
 * The route a door to the wizard navigates to, the host's own page with
 * the `create=machine` query and the seed's members where given, the
 * fixed members first and the `box_<provider>` members after them sorted
 * by key, the one way the wizard opens, so a deep link and a row of a
 * menu open it the same way.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object|null} [seed] - The seed of `createSeedOf`
 * @returns {string} The route
 */
export const createRouteOf = (id, seed = null) => {
  const params = new URLSearchParams({ [CREATE_PARAM]: CREATE_WORD });
  [...SEED_KEYS, ...providerKeysOf(Object.keys(seed || {}))].forEach(key => {
    if (seed?.[key]) {
      params.set(key, seed[key]);
    }
  });
  return `/hosts/${encodeURIComponent(id)}?${params}`;
};

/**
 * The route's search params with the deep link's members taken out, the
 * `box_<provider>` members with them, what the page keeps once the wizard
 * has opened, so a reload opens it again only when asked.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {URLSearchParams} The params left
 */
export const withoutCreateSeed = params => {
  const next = new URLSearchParams(params);
  [CREATE_PARAM, ...SEED_KEYS, ...providerKeysOf([...params.keys()])].forEach(key =>
    next.delete(key)
  );
  return next;
};

/**
 * The box a handed `box_<provider>` member lands on the Box step for a
 * host, picked by the host's hypervisors in their order: a VirtualBox
 * host takes `box_virtualbox`, a bhyve host `box_zone` then `box_bhyve`,
 * a UTM host `box_utm` then `box_virtualbox`; the member's
 * `organization/name@version@architecture@url` parsed into the four box
 * settings, the URL the rest after the third `@`. Null while no member
 * fits the host.
 *
 * @param {Object|null} seed - The seed of `createSeedOf`
 * @param {Array<string>} hypervisors - The host's `capabilities.hypervisors`
 * @returns {{ box: string, box_version: string, box_arch: string, box_url: string }|null} The box
 */
export const seedBoxFor = (seed, hypervisors) => {
  const key = (Array.isArray(hypervisors) ? hypervisors : [])
    .flatMap(hypervisor => BOX_PICKS[hypervisor] || [])
    .find(candidate => seed?.[candidate]);
  if (!key) {
    return null;
  }
  const [box, version, architecture, ...rest] = String(seed[key]).split('@');
  if (!box) {
    return null;
  }
  return {
    box,
    box_version: version || '',
    box_arch: architecture || '',
    box_url: rest.join('@'),
  };
};

/**
 * The box a handed seed lands on the Box step: the plain `box` seed of
 * BoxVault with its three members while the seed carries one, else the
 * catalog's `box_<provider>` member the host's hypervisors pick through
 * `seedBoxFor`, null while neither names a box.
 *
 * @param {Object|null} seed - The seed of `createSeedOf`
 * @param {Array<string>} hypervisors - The host's `capabilities.hypervisors`
 * @returns {{ box: string, box_version: string, box_arch: string, box_url: string }|null} The box
 */
export const seedBoxOf = (seed, hypervisors) => {
  if (seed?.box) {
    return {
      box: seed.box,
      box_version: seed.box_version || '',
      box_arch: seed.box_arch || '',
      box_url: seed.box_url || '',
    };
  }
  return seedBoxFor(seed, hypervisors);
};

/**
 * The registry the agent downloads a box from, the way the agent resolves
 * `settings.box_url` at a create: the enabled source whose URL the box
 * URL starts with, the default enabled source while the box URL is empty,
 * null while none fits.
 *
 * @param {Array<Object>} sources - The sources of `GET templates/sources`
 * @param {string} boxUrl - The box's `box_url`
 * @returns {Object|null} The source
 */
export const templateSourceFor = (sources, boxUrl) => {
  const enabled = (Array.isArray(sources) ? sources : []).filter(
    source => source && source.enabled !== false
  );
  if (!boxUrl) {
    return enabled.find(source => source.default === true) || null;
  }
  return (
    enabled.find(
      source => typeof source.url === 'string' && source.url && boxUrl.startsWith(source.url)
    ) || null
  );
};

/**
 * The registry form that adds the registry a handed box is fetched from,
 * the shape the Templates section's registry dialog hands up: the id its
 * host lowercased with every run of other characters as one underscore,
 * the display name its host, the URL its origin, not the default and
 * with no credential; null while the box URL is no URL.
 *
 * @param {string} boxUrl - The box's `box_url`
 * @returns {Object|null} The form, the shape of `SOURCE_FORM`
 */
export const templateSourceFormOf = boxUrl => {
  let parsed;
  try {
    parsed = new URL(boxUrl);
  } catch {
    return null;
  }
  const name = parsed.host.toLowerCase().replace(SOURCE_ID_CHARS, '_').replace(SOURCE_ID_EDGES, '');
  if (!name) {
    return null;
  }
  return { ...SOURCE_FORM, name, displayName: parsed.host, url: parsed.origin };
};

/**
 * The host's family a handed `provisioner` names, the part after its last
 * slash, the whole value while it carries none.
 *
 * @param {string} provisioner - The seed's `provisioner`, `organization/name`
 * @returns {string} The family name
 */
export const seedFamilyOf = provisioner =>
  String(provisioner || '')
    .split('/')
    .pop();

/**
 * The version a catalog document lists for one family: the named version,
 * else the family's first, null while the document holds no such family
 * or the family no version.
 *
 * @param {Object|null} catalog - The answer of `GET provisioning/catalog`
 * @param {string} name - The family name
 * @param {string} version - The handed version, empty for the first
 * @returns {string|null} The version
 */
export const catalogVersionOf = (catalog, name, version) => {
  const family = (Array.isArray(catalog?.provisioners) ? catalog.provisioners : []).find(
    entry => entry.name === name
  );
  const versions = Array.isArray(family?.versions) ? family.versions : [];
  const named = versions.find(entry => entry.version === version);
  return (named || (version ? null : versions[0]))?.version || null;
};

/**
 * What the wizard offers for a handed family the host does not hold:
 * `install` from the first source whose catalog lists the family and its
 * version, `add` while none does and the handed catalog is no source of
 * the host, and `missing` otherwise.
 *
 * @param {Object} options - The handed family and what the host answered
 * @param {Array<Object>} options.sources - `{ id, url }` of `GET provisioning/catalog/sources`
 * @param {Object<string, Object|null>} options.catalogs - The catalog document of each source by its id
 * @param {string} options.name - The family name
 * @param {string} options.version - The handed version
 * @param {string} options.catalogUrl - The handed `provisioner_catalog`
 * @returns {{ kind: string, source: string, version: string }} The offer
 */
export const installOfferOf = ({ sources, catalogs, name, version, catalogUrl }) => {
  const holding = sources.find(source => catalogVersionOf(catalogs[source.id], name, version));
  if (holding) {
    return {
      kind: 'install',
      source: holding.id,
      version: catalogVersionOf(catalogs[holding.id], name, version),
    };
  }
  if (catalogUrl && !sources.some(source => source.url === catalogUrl)) {
    return { kind: 'add', source: '', version };
  }
  return { kind: 'missing', source: '', version };
};

/**
 * The body of `POST provisioning/catalog/sources` for a handed catalog:
 * its host as the display name, the URL as given, and `auth` `oidc` for an
 * organization's private catalog, `none` otherwise.
 *
 * @param {string} url - The handed `provisioner_catalog`
 * @returns {{ display_name: string, url: string, auth: string }} The body
 */
export const catalogSourceBody = url => {
  const parsed = new URL(url);
  return {
    display_name: parsed.host,
    url,
    auth: parsed.pathname.startsWith('/api/private/') ? 'oidc' : 'none',
  };
};

const bootEntryOf = ({ diskConfig, bootSource, bhyve, vbox }) => {
  const boot = { type: BOOT_TYPES[bootSource] };
  if (bootSource === 'existing' && diskConfig.bootPath) {
    boot.path = diskConfig.bootPath;
  }
  if (bootSource === 'scratch' || bootSource === 'template') {
    if (diskConfig.bootSize) {
      boot.size = diskConfig.bootSize;
    }
    boot.sparse = diskConfig.bootSparse;
    if (diskConfig.bootVolumeName) {
      boot.volume_name = diskConfig.bootVolumeName;
    }
    if (bhyve && trimmed(diskConfig.bootPool)) {
      boot.pool = trimmed(diskConfig.bootPool);
    }
    if (bhyve && trimmed(diskConfig.bootDataset)) {
      boot.dataset = trimmed(diskConfig.bootDataset);
    }
    if (bootSource === 'template' && diskConfig.bootCloneStrategy) {
      boot.clone_strategy = diskConfig.bootCloneStrategy;
    }
    if (vbox && trimmed(diskConfig.bootDirectory)) {
      boot.directory = trimmed(diskConfig.bootDirectory);
    }
  }
  if (vbox && boot.type !== 'none') {
    if (trimmed(diskConfig.bootController)) {
      boot.controller = trimmed(diskConfig.bootController);
    }
    if (diskConfig.bootPort !== '') {
      boot.port = Number(diskConfig.bootPort);
    }
  }
  return boot;
};

const additionalDiskOf = (row, { bhyve, vbox }) => {
  if (row.mode === 'existing') {
    return row.path ? withAddressing({ type: 'image', path: row.path }, row) : null;
  }
  if (!row.size) {
    return null;
  }
  const base = { type: 'blank', size: row.size, sparse: row.sparse !== false };
  if (trimmed(row.volume_name)) {
    base.volume_name = trimmed(row.volume_name);
  }
  if (bhyve && trimmed(row.pool)) {
    base.pool = trimmed(row.pool);
  }
  if (bhyve && trimmed(row.dataset)) {
    base.dataset = trimmed(row.dataset);
  }
  if (vbox && trimmed(row.directory)) {
    base.directory = trimmed(row.directory);
  }
  return withAddressing(base, row);
};

/**
 * The `disks` of the create spec, the device model both agents read: the
 * `controllers` rows where any are given, the `boot` entry with its
 * declared type, `template`, `blank`, `image` or `none`, and that type's
 * keys alone, the `additional_disks`, each an image or a blank disk, and
 * the `cdroms`; the ZFS placement rides a bhyve host's entries and the
 * controller, port and directory a VirtualBox host's.
 *
 * @param {Object} form - `diskConfig`, `bootSource`, `bhyve` and `vbox`
 * @returns {Object|null} The disks, or null when nothing is said
 */
export const buildDisks = form => {
  const { diskConfig, bhyve, vbox } = form;
  const disks = {};
  const controllers = diskConfig.controllers
    .filter(row => row.type)
    .map(row => ({
      ...(trimmed(row.name) && { name: trimmed(row.name) }),
      type: row.type,
      ...(row.ports !== '' && { ports: Number(row.ports) }),
      ...(row.bootable && { bootable: true }),
    }));
  if (controllers.length > 0) {
    disks.controllers = controllers;
  }
  disks.boot = bootEntryOf(form);
  const additional = diskConfig.additional
    .map(row => additionalDiskOf(row, { bhyve, vbox }))
    .filter(Boolean);
  if (additional.length > 0) {
    disks.additional_disks = additional;
  }
  const cdroms = diskConfig.cdroms
    .map(row => {
      const base = cdromEntry(row);
      return base && withAddressing(base, row);
    })
    .filter(Boolean);
  if (cdroms.length > 0) {
    disks.cdroms = cdroms;
  }
  return Object.keys(disks).length > 0 ? disks : null;
};

/**
 * The `cloud_init` of the create spec in the agents' own vocabulary, only
 * while it is enabled and only the members that say something.
 *
 * @param {Object} cloudInit - The form's cloud-init
 * @returns {Object|null} The cloud-init, or null
 */
export const buildCloudInit = cloudInit => {
  if (!cloudInit.enabled) {
    return null;
  }
  const resolvers = cloudInit.resolvers
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  return {
    enabled: true,
    ...(cloudInit.dns_domain && { dns_domain: cloudInit.dns_domain }),
    ...(cloudInit.password && { password: cloudInit.password }),
    ...(resolvers.length > 0 && { resolvers }),
    ...(cloudInit.sshkey && { sshkey: cloudInit.sshkey }),
  };
};

/**
 * The raw `vbox` section typed as JSON, null while the text is empty or
 * is not JSON, which the System step's own check reports.
 *
 * @param {string} vboxJson - The typed JSON
 * @returns {Object|null} The parsed section
 */
export const parseVboxPassthrough = vboxJson => {
  if (!trimmed(vboxJson)) {
    return null;
  }
  try {
    return JSON.parse(vboxJson);
  } catch {
    return null;
  }
};

const cleanedNetwork = network => {
  const dns = (Array.isArray(network.dns) ? network.dns : []).filter(Boolean);
  const entry = { ...network };
  if (dns.length > 0) {
    entry.dns = dns;
  } else {
    delete entry.dns;
  }
  NIC_WORDS.forEach(key => {
    if (blank(entry[key])) {
      delete entry[key];
    }
  });
  NIC_NUMBERS.forEach(key => {
    if (blank(entry[key])) {
      delete entry[key];
    } else {
      entry[key] = Number(entry[key]);
    }
  });
  if (entry.cable_connected !== undefined) {
    entry.cable_connected = entry.cable_connected === 'on';
  }
  return entry;
};

/**
 * The `networks` of the create spec: every row as the editor holds it,
 * a blank DNS never sent, the adapter knobs sent only where chosen and
 * the numeric ones as numbers, `cable_connected` as a boolean.
 *
 * @param {Array<Object>} networks - The editor's rows
 * @returns {Array<Object>} The rows on the wire
 */
export const cleanNetworks = networks => networks.map(cleanedNetwork);

const mergedSettingsOf = ({ settings, bootSource, bootOrder }) => {
  const merged = {};
  SETTING_KEYS.forEach(key => {
    if (bootSource !== 'template' && BOX_SETTING_KEYS.includes(key)) {
      return;
    }
    if (!blank(settings[key])) {
      merged[key] = settings[key];
    }
  });
  if (merged.boot_priority !== undefined) {
    merged.boot_priority = Number(merged.boot_priority);
  }
  NUMERIC_SETTINGS.forEach(key => {
    if (merged[key] !== undefined) {
      merged[key] = Number(merged[key]);
    }
  });
  BOOLEAN_SETTINGS.forEach(key => {
    if (merged[key] !== undefined) {
      merged[key] = merged[key] === 'true';
    }
  });
  if (bootOrder.length > 0) {
    merged.boot_order = bootOrder;
  }
  return merged;
};

const vboxSectionOf = ({ vbox, hardwarePayload, zones, vboxJson }) => {
  const passthrough = parseVboxPassthrough(vboxJson);
  if (!vbox) {
    return passthrough || {};
  }
  return {
    ...hardwarePayload,
    ...(zones.guest_agent === true && { guest_agent: true }),
    ...(passthrough || {}),
  };
};

const tagsOf = tagsInput =>
  tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

/**
 * The body of `POST machines`, the create spec the Confirm step draws and
 * Create sends, exactly as hyperweaver-ui built it: the `name` where
 * given, the `hypervisor` where chosen, the `provisioner` while a family
 * is picked, the `settings` the wizard edited with the box fields on a
 * template boot alone, the `disks`, the `filesystems` and `zones` of a
 * bhyve host, the `vbox` section of a VirtualBox host, `cloud_init`,
 * `tags`, `notes`, `networks`, `roles`, `properties` with the hidden
 * fields pruned, `sync_method`, `remove_transport_on_completion` where
 * chosen, `safe_id_path` where the package declares id files, `org_uuid`
 * where chosen and `start_after_create`.
 *
 * @param {Object} form - The wizard's state with `hardwarePayload` and `properties` already built
 * @returns {Object} The spec
 */
export const buildSpec = form => {
  const { bhyve, familyName, version, versionKey, name, machineHypervisor } = form;
  const disks = buildDisks(form);
  const filesystems = filesystemEntries(form.diskConfig.filesystems);
  const cloudInit = buildCloudInit(form.cloudInit);
  const zoneFields = bhyve
    ? Object.fromEntries(
        Object.entries(form.zones).filter(([, value]) => value !== '' && value !== undefined)
      )
    : {};
  const vboxSection = vboxSectionOf(form);
  const tags = tagsOf(form.tagsInput);
  return {
    ...(trimmed(name) && { name: trimmed(name) }),
    ...(machineHypervisor && { hypervisor: machineHypervisor }),
    ...(familyName && {
      provisioner: { name: familyName, version: version?.version || versionKey },
    }),
    settings: mergedSettingsOf(form),
    ...(disks && { disks }),
    ...(filesystems.length > 0 && { filesystems }),
    ...(Object.keys(zoneFields).length > 0 && { zones: zoneFields }),
    ...(Object.keys(vboxSection).length > 0 && { vbox: vboxSection }),
    ...(cloudInit && { cloud_init: cloudInit }),
    ...(tags.length > 0 && { tags }),
    ...(trimmed(form.notes) && { notes: trimmed(form.notes) }),
    networks: cleanNetworks(form.networks),
    roles: form.roles,
    properties: form.properties,
    sync_method: form.syncMethod,
    ...(familyName &&
      form.removeTransport !== '' && {
        remove_transport_on_completion: form.removeTransport === 'true',
      }),
    ...(form.needsSafeId && trimmed(form.safeIdPath) && { safe_id_path: trimmed(form.safeIdPath) }),
    ...(form.orgUuid && { org_uuid: form.orgUuid }),
    start_after_create: form.startAfterCreate,
  };
};

/**
 * Why a step of the wizard cannot be left, the key of the sentence that
 * says so, empty for a step that can: the General step needs the
 * hostname and the domain; the Box step of a machine on UTM needs a
 * template boot with a box; the System step's raw `vbox` text must be
 * JSON; the Disks step's blank boot needs a size and its existing boot a
 * path; the Provisioning step refuses a family without a version. The
 * field DSL's own check is the step's second gate.
 *
 * @param {string} stepId - The step
 * @param {Object} form - The wizard's state
 * @returns {string} The locale key, or the empty string
 */
export const stepProblemOf = (stepId, form) => {
  const { settings, bootSource, diskConfig } = form;
  if (stepId === 'general' && (!settings.hostname || !settings.domain)) {
    return 'machineEdit.machineCreateModal.hostnameDomainRequired';
  }
  if (
    stepId === 'box' &&
    form.machineHypervisor === 'utm' &&
    (bootSource !== 'template' || !settings.box)
  ) {
    return 'machineEdit.machineCreateModal.utmRequiresTemplateBox';
  }
  if (stepId === 'system' && trimmed(form.vboxJson) && !parseVboxPassthrough(form.vboxJson)) {
    return 'machineEdit.machineCreateModal.vboxJsonInvalid';
  }
  if (stepId === 'disks' && bootSource === 'scratch' && !diskConfig.bootSize) {
    return 'machineEdit.machineCreateModal.blankBootNeedsSize';
  }
  if (stepId === 'disks' && bootSource === 'existing' && !diskConfig.bootPath) {
    return 'machineEdit.machineCreateModal.existingBootNeedsPath';
  }
  if (stepId === 'provisioning' && form.familyName && !form.versionKey) {
    return 'machineEdit.machineCreateModal.selectVersionOrNone';
  }
  return '';
};

/**
 * What a queued create answers, read for the notice and the task: the
 * machine's name, the task the dialog may open, whether a download
 * precedes the build, and, for a spec whose package rendered several
 * hosts, every machine's name in the order they are made.
 *
 * @param {Object|null} answer - The agent's answer
 * @param {string} fallback - The name the form derived
 * @returns {{ machineName: string, taskId: string, requiresDownload: boolean, names: Array<string> }} The reading
 */
export const createdOf = (answer, fallback) => {
  const data = answer || {};
  if (data.multi_host && Array.isArray(data.machines)) {
    const names = data.machines.map(machine => machine.machine_name);
    return {
      machineName: names[0] || fallback,
      taskId: data.machines[0]?.parent_task_id || '',
      requiresDownload: false,
      names,
    };
  }
  return {
    machineName: data.machine_name || fallback,
    taskId: data.parent_task_id || data.task_id || '',
    requiresDownload: Boolean(data.requires_download),
    names: [],
  };
};

/**
 * The rows of the Network step's uplink picker from the host's bridged
 * interfaces, each labelled by its class, whether it carries the
 * provisioning network and whether it is wireless.
 *
 * @param {Array<Object>} rows - The rows of `flattenBridgedInterfaces`
 * @returns {Array<{ value: string, label: string, provisioning: boolean }>} The choices
 */
export const bridgeChoicesOf = rows =>
  rows.map(entry => {
    const traits = [
      entry.class,
      entry.provisioning ? 'provisioning' : '',
      entry.wireless ? 'wifi' : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      value: entry.name,
      label: traits ? `${entry.name} (${traits})` : entry.name,
      provisioning: entry.provisioning,
    };
  });

/**
 * The image rows of the Box step, one merged list: every registry's
 * catalog rows, each keyed by its image and its registry, and the local
 * templates joined to their registry's row or standing alone as
 * local-only images, sorted by name.
 *
 * @param {Array<Object>} remoteBoxes - The catalog rows with their `source`
 * @param {Array<Object>} templates - The local template rows
 * @returns {Array<Object>} The rows
 */
export const boxOptionsOf = (remoteBoxes, templates) => {
  const map = new Map();
  remoteBoxes.forEach(entry => {
    const key = `${entry.value}@${entry.source || ''}`;
    map.set(key, {
      key,
      value: entry.value,
      versions: [...entry.versions],
      architectures: [...entry.architectures],
      source: entry.source || '',
      sourceUrl: entry.sourceUrl || '',
      isDefaultSource: Boolean(entry.isDefaultSource),
      local: false,
    });
  });
  templates.forEach(template => {
    const value = `${template.organization}/${template.box_name}`;
    const remoteKey = [...map.keys()].find(existing => existing.startsWith(`${value}@`));
    const key = remoteKey || `${value}@local`;
    const entry = map.get(key) || {
      key,
      value,
      versions: [],
      architectures: [],
      source: '',
      sourceUrl: '',
      isDefaultSource: true,
      local: false,
    };
    if (template.version && !entry.versions.includes(template.version)) {
      entry.versions.push(template.version);
    }
    if (template.architecture && !entry.architectures.includes(template.architecture)) {
      entry.architectures.push(template.architecture);
    }
    entry.local = true;
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => a.value.localeCompare(b.value));
};

/**
 * The next free server id an agent answers, under whichever member it
 * names it, empty while it names none.
 *
 * @param {Object|null} answer - The answer of `GET machines/ids/next`
 * @returns {string} The id
 */
export const nextServerIdOf = answer => {
  const next = answer?.server_id || answer?.next_server_id || answer?.next;
  return next ? String(next) : '';
};
