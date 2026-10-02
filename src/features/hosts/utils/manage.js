import {
  FaArrowDown19,
  FaBox,
  FaBoxArchive,
  FaClock,
  FaCompactDisc,
  FaCubes,
  FaDatabase,
  FaDiagramProject,
  FaDownload,
  FaFileLines,
  FaFolder,
  FaGears,
  FaLayerGroup,
  FaListCheck,
  FaMemory,
  FaNetworkWired,
  FaPenToSquare,
  FaPowerOff,
  FaScroll,
  FaTriangleExclamation,
  FaUsers,
} from 'react-icons/fa6';

import { hostHasFeature, hostHasHypervisor } from './capabilities';

/**
 * The tokens of the Manage page's sections, hyperweaver-ui's
 * `MANAGE_FEATURES`: a host whose own row lists any of them offers the
 * page.
 */
export const MANAGE_TOKENS = [
  'services',
  'vnics',
  'packages',
  'boot-environments',
  'zfs',
  'time-sync',
  'processes',
  'fault-management',
  'file-browser',
  'system-users',
  'provisioner-registry',
  'templates',
  'machines',
  'provisioning',
];

/**
 * Whether a host's own row offers the Manage page, hyperweaver-ui's
 * `hasManageSurface` checked strictly: any token of its sections.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when a section's token is listed
 */
export const hostHasManage = server => MANAGE_TOKENS.some(token => hostHasFeature(server, token));

/**
 * The sections of the Manage page in hyperweaver-ui's order, each its
 * key, its glyph, the key of its heading, the keys of the two halves of
 * its sentence, and its gate: `feature`, every token of `features`, any
 * token of `featuresAny`, and `bhyveOnly` for the zone recipes; the
 * sections of the system group carry `own`, the rest wait on their
 * stage.
 */
export const MANAGE_SECTIONS = [
  {
    key: 'services',
    icon: FaGears,
    labelKey: 'pages.hostManage.tabServices',
    descKeys: ['pages.hostManage.descServicesPre', 'pages.hostManage.descServicesPost'],
    feature: 'services',
    own: true,
  },
  {
    key: 'network',
    icon: FaNetworkWired,
    labelKey: 'pages.hostManage.tabNetwork',
    descKeys: ['pages.hostManage.descNetworkPre', 'pages.hostManage.descNetworkPost'],
    featuresAny: ['vnics', 'hosts-file'],
  },
  {
    key: 'packages',
    icon: FaBox,
    labelKey: 'pages.hostManage.tabPackages',
    descKeys: ['pages.hostManage.descPackagesPre', 'pages.hostManage.descPackagesPost'],
    feature: 'packages',
    own: true,
  },
  {
    key: 'repositories',
    icon: FaDatabase,
    labelKey: 'host.packageManagement.repositories',
    descKeys: ['host.repositorySection.managePrefix', 'host.repositorySection.manageSuffix'],
    features: ['packages', 'repositories'],
    own: true,
  },
  {
    key: 'system-updates',
    icon: FaDownload,
    labelKey: 'host.systemUpdates.title',
    descKeys: [],
    feature: 'packages',
    own: true,
  },
  {
    key: 'boot-environments',
    icon: FaLayerGroup,
    labelKey: 'pages.hostManage.tabBootEnvironments',
    descKeys: [
      'pages.hostManage.descBootEnvironmentsPre',
      'pages.hostManage.descBootEnvironmentsPost',
    ],
    feature: 'boot-environments',
    own: true,
  },
  {
    key: 'storage',
    icon: FaDatabase,
    labelKey: 'pages.hostManage.tabStorage',
    descKeys: ['pages.hostManage.descStoragePre', 'pages.hostManage.descStoragePost'],
    feature: 'zfs',
  },
  {
    key: 'arc-configuration',
    icon: FaMemory,
    labelKey: 'hostCharts.arcConfiguration.configurationTitle',
    descKeys: ['hosts.manage.arc.descPre', 'hosts.manage.arc.descPost'],
    feature: 'zfs',
    own: true,
  },
  {
    key: 'artifacts',
    icon: FaCompactDisc,
    labelKey: 'hosts.manage.artifacts.title',
    descKeys: ['hosts.manage.artifacts.descPre', 'hosts.manage.artifacts.descPost'],
    feature: 'artifacts',
    own: true,
  },
  {
    key: 'time-ntp',
    icon: FaClock,
    labelKey: 'pages.hostManage.tabTime',
    descKeys: ['pages.hostManage.descTimeNtpPre', 'pages.hostManage.descTimeNtpPost'],
    feature: 'time-sync',
    own: true,
  },
  {
    key: 'processes',
    icon: FaListCheck,
    labelKey: 'pages.hostManage.tabProcesses',
    descKeys: ['pages.hostManage.descProcessesPre', 'pages.hostManage.descProcessesPost'],
    feature: 'processes',
    own: true,
  },
  {
    key: 'fault-management',
    icon: FaTriangleExclamation,
    labelKey: 'pages.hostManage.tabFaultManagement',
    descKeys: [
      'pages.hostManage.descFaultManagementPre',
      'pages.hostManage.descFaultManagementPost',
    ],
    feature: 'fault-management',
    own: true,
  },
  {
    key: 'system-logs',
    icon: FaFileLines,
    labelKey: 'host.faultManagement.tabSystemLogs',
    descKeys: ['host.faultManagement.logsDescBefore', 'host.faultManagement.logsDescAfter'],
    features: ['fault-management', 'log-streaming'],
    own: true,
  },
  {
    key: 'syslog',
    icon: FaPenToSquare,
    labelKey: 'host.faultManagement.tabSyslogConfig',
    descKeys: ['host.faultManagement.syslogDescBefore', 'host.faultManagement.syslogDescAfter'],
    features: ['fault-management', 'syslog'],
    own: true,
  },
  {
    key: 'file-manager',
    icon: FaFolder,
    labelKey: 'pages.hostManage.tabFileManager',
    descKeys: ['pages.hostManage.descFileManagerPre', 'pages.hostManage.descFileManagerPost'],
    feature: 'file-browser',
    own: true,
  },
  {
    key: 'user-group',
    icon: FaUsers,
    labelKey: 'pages.hostManage.tabUserGroups',
    descKeys: ['pages.hostManage.descUserGroupPre', 'pages.hostManage.descUserGroupPost'],
    feature: 'system-users',
    own: true,
  },
  {
    key: 'provisioning',
    icon: FaCubes,
    labelKey: 'pages.hostManage.tabProvisioners',
    descKeys: ['pages.hostManage.descProvisioningPre', 'pages.hostManage.descProvisioningPost'],
    feature: 'provisioner-registry',
    own: true,
  },
  {
    key: 'provisioning-network',
    icon: FaDiagramProject,
    labelKey: 'pages.hostManage.tabProvisioningNetwork',
    descKeys: [],
    feature: 'provisioning',
    own: true,
  },
  {
    key: 'recipes',
    icon: FaScroll,
    labelKey: 'pages.hostManage.tabRecipes',
    descKeys: [],
    feature: 'provisioning',
    bhyveOnly: true,
    own: true,
  },
  {
    key: 'templates',
    icon: FaCompactDisc,
    labelKey: 'pages.hostManage.tabTemplates',
    descKeys: ['pages.hostManage.descTemplatesPre', 'pages.hostManage.descTemplatesPost'],
    feature: 'templates',
    own: true,
  },
  {
    key: 'orchestration',
    icon: FaArrowDown19,
    labelKey: 'pages.hostManage.tabOrchestration',
    descKeys: ['pages.hostManage.descOrchestrationPre', 'pages.hostManage.descOrchestrationPost'],
    feature: 'machines',
    own: true,
  },
  {
    key: 'runlevel',
    icon: FaPowerOff,
    labelKey: 'hosts.manage.runlevel.title',
    descKeys: [],
    feature: 'host-power',
    own: true,
  },
  {
    key: 'installer-files',
    icon: FaBoxArchive,
    labelKey: 'pages.hostManage.tabInstallerFiles',
    descKeys: ['pages.hostManage.descInstallerFilesPre', 'pages.hostManage.descInstallerFilesPost'],
    features: ['artifacts', 'provisioner-registry'],
    own: true,
  },
  {
    key: 'database',
    icon: FaDatabase,
    labelKey: 'pages.hostManage.tabDatabase',
    descKeys: ['pages.hostManage.descDatabasePre', 'pages.hostManage.descDatabasePost'],
    own: true,
  },
];

/**
 * Whether a host's own row offers one section of the Manage page,
 * hyperweaver-ui's tab filter checked strictly: a `bhyveOnly` section
 * on a host that names `bhyve` alone, a `featuresAny` section while any
 * of its tokens is listed, and otherwise every token of `features` or
 * the one `feature`; a section that names no token is offered on every
 * host.
 *
 * @param {Object} section - An entry of `MANAGE_SECTIONS`
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when the section draws
 */
export const sectionOffered = (section, server) => {
  if (section.bhyveOnly && !hostHasHypervisor(server, 'bhyve')) {
    return false;
  }
  if (section.featuresAny) {
    return section.featuresAny.some(token => hostHasFeature(server, token));
  }
  const required = section.features || (section.feature ? [section.feature] : []);
  return required.every(token => hostHasFeature(server, token));
};

/**
 * The sections of the Manage page one host offers, in the page's order.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Array<Object>} The offered entries of `MANAGE_SECTIONS`
 */
export const offeredSections = server =>
  MANAGE_SECTIONS.filter(section => sectionOffered(section, server));

const lower = value => String(value ?? '').toLowerCase();

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

const SERVICE_TONES = {
  online: 'success',
  disabled: 'secondary',
  offline: 'danger',
  legacy_run: 'info',
  maintenance: 'warning',
};

/**
 * The name of a service from its FMRI, the last segment of an `svc:/`
 * or `lrc:/` FMRI and the FMRI itself otherwise.
 *
 * @param {string} fmri - The service's FMRI
 * @returns {string} The name
 */
export const serviceName = fmri => {
  const text = String(fmri || '');
  if (text.startsWith('svc:/') || text.startsWith('lrc:/')) {
    const parts = text.split('/');
    return parts[parts.length - 1] || text;
  }
  return text;
};

/**
 * Whether a service is a legacy run script, an `lrc:` FMRI, which has no
 * properties to read.
 *
 * @param {string} fmri - The service's FMRI
 * @returns {boolean} True for a legacy service
 */
export const isLegacyService = fmri => String(fmri || '').startsWith('lrc:');

/**
 * The tone a service state draws in, hyperweaver-ui's: success online,
 * secondary disabled, danger offline, info for a legacy run and warning
 * in maintenance.
 *
 * @param {string} state - The service's state
 * @returns {string} The Bootstrap tone
 */
export const serviceTone = state => SERVICE_TONES[lower(state)] || 'secondary';

/**
 * The actions a service's row offers by its state, hyperweaver-ui's:
 * Enable while disabled, Disable and Restart while online, and Refresh
 * for every state but a legacy run.
 *
 * @param {string} state - The service's state
 * @returns {Array<string>} The action words
 */
export const serviceActions = state => {
  const word = lower(state);
  const actions = [];
  if (word === 'disabled') {
    actions.push('enable');
  } else if (word === 'online') {
    actions.push('disable', 'restart');
  }
  if (word !== 'legacy_run') {
    actions.push('refresh');
  }
  return actions;
};

export const matchesService = matcher(row => [row.fmri, serviceName(row.fmri), row.state]);

const MEMORY_PATTERN = /^(?<value>\d+(?:\.\d+)?)(?<unit>[KMGT])?$/u;

const MEMORY_UNITS = { K: 1 / 1024, M: 1, G: 1024, T: 1024 * 1024 };

/**
 * A process's resident size in megabytes, hyperweaver-ui's parse of the
 * agent's `rss`, a number with a K, M, G or T suffix or a plain byte
 * count.
 *
 * @param {string|number} memory - The `rss` of a process row
 * @returns {number} The megabytes, zero for a value that is no size
 */
export const parseMemorySize = memory => {
  if (memory === null || memory === undefined || memory === '') {
    return 0;
  }
  const match = MEMORY_PATTERN.exec(String(memory));
  if (!match) {
    const bytes = parseFloat(String(memory));
    return Number.isNaN(bytes) ? 0 : bytes / 1024 / 1024;
  }
  const value = parseFloat(match.groups.value);
  const unit = match.groups.unit || '';
  return unit ? value * MEMORY_UNITS[unit] : value / 1024 / 1024;
};

/**
 * A process's processor share as a percentage with one decimal, empty
 * for a row that carries none.
 *
 * @param {number|string|null} percent - The `cpu_percent` of a process row
 * @returns {string} The text
 */
export const formatCpu = percent =>
  percent === null || percent === undefined ? '' : `${parseFloat(percent).toFixed(1)}%`;

const COMMAND_LENGTH = 50;

/**
 * A command line cut to hyperweaver-ui's fifty characters with an
 * ellipsis, the whole line the cell's tooltip.
 *
 * @param {string} command - The command line
 * @returns {string} The text
 */
export const truncateCommand = command => {
  const text = String(command || '');
  return text.length <= COMMAND_LENGTH ? text : `${text.substring(0, COMMAND_LENGTH)}...`;
};

export const matchesProcess = matcher(row => [row.pid, row.username, row.zone, row.command]);

export const ALL_SIGNALS = ['TERM', 'KILL', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2', 'STOP', 'CONT'];

export const BATCH_SIGNALS = ['TERM', 'KILL', 'HUP', 'INT', 'QUIT'];

const LIMITED_SIGNALS = ['TERM', 'KILL'];

/**
 * The signals a host delivers, hyperweaver-ui's rule: TERM and KILL
 * alone on a Windows host, whose process library delivers no other, and
 * the given list elsewhere.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {Array<string>} signals - The full list
 * @returns {Array<string>} The signals offered
 */
export const signalsFor = (server, signals) =>
  server?.capabilities?.platform === 'windows'
    ? signals.filter(signal => LIMITED_SIGNALS.includes(signal))
    : signals;

const SYSTEM_ID = 100;

/**
 * Whether an account is a system one, hyperweaver-ui's rule: a uid under
 * a hundred whose comment does not say User.
 *
 * @param {Object} user - The user row
 * @returns {boolean} True for a system user
 */
export const isSystemUser = user =>
  Number(user?.uid) < SYSTEM_ID && !String(user?.comment || '').includes('User');

/**
 * Whether an account's uid is below a hundred, the accounts hyperweaver-ui
 * offers no lock and no delete of.
 *
 * @param {Object} user - The user row
 * @returns {boolean} True for a low uid
 */
export const isLowUid = user => Number(user?.uid) < SYSTEM_ID;

/**
 * Whether a group is a system one, a gid under a hundred.
 *
 * @param {Object} group - The group row
 * @returns {boolean} True for a system group
 */
export const isSystemGroup = group => Number(group?.gid) < SYSTEM_ID;

/**
 * The last segment of a shell's path, the shell itself without a slash.
 *
 * @param {string} shell - The shell's path
 * @returns {string} The name, empty for none
 */
export const shellName = shell => {
  const text = String(shell || '');
  if (!text) {
    return '';
  }
  const parts = text.split('/');
  return parts[parts.length - 1] || text;
};

const HOME_LENGTH = 25;

const HOME_TAIL = 22;

/**
 * A home directory cut from the front to hyperweaver-ui's length.
 *
 * @param {string} home - The directory
 * @returns {string} The text, empty for none
 */
export const shortHome = home => {
  const text = String(home || '');
  return text.length > HOME_LENGTH ? `...${text.slice(-HOME_TAIL)}` : text;
};

export const matchesUser = matcher(row => [row.username, row.uid, row.gid, row.comment, row.home]);

export const matchesGroup = matcher(row => [row.groupname, row.gid, ...(row.members || [])]);

export const matchesRole = matcher(row => [
  row.rolename,
  row.comment,
  row.shell,
  ...(row.authorizations || []),
  ...(row.profiles || []),
]);

export const matchesRbac = matcher(row => [
  row.name,
  row.description,
  row.short_description,
  row.long_description,
]);

/**
 * The items of a comma-separated field, each trimmed, the empty ones
 * dropped.
 *
 * @param {string} text - The field's text
 * @returns {Array<string>} The items
 */
export const splitList = text =>
  String(text || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export const USER_SHELLS = [
  '/bin/bash',
  '/bin/sh',
  '/bin/zsh',
  '/bin/ksh',
  '/bin/tcsh',
  '/bin/false',
];

export const ROLE_SHELLS = ['/bin/pfsh', '/bin/bash', '/bin/sh', '/bin/zsh', '/bin/ksh'];

export const USER_FORM = {
  username: '',
  uid: '',
  comment: '',
  shell: '/bin/bash',
  groups: '',
  authorizations: '',
  profiles: '',
  roles: '',
  project: '',
  createHome: true,
  forceZfs: false,
  createPersonalGroup: true,
};

const listMember = (member, text) => {
  const items = splitList(text);
  return items.length > 0 ? { [member]: items } : {};
};

/**
 * The body of `POST system/users` hyperweaver-ui's create form sends: the
 * username, the comment where given, the shell, the two switches, and in
 * advanced mode the uid, the groups, the authorizations, the profiles,
 * the roles, the project and the ZFS home, each only where given.
 *
 * @param {Object} form - The form, the shape of `USER_FORM`
 * @param {boolean} advanced - Whether the advanced mode is on
 * @returns {Object} The body
 */
export const userCreateBody = (form, advanced) => {
  const comment = form.comment.trim();
  const body = {
    username: form.username.trim(),
    ...(comment ? { comment } : {}),
    shell: form.shell || '/bin/bash',
    create_home: form.createHome,
    create_personal_group: form.createPersonalGroup,
  };
  if (!advanced) {
    return body;
  }
  const project = form.project.trim();
  return {
    ...body,
    ...(form.uid ? { uid: Number.parseInt(form.uid, 10) } : {}),
    ...listMember('groups', form.groups),
    ...listMember('authorizations', form.authorizations),
    ...listMember('profiles', form.profiles),
    ...listMember('roles', form.roles),
    ...(project ? { project } : {}),
    ...(form.forceZfs ? { force_zfs: true } : {}),
  };
};

/**
 * The body of `PUT system/users/{name}` hyperweaver-ui's edit form sends,
 * the members that changed alone: the comment and the shell while they
 * differ from the user's row, and the groups, the authorizations and the
 * profiles while they hold a value; null while nothing changed.
 *
 * @param {Object} form - `{ comment, shell, groups, authorizations, profiles }`, the lists as text
 * @param {Object} user - The user row
 * @returns {Object|null} The body, or null
 */
export const userEditBody = (form, user) => {
  const comment = form.comment.trim();
  const body = {
    ...(form.comment !== (user.comment || '') ? { new_comment: comment || undefined } : {}),
    ...(form.shell !== (user.shell || '/bin/bash') ? { new_shell: form.shell } : {}),
    ...listMember('new_groups', form.groups),
    ...listMember('new_authorizations', form.authorizations),
    ...listMember('new_profiles', form.profiles),
  };
  return Object.keys(body).length > 0 ? body : null;
};

/**
 * The body of `POST system/groups`: the name and the gid where given.
 *
 * @param {Object} form - `{ groupname, gid }`
 * @returns {Object} The body
 */
export const groupCreateBody = form => ({
  groupname: form.groupname.trim(),
  ...(form.gid ? { gid: Number.parseInt(form.gid, 10) } : {}),
});

export const ROLE_FORM = {
  rolename: '',
  comment: '',
  shell: '/bin/pfsh',
  authorizations: '',
  profiles: '',
  createHome: false,
};

/**
 * The body of `POST system/roles`: the name, the comment or
 * hyperweaver-ui's default, the shell, the home switch, and the
 * authorizations and the profiles while they hold a value.
 *
 * @param {Object} form - The form, the shape of `ROLE_FORM`
 * @returns {Object} The body
 */
export const roleCreateBody = form => ({
  rolename: form.rolename.trim(),
  comment: form.comment.trim() || 'RBAC Role',
  shell: form.shell || '/bin/pfsh',
  create_home: form.createHome,
  ...listMember('authorizations', form.authorizations),
  ...listMember('profiles', form.profiles),
});

const PASSWORD_LENGTH = 8;

/**
 * Why a password form cannot be sent, the key of the sentence, empty
 * for a form that can: a password is required, the two must match and
 * eight characters is the least.
 *
 * @param {Object} form - `{ password, confirmPassword }`
 * @returns {string} The locale key, or the empty string
 */
export const passwordProblem = form => {
  if (!form.password) {
    return 'host.setPasswordModal.passwordRequired';
  }
  if (form.password !== form.confirmPassword) {
    return 'host.setPasswordModal.passwordMismatch';
  }
  return form.password.length < PASSWORD_LENGTH ? 'host.setPasswordModal.passwordTooShort' : '';
};

/**
 * The body of `POST system/users/{name}/password`.
 *
 * @param {Object} form - `{ password, forceChange, unlockAccount }`
 * @returns {Object} The body
 */
export const passwordBody = form => ({
  password: form.password,
  force_change: Boolean(form.forceChange),
  unlock_account: Boolean(form.unlockAccount),
});

const TIMEZONE_REGIONS = {
  America: 'america',
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  Australia: 'australia',
  Pacific: 'pacific',
  Atlantic: 'atlantic',
  Indian: 'indian',
  Antarctica: 'antarctica',
  UTC: 'utc',
};

/**
 * The regions the time zones fall under, the part before the slash of
 * every zone that has one, sorted.
 *
 * @param {Array<string>} timezones - The zones the agent answered
 * @returns {Array<string>} The regions
 */
export const timezoneRegions = timezones =>
  [...new Set(timezones.filter(zone => zone.includes('/')).map(zone => zone.split('/')[0]))].sort();

/**
 * A time zone as hyperweaver-ui draws it, the region, an arrow and the
 * rest.
 *
 * @param {string} timezone - The zone
 * @returns {string} The text, empty for none
 */
export const formatTimezone = timezone => {
  if (!timezone) {
    return '';
  }
  const parts = timezone.split('/');
  return parts.length === 1 ? timezone : `${parts[0]} → ${parts.slice(1).join(' / ')}`;
};

/**
 * The key of a region's description, hyperweaver-ui's ten sentences,
 * empty for a region it has none for.
 *
 * @param {string} timezone - The zone, or a region and a slash
 * @returns {string} The locale key, or the empty string
 */
export const timezoneDescriptionKey = timezone => {
  const [region] = String(timezone || '').split('/');
  return TIMEZONE_REGIONS[region]
    ? `host.timezoneSettings.regions.${TIMEZONE_REGIONS[region]}`
    : '';
};

/**
 * The zones a region and a search leave, sorted.
 *
 * @param {Array<string>} timezones - The zones the agent answered
 * @param {string} region - The region chosen, empty for all
 * @param {string} search - The search typed
 * @returns {Array<string>} The zones
 */
export const filterTimezones = (timezones, region, search) => {
  const needle = search.toLowerCase();
  return timezones
    .filter(zone => !region || zone.startsWith(region))
    .filter(zone => !needle || zone.toLowerCase().includes(needle))
    .sort();
};

const isServerLine = line => {
  const trimmed = line.trim();
  return trimmed.startsWith('server ') || trimmed.startsWith('pool ');
};

/**
 * The servers a time-sync configuration names, the second word of every
 * `server` and `pool` line.
 *
 * @param {string} config - The configuration text
 * @returns {Array<string>} The servers
 */
export const configServers = config =>
  String(config || '')
    .split('\n')
    .filter(isServerLine)
    .map(line => line.trim().split(/\s+/u)[1] || '')
    .filter(Boolean);

/**
 * Whether a time-sync configuration can be saved, hyperweaver-ui's rule:
 * not empty and at least one `server` or `pool` line.
 *
 * @param {string} config - The configuration text
 * @returns {boolean} True when it can
 */
export const isConfigValid = config =>
  String(config || '').trim() !== '' && String(config).split('\n').some(isServerLine);

/**
 * A time-sync configuration with one server line added at its end.
 *
 * @param {string} config - The configuration text
 * @param {string} server - The server to add
 * @returns {string} The configuration
 */
export const withServer = (config, server) => `${config}\nserver ${server.trim()}`;

/**
 * A time-sync configuration without the `server` and `pool` lines that
 * name one server.
 *
 * @param {string} config - The configuration text
 * @param {string} server - The server to drop
 * @returns {string} The configuration
 */
export const withoutServer = (config, server) =>
  String(config || '')
    .split('\n')
    .filter(line => !(isServerLine(line) && line.trim().includes(server)))
    .join('\n');

const PEER_INDICATORS = {
  '*': { glyph: '⭐', key: 'statusPrimary', tone: 'text-success' },
  '+': { glyph: '✅', key: 'statusBackup', tone: 'text-info' },
  '-': { glyph: '❌', key: 'statusRejected', tone: 'text-danger' },
  x: { glyph: '⚠️', key: 'statusFalseTicker', tone: 'text-warning' },
  '.': { glyph: '⚪', key: 'statusExcess', tone: 'text-muted' },
  ' ': { glyph: '⚠️', key: 'statusCandidate', tone: 'text-warning' },
};

const UNKNOWN_PEER = { glyph: '❓', key: 'statusUnknown', tone: 'text-muted' };

/**
 * How a peer's indicator draws, hyperweaver-ui's: its glyph, the key of
 * its description under `hostTime.timeSyncPeerTable` and its tone.
 *
 * @param {string} indicator - The peer's `indicator`
 * @returns {{ glyph: string, key: string, tone: string }} The look
 */
export const peerIndicator = indicator => PEER_INDICATORS[indicator] || UNKNOWN_PEER;

/**
 * A number of milliseconds with one decimal, signed where asked, empty
 * for a value that is no number.
 *
 * @param {*} value - The milliseconds
 * @param {boolean} [signed] - Whether a positive value carries a plus
 * @returns {string} The text
 */
export const formatMs = (value, signed = false) => {
  if (typeof value !== 'number') {
    return '';
  }
  return `${signed && value >= 0 ? '+' : ''}${value.toFixed(1)}ms`;
};

/**
 * The tone a peer's value draws in against two thresholds: success up to
 * the good one, warning up to the other and danger past it.
 *
 * @param {*} value - The value
 * @param {{ good: number, warning: number }} thresholds - The thresholds
 * @returns {string} The text class, empty for no number
 */
export const healthTone = (value, thresholds) => {
  if (typeof value !== 'number') {
    return '';
  }
  if (value <= thresholds.good) {
    return 'text-success';
  }
  return value <= thresholds.warning ? 'text-warning' : 'text-danger';
};

export const PEER_THRESHOLDS = {
  delay: { good: 50, warning: 200 },
  offset: { good: 10, warning: 100 },
  jitter: { good: 10, warning: 50 },
  reach: { good: 10, warning: 50 },
};

export const matchesPeer = matcher(row => [row.remote, row.name, row.status, row.stratum]);

const DISK_SPACE =
  /Insufficient disk space.*Available space: (?<available>[\d.]+\s+\w+).*Estimated required: (?<required>[\d.]+\s+\w+)/u;

/**
 * What the update check's raw output says of the disk, hyperweaver-ui's
 * parse: the space available and the space required, or null while the
 * output says nothing of it.
 *
 * @param {string} output - The `raw_output` of the update check
 * @returns {{ available: string, required: string }|null} The warning
 */
export const diskSpaceWarning = output => {
  const match = DISK_SPACE.exec(String(output || ''));
  return match ? { available: match.groups.available, required: match.groups.required } : null;
};

export const matchesHistory = matcher(row => [row.date, row.operation, row.user, row.status]);

export const STRATEGIES = ['parallel_by_priority', 'sequential', 'staggered'];

const PRIORITY_TOP = 100;

const PRIORITY_STEP = 5;

/**
 * The boot priority of the machine at one position of the order,
 * hyperweaver-ui's spacing: the top a hundred, five apart, one the
 * floor.
 *
 * @param {number} index - The position, zero first
 * @returns {number} The priority
 */
export const priorityForIndex = index => Math.max(1, PRIORITY_TOP - index * PRIORITY_STEP);

/**
 * The boot order the priorities answer, the highest priority first.
 *
 * @param {Object|null} priorities - The answer of `GET machines/priorities`
 * @returns {Array<string>} The machine names
 */
export const orderOf = priorities =>
  [...(priorities?.machines || [])]
    .sort((first, second) => second.priority - first.priority)
    .map(machine => machine.name);

const rowOf = (priorities, name) =>
  (priorities?.machines || []).find(machine => machine.name === name) || null;

/**
 * The priorities the order would write, one a machine whose number the
 * order changes.
 *
 * @param {Array<string>} order - The machine names, first boots first
 * @param {Object|null} priorities - The answer of `GET machines/priorities`
 * @returns {Array<{ name: string, priority: number }>} The changes
 */
export const priorityChanges = (order, priorities) =>
  order
    .map((name, index) => ({ name, priority: priorityForIndex(index) }))
    .filter(change => {
      const row = rowOf(priorities, change.name);
      return row && row.priority !== change.priority;
    });

/**
 * Whether the order differs from the priorities the agent holds.
 *
 * @param {Array<string>} order - The machine names
 * @param {Object|null} priorities - The answer of `GET machines/priorities`
 * @returns {boolean} True while a write would change a priority
 */
export const orderDiffers = (order, priorities) => priorityChanges(order, priorities).length > 0;

/**
 * The order with the dragged machine moved to the position of the one it
 * hovers.
 *
 * @param {Array<string>} order - The machine names
 * @param {string} dragged - The machine being dragged
 * @param {string} over - The machine it hovers
 * @returns {Array<string>} The next order
 */
export const movedOrder = (order, dragged, over) => {
  if (!dragged || dragged === over || !order.includes(over)) {
    return order;
  }
  const next = order.filter(entry => entry !== dragged);
  next.splice(next.indexOf(over), 0, dragged);
  return next;
};

/**
 * Whether a typed boot priority is one hyperweaver-ui sends, a whole
 * number from one to a hundred.
 *
 * @param {*} value - The typed value
 * @returns {boolean} True when it can be sent
 */
export const validPriority = value => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= PRIORITY_TOP;
};

/**
 * The merge patch of `PUT config/machines` that sets the orchestration
 * strategy, the one leaf `/machines/orchestration/strategy`.
 *
 * @param {string} strategy - The strategy
 * @returns {Object} The patch
 */
export const strategyPatch = strategy => ({ machines: { orchestration: { strategy } } });

/**
 * The runlevels a host offers, as `GET system/host/runlevel` answers
 * them, the current one first among them.
 *
 * @param {Object|null} answer - The answer
 * @returns {{ current: string, available: Array<string> }} The runlevels
 */
export const runlevelsOf = answer => {
  const current = String(answer?.current_runlevel ?? answer?.runlevel ?? '');
  const listed = Array.isArray(answer?.available_runlevels) ? answer.available_runlevels : [];
  const available = [...new Set(listed.map(String))];
  return { current, available };
};

/**
 * The tables of the Manage page's one search binding, each its key and
 * the key of its label, in the page's order.
 */
export const MANAGE_TABLES = [
  { key: 'services', labelKey: 'pages.hostManage.tabServices' },
  { key: 'processes', labelKey: 'pages.hostManage.tabProcesses' },
  { key: 'users', labelKey: 'host.userGroupManagement.users' },
  { key: 'groups', labelKey: 'host.userGroupManagement.groups' },
  { key: 'roles', labelKey: 'host.userGroupManagement.roles' },
  { key: 'authorizations', labelKey: 'hostTools.DiscoverySection.tabAuthorizationsLabel' },
  { key: 'profiles', labelKey: 'hostTools.DiscoverySection.tabProfilesLabel' },
  { key: 'rbac-roles', labelKey: 'hostTools.DiscoverySection.tabRolesLabel' },
  { key: 'peers', labelKey: 'hostTime.timeSyncPeerTable.columnServer' },
  { key: 'history', labelKey: 'host.systemUpdates.historyTitle' },
  { key: 'storage-paths', labelKey: 'artifacts.artifactManagement.storageLocationsTab' },
  { key: 'artifacts', labelKey: 'artifacts.artifactManagement.artifactsTab' },
  { key: 'syslog-rules', labelKey: 'hostTime.syslogCurrentRules.heading' },
  { key: 'log-files', labelKey: 'host.logFileExplorer.logFiles' },
  { key: 'boot-environments', labelKey: 'pages.hostManage.tabBootEnvironments' },
  { key: 'faults', labelKey: 'host.faultManagement.tabCurrentFaults' },
  { key: 'fault-modules', labelKey: 'host.faultManagerConfig.faultManagementModules' },
  { key: 'databases', labelKey: 'pages.hostManage.tabDatabase' },
  { key: 'repositories', labelKey: 'host.packageManagement.repositories' },
  { key: 'packages', labelKey: 'pages.hostManage.tabPackages' },
  { key: 'installers', labelKey: 'pages.hostManage.tabInstallerFiles' },
  { key: 'recipes', labelKey: 'pages.hostManage.tabRecipes' },
  { key: 'templates', labelKey: 'pages.hostManage.tabTemplates' },
  { key: 'provisioners', labelKey: 'pages.hostManage.tabProvisioners' },
];
