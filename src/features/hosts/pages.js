import {
  FaArrowDown19,
  FaBox,
  FaBoxArchive,
  FaBoxesStacked,
  FaCamera,
  FaCircleUp,
  FaClock,
  FaCompactDisc,
  FaCubes,
  FaDatabase,
  FaDesktop,
  FaDiagramProject,
  FaDownload,
  FaEthernet,
  FaFileLines,
  FaFloppyDisk,
  FaFolder,
  FaGauge,
  FaGears,
  FaGlobe,
  FaHardDrive,
  FaIdBadge,
  FaKey,
  FaLayerGroup,
  FaLink,
  FaListCheck,
  FaMemory,
  FaNetworkWired,
  FaPowerOff,
  FaPuzzlePiece,
  FaRobot,
  FaScroll,
  FaServer,
  FaSliders,
  FaTriangleExclamation,
  FaUsb,
  FaUsers,
} from 'react-icons/fa6';

import { hasFeatureStrict } from '../../utils/capabilities';
import { arrivalPath } from '../../utils/searchRow';

import { MACHINE_PAGES } from './machinePages';
import { hostHasSettings } from './utils/agentSettings';
import { hostHasFeature } from './utils/capabilities';
import { configNamesOf } from './utils/configNodes';
import { machineNoun } from './utils/hosts';
import { machineRoute, nounKeyOf } from './utils/machines';
import { MANAGE_SECTIONS, sectionOffered as manageSectionOffered } from './utils/manage';

const gate = (tokens, offered) => ({ tokens, offered });

const always = gate([], () => true);

const key = labelKey => () => labelKey;

const feature = token => gate([token], server => hostHasFeature(server, token));

const anyFeature = tokens =>
  gate(tokens, server => tokens.some(token => hostHasFeature(server, token)));

const sectionEntry = sectionKey =>
  MANAGE_SECTIONS.find(candidate => candidate.key === sectionKey) || null;

const requiredOf = entry => entry.features || (entry.feature ? [entry.feature] : []);

const section = sectionKey => {
  const entry = sectionEntry(sectionKey);
  return gate(
    entry ? requiredOf(entry) : [],
    server => Boolean(entry) && manageSectionOffered(entry, server)
  );
};

const anySection = sectionKeys => {
  const gates = sectionKeys.map(section);
  return gate([...new Set(gates.flatMap(entry => entry.tokens))], server =>
    gates.some(entry => entry.offered(server))
  );
};

const settings = gate(['hypervisors'], hostHasSettings);

const configPages = server =>
  configNamesOf(server).map(name => ({
    key: `config:${name}`,
    segment: `agent/config/${encodeURIComponent(name)}`,
    icon: FaSliders,
    label: name,
    ...always,
  }));

/**
 * The pages of a host, in groups of `{ key, labelKey(server), icon, flat?,
 * pages }`, a page `{ key, segment, icon, labelKey(server) | label,
 * offered(server), tokens }`, `segment` its route under `/hosts/{id}`.
 */
export const HOST_PAGES = [
  {
    key: 'overview',
    labelKey: key('navbar.contextTabs.overview'),
    icon: FaGauge,
    flat: true,
    pages: [
      {
        key: 'overview',
        segment: '',
        icon: FaGauge,
        labelKey: key('navbar.contextTabs.overview'),
        ...always,
      },
    ],
  },
  {
    key: 'machines',
    labelKey: server => `hosts.machines.title.${machineNoun(server ? [server] : [])}`,
    icon: FaDesktop,
    flat: true,
    pages: [
      {
        key: 'machines',
        segment: 'machines',
        icon: FaDesktop,
        labelKey: server => `hosts.machines.title.${machineNoun(server ? [server] : [])}`,
        ...feature('machines'),
      },
    ],
  },
  {
    key: 'network',
    labelKey: key('hosts.nav.network'),
    icon: FaNetworkWired,
    pages: [
      {
        key: 'interfaces',
        segment: 'network/interfaces',
        icon: FaEthernet,
        labelKey: key('hosts.overview.interfaces'),
        ...anyFeature(['monitoring', 'ip-addresses', 'vnics', 'network-spaces']),
      },
      {
        key: 'links',
        segment: 'network/links',
        icon: FaLink,
        labelKey: key('hosts.nav.links'),
        ...feature('vnics'),
      },
      {
        key: 'spaces',
        segment: 'network/spaces',
        icon: FaDiagramProject,
        labelKey: key('hosts.nav.spaces'),
        ...feature('network-spaces'),
      },
      {
        key: 'hostname',
        segment: 'network/hostname',
        icon: FaGlobe,
        labelKey: key('hosts.nav.hostnameDns'),
        ...anyFeature(['hostname', 'dns', 'hosts-file', 'vnics']),
      },
    ],
  },
  {
    key: 'storage',
    labelKey: key('navbar.contextTabs.storage'),
    icon: FaHardDrive,
    pages: [
      {
        key: 'pools',
        segment: 'storage/pools',
        icon: FaDatabase,
        labelKey: key('hosts.nav.pools'),
        ...feature('zfs'),
      },
      {
        key: 'snapshots',
        segment: 'storage/snapshots',
        icon: FaCamera,
        labelKey: key('navbar.contextTabs.snapshots'),
        ...feature('zfs'),
      },
      {
        key: 'arc',
        segment: 'storage/arc',
        icon: FaMemory,
        labelKey: key('hosts.nav.arc'),
        ...section('arc-configuration'),
      },
      {
        key: 'disks',
        segment: 'storage/disks',
        icon: FaFloppyDisk,
        labelKey: key('hosts.nav.disks'),
        ...feature('zfs'),
      },
      {
        key: 'boot-environments',
        segment: 'storage/boot-environments',
        icon: FaLayerGroup,
        labelKey: key('pages.hostManage.tabBootEnvironments'),
        ...section('boot-environments'),
      },
    ],
  },
  {
    key: 'devices',
    labelKey: key('navbar.contextTabs.devices'),
    icon: FaUsb,
    pages: [
      {
        key: 'devices',
        segment: 'devices',
        icon: FaUsb,
        labelKey: key('navbar.contextTabs.devices'),
        ...feature('devices'),
      },
    ],
  },
  {
    key: 'system',
    labelKey: key('hosts.nav.system'),
    icon: FaGears,
    pages: [
      {
        key: 'services',
        segment: 'system/services',
        icon: FaGears,
        labelKey: key('pages.hostManage.tabServices'),
        ...section('services'),
      },
      {
        key: 'processes',
        segment: 'system/processes',
        icon: FaListCheck,
        labelKey: key('pages.hostManage.tabProcesses'),
        ...section('processes'),
      },
      {
        key: 'users',
        segment: 'system/users',
        icon: FaUsers,
        labelKey: key('pages.hostManage.tabUserGroups'),
        ...section('user-group'),
      },
      {
        key: 'time',
        segment: 'system/time',
        icon: FaClock,
        labelKey: key('pages.hostManage.tabTime'),
        ...section('time-ntp'),
      },
      {
        key: 'runlevel',
        segment: 'system/runlevel',
        icon: FaPowerOff,
        labelKey: key('hosts.manage.runlevel.title'),
        ...feature('runlevel'),
      },
      {
        key: 'logs',
        segment: 'system/logs',
        icon: FaFileLines,
        labelKey: key('hosts.nav.logs'),
        ...anySection(['system-logs', 'syslog']),
      },
      {
        key: 'faults',
        segment: 'system/faults',
        icon: FaTriangleExclamation,
        labelKey: key('pages.hostManage.tabFaultManagement'),
        ...section('fault-management'),
      },
    ],
  },
  {
    key: 'updates',
    labelKey: key('hosts.nav.updates'),
    icon: FaDownload,
    pages: [
      {
        key: 'packages',
        segment: 'updates/packages',
        icon: FaBox,
        labelKey: key('pages.hostManage.tabPackages'),
        ...section('packages'),
      },
      {
        key: 'system-updates',
        segment: 'updates/system',
        icon: FaCircleUp,
        labelKey: key('host.systemUpdates.title'),
        ...section('system-updates'),
      },
      {
        key: 'repositories',
        segment: 'updates/repositories',
        icon: FaBoxesStacked,
        labelKey: key('host.packageManagement.repositories'),
        ...section('repositories'),
      },
    ],
  },
  {
    key: 'provisioning',
    labelKey: key('navbar.contextTabs.provisioning'),
    icon: FaCubes,
    pages: [
      {
        key: 'recipes',
        segment: 'provisioning/recipes',
        icon: FaScroll,
        labelKey: key('pages.hostManage.tabRecipes'),
        ...section('recipes'),
      },
      {
        key: 'templates',
        segment: 'provisioning/templates',
        icon: FaCompactDisc,
        labelKey: key('pages.hostManage.tabTemplates'),
        ...section('templates'),
      },
      {
        key: 'provisioners',
        segment: 'provisioning/provisioners',
        icon: FaPuzzlePiece,
        labelKey: key('pages.hostManage.tabProvisioners'),
        ...section('provisioning'),
      },
      {
        key: 'provisioning-network',
        segment: 'provisioning/network',
        icon: FaDiagramProject,
        labelKey: key('pages.hostManage.tabProvisioningNetwork'),
        ...section('provisioning-network'),
      },
      {
        key: 'installers',
        segment: 'provisioning/installers',
        icon: FaBoxArchive,
        labelKey: key('pages.hostManage.tabInstallerFiles'),
        ...section('artifacts'),
      },
      {
        key: 'orchestration',
        segment: 'provisioning/orchestration',
        icon: FaArrowDown19,
        labelKey: key('pages.hostManage.tabOrchestration'),
        ...section('orchestration'),
      },
    ],
  },
  {
    key: 'files',
    labelKey: key('hosts.nav.files'),
    icon: FaFolder,
    pages: [
      {
        key: 'file-manager',
        segment: 'files',
        icon: FaFolder,
        labelKey: key('pages.hostManage.tabFileManager'),
        ...section('file-manager'),
      },
    ],
  },
  {
    key: 'agent',
    labelKey: key('hosts.nav.agent'),
    icon: FaRobot,
    pages: server => [
      ...configPages(server),
      {
        key: 'secrets',
        segment: 'agent/secrets',
        icon: FaKey,
        labelKey: key('hosts.nav.secrets'),
        ...feature('secrets'),
      },
      {
        key: 'api-keys',
        segment: 'agent/api-keys',
        icon: FaIdBadge,
        labelKey: key('hosts.nav.apiKeys'),
        ...settings,
      },
      {
        key: 'database',
        segment: 'agent/database',
        icon: FaDatabase,
        labelKey: key('pages.hostManage.tabDatabase'),
        ...settings,
      },
      {
        key: 'update',
        segment: 'agent/update',
        icon: FaCircleUp,
        labelKey: key('hosts.nav.update'),
        ...settings,
      },
    ],
  },
];

const pagesOf = (group, server) =>
  typeof group.pages === 'function' ? group.pages(server) : group.pages;

/**
 * The route of one page of a host.
 *
 * @param {string|number} id - The registry id, or `self` on an agent role
 * @param {{ segment: string }} page - A page of `HOST_PAGES`
 * @returns {string} The route
 */
export const hostPagePath = (id, page) =>
  page.segment
    ? `/hosts/${encodeURIComponent(id)}/${page.segment}`
    : `/hosts/${encodeURIComponent(id)}`;

const offeredPage = (server, id, page) => ({
  key: page.key,
  icon: page.icon,
  ...(page.label === undefined ? { labelKey: page.labelKey(server) } : { label: page.label }),
  to: hostPagePath(id, page),
  end: page.segment === '',
});

/**
 * The groups of pages one host offers, a group with no offered page left
 * out.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string|number} id - The registry id, or `self` on an agent role
 * @returns {Array<{ key: string, icon: Function, labelKey: string, flat: boolean, pages: Array<{ key: string, icon: Function, labelKey?: string, label?: string, to: string, end: boolean }> }>} The offered groups
 */
export const hostPagesFor = (server, id) =>
  HOST_PAGES.map(group => ({
    key: group.key,
    icon: group.icon,
    labelKey: group.labelKey(server),
    flat: Boolean(group.flat),
    pages: pagesOf(group, server)
      .filter(page => page.offered(server))
      .map(page => offeredPage(server, id, page)),
  })).filter(group => group.pages.length > 0);

const HOST_ROUTE = /^\/hosts\/(?<id>[^/]+)/u;

const under = (pathname, page) =>
  page.end ? pathname === page.to : pathname === page.to || pathname.startsWith(`${page.to}/`);

/**
 * The offered group and page a route lies on, the page whose route is the
 * longest prefix of the pathname.
 *
 * @param {string} pathname - The route
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {{ id: string, group: Object, page: Object }|null} The id, the group and the page, null outside a host's pages
 */
export const hostPageOf = (pathname, server) => {
  const match = HOST_ROUTE.exec(pathname);
  if (!match) {
    return null;
  }
  const id = decodeURIComponent(match.groups.id);
  let found = null;
  hostPagesFor(server, id).forEach(group => {
    group.pages.forEach(page => {
      if (under(pathname, page) && (!found || page.to.length > found.page.to.length)) {
        found = { id, group, page };
      }
    });
  });
  return found;
};

const PAGE_KEYS = { files: 'file-manager' };

const pageKeyOf = (sectionKey, name) =>
  sectionKey === 'config' ? `config:${name}` : PAGE_KEYS[sectionKey] || sectionKey;

/**
 * The group and the page of `HOST_PAGES` a section page draws.
 *
 * @param {string} sectionKey - The section's key
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} [name] - The configuration file, for the `config` section
 * @returns {{ group: Object|null, page: Object|null }} The group and the page, `page` null for a file the row does not name
 */
export const pageEntryOf = (sectionKey, server, name = '') => {
  const pageKey = pageKeyOf(sectionKey, name);
  const agent = sectionKey === 'config';
  const group =
    HOST_PAGES.find(candidate =>
      agent
        ? candidate.key === 'agent'
        : pagesOf(candidate, server).some(page => page.key === pageKey)
    ) || null;
  const page = group ? pagesOf(group, server).find(entry => entry.key === pageKey) || null : null;
  return { group, page };
};

/**
 * Whether the host's own row offers a section page.
 *
 * @param {string} sectionKey - The section's key
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} [name] - The configuration file, for the `config` section
 * @returns {boolean} True when the page draws
 */
export const sectionOffered = (sectionKey, server, name = '') => {
  const { page } = pageEntryOf(sectionKey, server, name);
  return Boolean(page) && page.offered(server);
};

/**
 * The token names a section page's gate reads, joined by ` / `.
 *
 * @param {string} sectionKey - The section's key
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} [name] - The configuration file, for the `config` section
 * @returns {string} The token names
 */
export const sectionTokens = (sectionKey, server, name = '') => {
  const { page } = pageEntryOf(sectionKey, server, name);
  if (!page) {
    return sectionKey === 'config' ? 'config' : '';
  }
  return page.tokens.join(' / ');
};

/**
 * The title of a section page, the label of its row in `HOST_PAGES`.
 *
 * @param {string} sectionKey - The section's key
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} name - The configuration file, empty elsewhere
 * @param {Function} t - The translator
 * @returns {string} The title
 */
export const sectionTitle = (sectionKey, server, name, t) => {
  const { page } = pageEntryOf(sectionKey, server, name);
  if (!page) {
    return sectionKey === 'config' ? name || t('admin.config.title') : sectionKey;
  }
  return page.label === undefined ? t(page.labelKey(server)) : page.label;
};

const machineCrumbs = ({ id, name, machinePage, nouns, aggregate, t }) => {
  const page = MACHINE_PAGES.find(entry => entry.key === machinePage && entry.segment);
  return [
    ...(aggregate ? [{ key: 'machines', label: nouns, to: `/hosts/${id}/machines` }] : []),
    { key: 'machine', label: name, to: machineRoute(id, name) },
    ...(page ? [{ key: 'page', label: t(page.labelKey) }] : []),
  ];
};

/**
 * The crumbs of a page of a host.
 *
 * @param {Object} options - The page
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.section - The section's key, or `overview`, `machines` or `machine`
 * @param {string} [options.name] - The configuration file, or the machine's name
 * @param {string} [options.machinePage] - The key of the machine's page in `MACHINE_PAGES`
 * @param {string} options.label - The host's label
 * @param {string} [options.noun] - The host's noun for its machines, plural
 * @param {boolean} options.aggregate - Whether the UI is served by the aggregating server
 * @param {Function} options.t - The translator
 * @returns {Array<{ key: string, label: string, to?: string }>} The crumbs
 */
export const hostCrumbs = ({
  id,
  section: sectionKey,
  name = '',
  machinePage = '',
  label,
  noun = '',
  aggregate,
  t,
}) => {
  const nouns = noun || t(nounKeyOf([], true));
  const trail = [
    ...(aggregate ? [{ key: 'hosts', label: t('hosts.sidebar.title') }] : []),
    { key: 'host', label, to: `/hosts/${encodeURIComponent(id)}` },
  ];
  if (sectionKey === 'overview') {
    return trail;
  }
  if (sectionKey === 'machines') {
    return [...trail, { key: 'machines', label: nouns }];
  }
  if (sectionKey === 'machine') {
    return [...trail, ...machineCrumbs({ id, name, machinePage, nouns, aggregate, t })];
  }
  const { group } = pageEntryOf(sectionKey, null, name);
  return [
    ...trail,
    ...(group && !group.flat ? [{ key: 'group', label: t(group.labelKey(null)) }] : []),
    { key: 'page', label: sectionTitle(sectionKey, null, name, t) },
  ];
};

const fixedPage = pageKey =>
  HOST_PAGES.flatMap(group => (typeof group.pages === 'function' ? [] : group.pages)).find(
    page => page.key === pageKey
  );

const onHost = build => (row, query) => (row.host ? build(row.host, row, query) : '');

const sectionRoute = pageKey =>
  onHost((host, row, query) => arrivalPath(hostPagePath(host, fixedPage(pageKey)), row, query));

const hashOf = row => (row.anchor ? `#${encodeURIComponent(row.anchor)}` : '');

const configPath = (host, row) =>
  `/hosts/${encodeURIComponent(host)}/agent/config/${encodeURIComponent(row.name)}${hashOf(row)}`;

const taskPath = (host, row) =>
  `${hostPagePath(host, fixedPage('overview'))}?task=${encodeURIComponent(row.anchor || row.id)}`;

const configRoute = onHost(configPath);

const taskRoute = onHost(taskPath);

const kindEntry = ({ kind, icon, route, locators, facets = [] }) => ({
  kind,
  feature: 'hosts',
  token: 'hosts',
  locators,
  route,
  icon: () => icon,
  labelKey: `search.kinds.${kind}`,
  matched: {},
  facets,
});

/**
 * The hosts feature's search kinds: host, machine, task, service, config,
 * template and artifact, each routed under the host the row was asked of,
 * a list page carrying the query searched for as its `q`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = status =>
  hasFeatureStrict(status, 'hosts')
    ? [
        kindEntry({
          kind: 'host',
          icon: FaServer,
          route: row => `/hosts/${encodeURIComponent(row.id)}`,
          locators: ['id'],
        }),
        kindEntry({
          kind: 'machine',
          icon: FaDesktop,
          route: onHost((host, row) => machineRoute(host, row.name || row.id)),
          locators: ['name'],
          facets: ['status'],
        }),
        kindEntry({
          kind: 'task',
          icon: FaListCheck,
          route: taskRoute,
          locators: ['anchor'],
          facets: ['status'],
        }),
        kindEntry({
          kind: 'service',
          icon: FaGears,
          route: sectionRoute('services'),
          locators: ['anchor'],
          facets: ['state'],
        }),
        kindEntry({
          kind: 'config',
          icon: FaSliders,
          route: configRoute,
          locators: ['name', 'anchor'],
        }),
        kindEntry({
          kind: 'template',
          icon: FaCompactDisc,
          route: sectionRoute('templates'),
          locators: ['anchor'],
        }),
        kindEntry({
          kind: 'artifact',
          icon: FaBoxArchive,
          route: sectionRoute('installers'),
          locators: ['anchor'],
        }),
      ]
    : [];
