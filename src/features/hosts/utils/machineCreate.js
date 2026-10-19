import { sourceKeyOf } from './boxCatalog';
import { hostHasFeature } from './capabilities';
import { configNamesOf, configPath } from './configNodes';
import { withAddressing, cdromEntry, filesystemEntries } from './machineHelpers';
import { CATALOG_SOURCE_FORM, SOURCE_FORM } from './manageCatalog';
import { canCreateMachines } from './permissions';
import { manifestRoleOf, stripTag } from './provisioning';
import { waitForOf } from './roleFiles';

export const CREATE_STEPS = [
  'general',
  'os-disks',
  'system',
  'cpu',
  'memory',
  'network',
  'provisioning',
  'confirm',
];

const PROVISIONING_STEP = 'provisioning';

export const BOX_SETTING_KEYS = ['box', 'box_version', 'box_arch', 'box_url'];

export const PACKAGE_SETTING_KEYS = [
  'box',
  'box_url',
  'box_version',
  'box_arch',
  'os_type',
  'firmware_type',
  'vcpus',
  'memory',
  'setup_wait',
  'vagrant_user',
];

const PACKAGE_BOOT_MEMBERS = [
  ['size', 'bootSize'],
  ['volume_name', 'bootVolumeName'],
  ['clone_strategy', 'bootCloneStrategy'],
  ['mount', 'bootMount'],
];

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

/**
 * The seed keys of each word of the Deploy hand-off, in the agent's order:
 * `machine` every fixed member, `provisioner` the family's four,
 * `template` the box's four and `source` the one catalog or registry URL.
 */
export const WORD_KEYS = {
  machine: SEED_KEYS,
  provisioner: ['provisioner', 'provisioner_version', 'provisioner_url', 'provisioner_catalog'],
  template: ['box', 'box_version', 'box_arch', 'box_url'],
  source: ['provisioner_catalog', 'box_url'],
};

export const CREATE_WORDS = Object.keys(WORD_KEYS);

/**
 * The task operations that land a provisioner family on a host, the
 * catalog install and the import, which Import and Update from source
 * both queue, the ones whose end reads the host's families again.
 */
export const PROVISIONER_INSTALL_OPERATIONS = ['provisioner_catalog_install', 'provisioner_import'];

const CATALOG_PAGE = 'provisioning/provisioners';
const TEMPLATES_PAGE = 'provisioning/templates';
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

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const emptySettings = () => ({
  ...Object.fromEntries(SETTING_KEYS.map(key => [key, ''])),
  vcpus: 2,
  memory: '2G',
});

export const emptyDiskConfig = () => ({
  bootSize: '',
  bootMount: '',
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
 * The hostname and the domain one Name holds: a name with a dot splits at
 * its first dot, a bare name is the hostname with the host's default
 * domain, an empty name empty parts.
 *
 * @param {string} name - The Name as typed
 * @param {string} defaultDomain - The host's default domain
 * @returns {{ hostname: string, domain: string }} The parts
 */
export const nameParts = (name, defaultDomain) => {
  const text = trimmed(name);
  if (!text) {
    return { hostname: '', domain: '' };
  }
  const dot = text.indexOf('.');
  if (dot < 0) {
    return { hostname: text, domain: trimmed(defaultDomain) };
  }
  return { hostname: text.slice(0, dot), domain: text.slice(dot + 1) };
};

/**
 * The sources a default domain comes from, in the order the first
 * non-empty one wins: the browser preference, the person's own row, the
 * organization's row and the agent's own default.
 */
export const DOMAIN_SOURCES = ['preference', 'user', 'organization', 'agent'];

const MACHINES_CONFIG = 'machines';

const AGENT_CONFIG_ROUTE = '/admin/config/machines';

const listedChoicesOf = defaults =>
  (Array.isArray(defaults?.settings?.domain_choices) ? defaults.settings.domain_choices : [])
    .filter(row => isObject(row) && DOMAIN_SOURCES.includes(row.source) && trimmed(row.domain))
    .map(row => ({ source: row.source, domain: trimmed(row.domain) }));

/**
 * The rows of the Domain source select, one a source in the order of
 * `DOMAIN_SOURCES`: the browser preference while one is set, then the
 * `user`, `organization` and `agent` rows of `settings.domain_choices`,
 * the agent's row standing in from `settings.domain` while the list
 * names none, a row with an empty domain and a second row of one source
 * dropped.
 *
 * @param {Object|null} defaults - The answer of `GET machines/defaults`
 * @param {string} [preference] - The browser's default domain preference
 * @returns {Array<{ source: string, domain: string }>} The rows
 */
export const domainChoicesOf = (defaults, preference = '') => {
  const rows = listedChoicesOf(defaults);
  const agentDomain = trimmed(defaults?.settings?.domain);
  if (agentDomain && !rows.some(row => row.source === 'agent')) {
    rows.push({ source: 'agent', domain: agentDomain });
  }
  const own = trimmed(preference);
  const all = own ? [{ source: 'preference', domain: own }, ...rows] : rows;
  return DOMAIN_SOURCES.map(source => all.find(row => row.source === source)).filter(Boolean);
};

/**
 * The default domain a bare name takes, the first non-empty of the
 * browser preference, the `user` row, the `organization` row, the
 * `agent` row and the agent's own `settings.domain`; empty while none
 * yields one.
 *
 * @param {Object} options - The sources
 * @param {string} [options.preference] - The browser's default domain preference
 * @param {Array<{ source: string, domain: string }>} [options.choices] - The rows of `domainChoicesOf`
 * @param {string} [options.agentDomain] - The agent's `settings.domain`
 * @returns {string} The domain
 */
export const defaultDomainOf = ({ preference = '', choices = [], agentDomain = '' }) => {
  const own = trimmed(preference);
  if (own) {
    return own;
  }
  const row = DOMAIN_SOURCES.map(source => choices.find(entry => entry.source === source)).find(
    entry => entry && trimmed(entry.domain)
  );
  return row ? trimmed(row.domain) : trimmed(agentDomain);
};

/**
 * The source the Domain source select reads for a domain: the first row
 * whose domain is the one held, `custom` while none is.
 *
 * @param {Array<{ source: string, domain: string }>} choices - The rows of `domainChoicesOf`
 * @param {string} domain - The domain held
 * @returns {string} The source word, or `custom`
 */
export const domainSourceOf = (choices, domain) =>
  choices.find(row => row.domain === trimmed(domain))?.source || 'custom';

/**
 * The route of the agent's `machines` configuration, where the default
 * domain lives: on the server role the host's own configuration page
 * while its row lists the `machines` file, on an agent role the admin
 * configuration page while the status lists it; null while neither does.
 *
 * @param {Object} options - The host
 * @param {boolean} options.aggregated - True on the server role
 * @param {Object|null} options.status - The payload from `probeStatus`
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @returns {string|null} The route
 */
export const domainConfigRouteOf = ({ aggregated, status, server, id }) => {
  if (aggregated) {
    return configNamesOf(server).includes(MACHINES_CONFIG) ? configPath(id, MACHINES_CONFIG) : null;
  }
  return Array.isArray(status?.config) && status.config.includes(MACHINES_CONFIG)
    ? AGENT_CONFIG_ROUTE
    : null;
};

/**
 * The steps the wizard draws for a form, every step of `CREATE_STEPS`
 * with the Provisioning step left out while Use a provisioner is off.
 *
 * @param {Object} form - The wizard's state
 * @returns {Array<string>} The step ids
 */
export const stepsFor = form =>
  form.useProvisioner ? CREATE_STEPS : CREATE_STEPS.filter(step => step !== PROVISIONING_STEP);

/**
 * Whether a step's pill opens: while every drawn step before it answers
 * no problem through `problemOf`, so the first step is always open and
 * Confirm opens once every step before it is clean.
 *
 * @param {Object} form - The wizard's state
 * @param {string} stepId - The step
 * @param {Function} problemOf - Answers a step's problem text, empty for none
 * @returns {boolean} True while the pill opens
 */
export const stepOpen = (form, stepId, problemOf) => {
  const steps = stepsFor(form);
  const at = steps.indexOf(stepId);
  return at >= 0 && steps.slice(0, at).every(step => !problemOf(step));
};

/**
 * The `metadata.defaults` of a provisioner manifest, shape-checked: the
 * `settings`, `disks`, `networks`, `tags` and `guest_agent` the package
 * defaults a machine to, null while the manifest carries none.
 *
 * @param {Object|null} version - The version's manifest
 * @returns {{ settings: Object, disks: Object, networks: Array<Object>, tags: Array<string>, guest_agent: boolean }|null} The defaults
 */
export const packageDefaultsOf = version => {
  const defaults = version?.metadata?.defaults;
  if (!isObject(defaults)) {
    return null;
  }
  return {
    settings: isObject(defaults.settings) ? defaults.settings : {},
    disks: isObject(defaults.disks) ? defaults.disks : {},
    networks: Array.isArray(defaults.networks) ? defaults.networks.filter(isObject) : [],
    tags: Array.isArray(defaults.tags)
      ? defaults.tags.filter(tag => typeof tag === 'string' && tag).map(String)
      : [],
    guest_agent: defaults.guest_agent === true,
  };
};

const packageSettingValue = (key, value) => {
  if (key === 'vcpus') {
    return Number(value);
  }
  return String(value);
};

const packageDiskRow = (disk, index) => ({
  key: `package-${index}`,
  mode: 'new',
  size: String(disk.size ?? ''),
  path: '',
  volume_name: String(disk.volume_name ?? ''),
  pool: '',
  dataset: '',
  directory: '',
  sparse: disk.sparse !== false,
  mount: String(disk.mount ?? ''),
  filesystem: String(disk.filesystem ?? ''),
});

/**
 * The members of the wizard's state a package's defaults fill, a member
 * the person typed never among them, `form.typed` the set of member paths
 * typed: the ten package settings under `settings`, `bootSource` as
 * `template` while the package names a box, the boot disk's size, volume
 * name, clone strategy and mount and the additional disks as new blank
 * rows under `diskConfig`, the `networks` as rows over the external
 * default, `tagsInput` as the `tags` joined by a comma, `zones.guest_agent`
 * as the package's `guest_agent` while the switch is unset, and
 * `fromPackage`, the set of member paths the package filled,
 * `settings.box`, `disks.boot.size`, `disks.additional.0`, `networks.0`,
 * `tags`, `zones.guest_agent` among them.
 *
 * @param {{ settings: Object, disks: Object, networks: Array<Object>, tags: Array<string>, guest_agent: boolean }} defaults - The defaults of `packageDefaultsOf`
 * @param {Object} form - The wizard's state
 * @returns {Object} The members to set
 */
export const prefilledFrom = (defaults, form) => {
  const typed = form.typed || new Set();
  const fromPackage = new Set();
  const settings = { ...form.settings };
  PACKAGE_SETTING_KEYS.forEach(key => {
    const value = defaults.settings[key];
    if (blank(value) || typed.has(`settings.${key}`)) {
      return;
    }
    settings[key] = packageSettingValue(key, value);
    fromPackage.add(`settings.${key}`);
  });
  const diskConfig = { ...form.diskConfig };
  const boot = isObject(defaults.disks.boot) ? defaults.disks.boot : {};
  PACKAGE_BOOT_MEMBERS.forEach(([member, field]) => {
    if (blank(boot[member]) || typed.has(`disks.boot.${member}`)) {
      return;
    }
    diskConfig[field] = String(boot[member]);
    fromPackage.add(`disks.boot.${member}`);
  });
  const additional = Array.isArray(defaults.disks.additional_disks)
    ? defaults.disks.additional_disks.filter(isObject)
    : [];
  if (additional.length > 0 && !typed.has('disks.additional')) {
    diskConfig.additional = additional.map(packageDiskRow);
    [...additional.keys()].forEach(index => fromPackage.add(`disks.additional.${index}`));
  }
  const filled = { settings, diskConfig, fromPackage };
  if (fromPackage.has('settings.box')) {
    filled.bootSource = 'template';
  }
  if (defaults.networks.length > 0 && !typed.has('networks')) {
    filled.networks = defaults.networks.map(network => ({
      ...defaultExternalNetwork(),
      ...network,
    }));
    [...defaults.networks.keys()].forEach(index => fromPackage.add(`networks.${index}`));
  }
  const tags = Array.isArray(defaults.tags) ? defaults.tags : [];
  if (tags.length > 0 && !typed.has('tags')) {
    filled.tagsInput = tags.join(', ');
    fromPackage.add('tags');
  }
  if (defaults.guest_agent === true && blank(form.zones?.guest_agent)) {
    filled.zones = { ...(form.zones || {}), guest_agent: true };
    fromPackage.add('zones.guest_agent');
  }
  return filled;
};

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

const sourceUrlOf = seed => seed?.provisioner_catalog || seed?.box_url || '';

/**
 * The Deploy hand-off a route carries, read from its `create` query: the
 * word, one of `machine`, `provisioner`, `template` and `source`, and the
 * seed of that word's own keys, each fixed member empty where the query
 * leaves it out, the `box_<provider>` members read under `machine` alone
 * and present only where the query carries them; null while the query
 * asks for nothing, names a word outside the four, or asks for a `source`
 * with neither or both of `provisioner_catalog` and `box_url`.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {{ word: string, seed: Object }|null} The hand-off
 */
export const handoffOf = params => {
  const word = params.get(CREATE_PARAM);
  if (!WORD_KEYS[word]) {
    return null;
  }
  const seed = {
    ...Object.fromEntries(WORD_KEYS[word].map(key => [key, params.get(key) || ''])),
    ...(word === CREATE_WORD
      ? Object.fromEntries(
          providerKeysOf([...params.keys()])
            .filter(key => params.get(key))
            .map(key => [key, params.get(key)])
        )
      : {}),
  };
  if (word === 'source' && Boolean(seed.provisioner_catalog) === Boolean(seed.box_url)) {
    return null;
  }
  return { word, seed };
};

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
  const handoff = handoffOf(params);
  return handoff?.word === CREATE_WORD ? handoff.seed : null;
};

const handoffQuery = (word, seed) => {
  const params = new URLSearchParams({ [CREATE_PARAM]: word });
  const keys =
    word === CREATE_WORD
      ? [...SEED_KEYS, ...providerKeysOf(Object.keys(seed || {}))]
      : WORD_KEYS[word];
  keys.forEach(key => {
    if (seed?.[key]) {
      params.set(key, seed[key]);
    }
  });
  return params;
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
export const createRouteOf = (id, seed = null) =>
  `/hosts/${encodeURIComponent(id)}?${handoffQuery(CREATE_WORD, seed)}`;

/**
 * The route a hand-off lands on for one host, the word's query and seed
 * kept: `machine` the host's own page, the create wizard's door;
 * `provisioner` the host's Provisioners page; `template` the host's
 * Templates page; `source` the Provisioners page for a
 * `provisioner_catalog` and the Templates page for a `box_url`.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} word - The word of `handoffOf`
 * @param {Object|null} seed - The seed of `handoffOf`
 * @returns {string} The route
 */
export const handoffRouteOf = (id, word, seed) => {
  if (word === CREATE_WORD) {
    return createRouteOf(id, seed);
  }
  const catalog =
    word === 'provisioner' || (word === 'source' && Boolean(seed?.provisioner_catalog));
  const page = catalog ? CATALOG_PAGE : TEMPLATES_PAGE;
  return `/hosts/${encodeURIComponent(id)}/${page}?${handoffQuery(word, seed)}`;
};

/**
 * The route's search params with the hand-off's members taken out, every
 * word's keys and the `box_<provider>` members with them, what a page
 * keeps once the hand-off has landed, so a reload opens it again only
 * when asked.
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

const hostHolds = (server, role, token) => canCreateMachines(role) && hostHasFeature(server, token);

const handoffToken = (word, seed) => {
  if (word === 'provisioner' || (word === 'source' && Boolean(seed?.provisioner_catalog))) {
    return 'provisioner-registry';
  }
  return 'templates';
};

/**
 * Whether a host can take a hand-off: `machine` while `hostCreates`;
 * `provisioner`, and `source` with a `provisioner_catalog`, while the
 * host's own row lists `provisioner-registry` for a person who may
 * create; `template`, and `source` with a `box_url`, while it lists
 * `templates` for that person.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} word - The word of `handoffOf`
 * @param {Object|null} seed - The seed of `handoffOf`
 * @param {string} [role] - The person's role
 * @returns {boolean} True when the host takes it
 */
export const hostTakes = (server, word, seed, role) =>
  word === CREATE_WORD
    ? hostCreates(server, role)
    : hostHolds(server, role, handoffToken(word, seed));

/**
 * The key of the one reason a host cannot take a hand-off: it cannot
 * create machines, it lists no provisioner registry, or it lists no
 * templates.
 *
 * @param {string} word - The word of `handoffOf`
 * @param {Object|null} seed - The seed of `handoffOf`
 * @returns {string} The locale key
 */
export const handoffReasonKey = (word, seed) => {
  if (word === CREATE_WORD) {
    return 'hosts.deploy.reason.noCreate';
  }
  return handoffToken(word, seed) === 'provisioner-registry'
    ? 'hosts.deploy.reason.noRegistry'
    : 'hosts.deploy.reason.noTemplates';
};

const hostOf = url => {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
};

/**
 * The words a hand-off's banner names: the thing handed, the family or
 * the box as `organization/name` and its version, or for a `source` the
 * host of the catalog or registry URL and no version.
 *
 * @param {string} word - The word of `handoffOf`
 * @param {Object|null} seed - The seed of `handoffOf`
 * @returns {{ name: string, version: string }} The words
 */
export const handoffTitleOf = (word, seed) => {
  if (word === 'source') {
    return { name: hostOf(sourceUrlOf(seed)), version: '' };
  }
  if (word === 'template' || (word === CREATE_WORD && !seed?.provisioner)) {
    return { name: seed?.box || '', version: seed?.box_version || '' };
  }
  return { name: seed?.provisioner || '', version: seed?.provisioner_version || '' };
};

/**
 * The box a handed `box_<provider>` member lands on the OS & Disks step for a
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
 * The box a handed seed lands on the OS & Disks step: the plain `box` seed of
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
 * The body of `POST provisioning/catalog/sources` for a handed catalog:
 * its host as the display name and the URL as given; the host reads the
 * source as the signed-in person whenever it holds their token.
 *
 * @param {string} url - The handed `provisioner_catalog`
 * @returns {{ display_name: string, url: string }} The body
 */
export const catalogSourceBody = url => ({ display_name: new URL(url).host, url });

/**
 * The catalog source form that adds the catalog a handed URL names, the
 * shape the Provisioners page's source form hands up: the id its host
 * lowercased with every run of other characters as one underscore, the
 * display name its host, the URL as given and not the default; null while
 * the URL is no URL.
 *
 * @param {string} url - The handed `provisioner_catalog`
 * @returns {Object|null} The form, the shape of `CATALOG_SOURCE_FORM`
 */
export const catalogSourceSeedOf = url => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const name = parsed.host.toLowerCase().replace(SOURCE_ID_CHARS, '_').replace(SOURCE_ID_EDGES, '');
  if (!name) {
    return null;
  }
  return { ...CATALOG_SOURCE_FORM, name, displayName: parsed.host, url };
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
    if (trimmed(diskConfig.bootMount)) {
      boot.mount = trimmed(diskConfig.bootMount);
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

const withMount = (entry, row) => ({
  ...entry,
  ...(trimmed(row.mount) && { mount: trimmed(row.mount) }),
  ...(trimmed(row.filesystem) && { filesystem: trimmed(row.filesystem) }),
});

const additionalDiskOf = (row, { bhyve, vbox }) => {
  if (row.mode === 'existing') {
    return row.path ? withMount(withAddressing({ type: 'image', path: row.path }, row), row) : null;
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
  return withMount(withAddressing(base, row), row);
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

const vboxSectionOf = ({ vbox, hardwarePayload, zones, vboxJson, machineHypervisor }) => {
  const passthrough = parseVboxPassthrough(vboxJson);
  if (!vbox || machineHypervisor === 'utm') {
    return passthrough || {};
  }
  return {
    ...hardwarePayload,
    ...(zones.guest_agent === true && { guest_agent: true }),
    ...(passthrough || {}),
  };
};

const utmSectionOf = ({ machineHypervisor, zones }) =>
  machineHypervisor === 'utm' && zones.guest_agent === true ? { guest_agent: true } : {};

const tagsOf = tagsInput =>
  tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

const withoutBlank = map =>
  Object.fromEntries(
    Object.entries(map || {}).filter(([, value]) => value !== '' && value !== undefined)
  );

/**
 * The `roles` of the create spec, the editor's rows in their drawn
 * order, every role present with its `name`, its `enabled`, the
 * `collection` and `tags` the manifest declares where the row names
 * none, its `files` with the blank members dropped and its `vars`.
 *
 * @param {Array<Object>} rows - The editor's role rows
 * @param {Array<Object>} manifestRoles - The manifest's roles
 * @returns {Array<Object>} The roles on the wire
 */
export const roleRowsOf = (rows, manifestRoles) =>
  (Array.isArray(rows) ? rows : []).map(row => {
    const declared = manifestRoleOf(manifestRoles || [], row.name);
    const plain = stripTag(row);
    const files = withoutBlank(plain.files);
    const vars = withoutBlank(plain.vars);
    return {
      ...plain,
      enabled: plain.enabled !== false,
      ...(declared?.collection && !plain.collection && { collection: declared.collection }),
      ...(declared?.tags && !plain.tags && { tags: declared.tags }),
      files,
      vars,
    };
  });

/**
 * The body of `POST machines`, the create spec the Confirm step draws and
 * Create sends, exactly as hyperweaver-ui built it: the `name` where
 * given, the `hypervisor` where chosen, the `provisioner` while a family
 * is picked, the `settings` the wizard edited with the box fields on a
 * template boot alone, the `disks`, the `filesystems` and `zones` of a
 * bhyve host, the `vbox` section of a VirtualBox host, the `utm` section
 * of a machine on UTM, the guest agent switch riding each under
 * `guest_agent`, `cloud_init`,
 * `tags`, `notes`, `networks`, `roles` in their drawn order through
 * `roleRowsOf`, `properties` with the hidden fields pruned, `sync_method`,
 * `remove_transport_on_completion` where chosen, `wait_for` with
 * the task ids of the queued
 * downloads while any, `org_uuid` where chosen, `start_after_create` and
 * `provision_after_create`.
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
  const utmSection = utmSectionOf(form);
  const tags = tagsOf(form.tagsInput);
  const waitFor = waitForOf(form.downloads);
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
    ...(Object.keys(utmSection).length > 0 && { utm: utmSection }),
    ...(cloudInit && { cloud_init: cloudInit }),
    ...(tags.length > 0 && { tags }),
    ...(trimmed(form.notes) && { notes: trimmed(form.notes) }),
    networks: cleanNetworks(form.networks),
    roles: roleRowsOf(form.roles, form.manifestRoles),
    properties: form.properties,
    sync_method: form.syncMethod,
    ...(familyName &&
      form.removeTransport !== '' && {
        remove_transport_on_completion: form.removeTransport === 'true',
      }),
    ...(waitFor.length > 0 && { wait_for: waitFor }),
    ...(form.orgUuid && { org_uuid: form.orgUuid }),
    start_after_create: Boolean(form.startAfterCreate),
    provision_after_create: Boolean(form.provisionAfterCreate),
  };
};

/**
 * Why a step of the wizard cannot be left, the key of the sentence that
 * says so, empty for a step that can: the General step needs the
 * hostname and the domain; the OS & Disks step of a machine on UTM needs
 * a template boot with a box, its blank boot a size and its existing boot
 * a path; the System step's raw `vbox` text must be JSON; the
 * Provisioning step refuses a family without a version. The field DSL's
 * own check is the step's second gate.
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
    stepId === 'os-disks' &&
    form.machineHypervisor === 'utm' &&
    (bootSource !== 'template' || !settings.box)
  ) {
    return 'machineEdit.machineCreateModal.utmRequiresTemplateBox';
  }
  if (stepId === 'system' && trimmed(form.vboxJson) && !parseVboxPassthrough(form.vboxJson)) {
    return 'machineEdit.machineCreateModal.vboxJsonInvalid';
  }
  if (stepId === 'os-disks' && bootSource === 'scratch' && !diskConfig.bootSize) {
    return 'machineEdit.machineCreateModal.blankBootNeedsSize';
  }
  if (stepId === 'os-disks' && bootSource === 'existing' && !diskConfig.bootPath) {
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
 * precedes the build, how many downloads the build waits on, `waited_on`,
 * and, for a spec whose package rendered several hosts, every machine's
 * name in the order they are made.
 *
 * @param {Object|null} answer - The agent's answer
 * @param {string} fallback - The name the form derived
 * @returns {{ machineName: string, taskId: string, requiresDownload: boolean, waitedOn: number, names: Array<string> }} The reading
 */
export const createdOf = (answer, fallback) => {
  const data = answer || {};
  const waitedOn = Array.isArray(data.waited_on) ? data.waited_on.length : 0;
  if (data.multi_host && Array.isArray(data.machines)) {
    const names = data.machines.map(machine => machine.machine_name);
    return {
      machineName: names[0] || fallback,
      taskId: data.machines[0]?.parent_task_id || '',
      requiresDownload: false,
      waitedOn,
      names,
    };
  }
  return {
    machineName: data.machine_name || fallback,
    taskId: data.parent_task_id || data.task_id || '',
    requiresDownload: Boolean(data.requires_download),
    waitedOn,
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
 * The registry the Registry filter opens on: the one enabled registry
 * while exactly one is enabled, else the registry whose URL the box URL
 * starts with while a box URL is given, else the empty key, every
 * registry.
 *
 * @param {Array<Object>} sources - The sources of `GET templates/sources`
 * @param {string} boxUrl - The box's `box_url`
 * @returns {string} The registry's key, or the empty string
 */
export const sourceFilterDefaultOf = (sources, boxUrl) => {
  const enabled = (Array.isArray(sources) ? sources : []).filter(
    source => source && source.enabled !== false
  );
  if (enabled.length === 1) {
    return sourceKeyOf(enabled[0]);
  }
  const matched = boxUrl ? templateSourceFor(sources, boxUrl) : null;
  return matched ? sourceKeyOf(matched) : '';
};

/**
 * The image rows of the OS & Disks step, one merged list: every registry's
 * catalog rows, each keyed by its image and its registry, and the local
 * templates joined to their registry's row or standing alone as
 * local-only images, sorted by name, each row carrying the `disk_size`
 * its catalog row or a local template names.
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
      disk_size: entry.disk_size || '',
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
      disk_size: '',
      local: false,
    };
    if (template.version && !entry.versions.includes(template.version)) {
      entry.versions.push(template.version);
    }
    if (template.architecture && !entry.architectures.includes(template.architecture)) {
      entry.architectures.push(template.architecture);
    }
    if (template.disk_size && !entry.disk_size) {
      entry.disk_size = String(template.disk_size);
    }
    entry.local = true;
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => a.value.localeCompare(b.value));
};

/**
 * The disk size the picked box's template carries, the boot size input's
 * placeholder: the local template row of the box and its version, else
 * any local row of the box, else the box's merged row of `boxOptionsOf`;
 * empty while none names one.
 *
 * @param {Array<Object>} remoteBoxes - The catalog rows with their `source`
 * @param {Array<Object>} templates - The local template rows
 * @param {{ box: string, box_version: string }} settings - The box settings
 * @returns {string} The size, `64G` for one
 */
export const boxDiskSizeOf = (remoteBoxes, templates, settings) => {
  if (!settings?.box) {
    return '';
  }
  const own = templates.filter(row => `${row.organization}/${row.box_name}` === settings.box);
  const exact = own.find(row => settings.box_version && row.version === settings.box_version);
  const local = exact?.disk_size || own.find(row => row.disk_size)?.disk_size;
  if (local) {
    return String(local);
  }
  return (
    boxOptionsOf(remoteBoxes, templates).find(row => row.value === settings.box)?.disk_size || ''
  );
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
