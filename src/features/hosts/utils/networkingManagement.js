import { hostHasFeature, hostHasHypervisor } from './capabilities';

const VLAN_MIN = 1;
const VLAN_MAX = 4094;
const NETMASK_MIN = 1;
const NETMASK_MAX = 30;
const HOSTNAME_MAX = 253;
const LABEL_MAX = 63;
const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/u;
const ADDROBJ_PATTERN = /^[a-zA-Z][a-zA-Z0-9_/]*$/u;
const IPV4_PATTERN = /^(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})$/u;
const IPV6_PATTERN = /^(?:[0-9a-fA-F:]+)$/u;
const MAC_PATTERN = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/u;
const LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u;
const LINK_PATTERN = /^(?<base>[a-zA-Z]+)(?<ppa>\d+)$/u;
const INDEXED_PATTERN = /^(?<prefix>[a-z]+)(?<index>\d+)$/u;
const OCTET_MAX = 255;
const RANDOM_SPAN = 9000;
const RANDOM_FLOOR = 1000;
const NAME_ATTEMPTS = 100;
const LINKS_SHOWN = 2;
const ZONE_NAME_CAP = 20;
const NO_LINK = '--';
const VLAN_TONES = [
  'primary',
  'info',
  'success',
  'warning',
  'danger',
  'primary',
  'primary',
  'info',
  'success',
];
const POLICY_TONES = {
  L2: 'info',
  L3: 'primary',
  L4: 'primary',
  L2L3: 'success',
  L2L4: 'warning',
  L3L4: 'danger',
  L2L3L4: 'dark',
};
const LACP_TONES = { active: 'success', passive: 'info', off: 'secondary' };
const ADDRESS_STATE_TONES = {
  ok: 'success',
  disabled: 'warning',
  down: 'danger',
  duplicate: 'danger',
};
const ADDRESS_TYPE_TONES = { static: 'info', dhcp: 'primary', addrconf: 'primary' };
const PROTECTION_TONES = { stp: 'success', rstp: 'info', none: 'secondary' };
const LINK_STATE_TONES = { up: 'success', down: 'danger' };

const lower = value => String(value ?? '').toLowerCase();

const trimmed = value => String(value ?? '').trim();

const listOf = value => (Array.isArray(value) ? value : []);

const nameOf = row => row?.name || row?.link || '';

/**
 * The management sections of the networking page, hyperweaver-ui's
 * network sections in their order, each its key, the key of its heading
 * and the tokens of which the host's own row must list one, the any-of
 * gate hyperweaver-ui's `NetworkHostnameManagement` applied: the
 * hostname behind `hostname` or `vnics`, the hosts file behind
 * `hosts-file`, the DNS behind `dns` or `vnics`, the VNICs, the VLANs,
 * the aggregates, the bridges and the etherstubs behind `vnics`, the
 * addresses behind `ip-addresses` or `vnics`, and the network spaces
 * behind `network-spaces`.
 */
export const MANAGEMENT_SECTIONS = [
  { key: 'spaces', labelKey: 'host.networkSpaces.title', tokens: ['network-spaces'] },
  {
    key: 'addresses',
    labelKey: 'host.networkHostnameManagement.sectionAddresses',
    tokens: ['ip-addresses', 'vnics'],
  },
  { key: 'vnics', labelKey: 'host.networkHostnameManagement.sectionVnics', tokens: ['vnics'] },
  { key: 'vlans', labelKey: 'host.networkHostnameManagement.sectionVlans', tokens: ['vnics'] },
  {
    key: 'etherstubs',
    labelKey: 'host.networkHostnameManagement.sectionEtherstubs',
    tokens: ['vnics'],
  },
  {
    key: 'bridges',
    labelKey: 'host.networkHostnameManagement.sectionBridges',
    tokens: ['vnics'],
  },
  {
    key: 'aggregates',
    labelKey: 'host.networkHostnameManagement.sectionAggregates',
    tokens: ['vnics'],
  },
  {
    key: 'hostname',
    labelKey: 'host.networkHostnameManagement.sectionHostname',
    tokens: ['hostname', 'vnics'],
  },
  { key: 'dns', labelKey: 'host.networkHostnameManagement.sectionDns', tokens: ['dns', 'vnics'] },
  { key: 'hosts', labelKey: 'host.networkHostnameManagement.sectionHosts', tokens: ['hosts-file'] },
];

/**
 * Whether a host's own row lists any of the tokens, checked strictly, the
 * any-of gate of a management section.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {Array<string>} tokens - The tokens of which one suffices
 * @returns {boolean} True when the row lists one of them
 */
export const hostOffersAny = (server, tokens) =>
  tokens.some(token => hostHasFeature(server, token));

/**
 * The management sections one host offers, in their order.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Array<Object>} The offered entries of `MANAGEMENT_SECTIONS`
 */
export const sectionsOffered = server =>
  MANAGEMENT_SECTIONS.filter(section => hostOffersAny(server, section.tokens));

/**
 * Whether the host's agent is the one of VirtualBox and UTM, whose
 * address routes hyperweaver-ui's dialogs treated by the platform the row
 * names: a host that names `virtualbox` or `utm`.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True on such a host
 */
export const isGoAgent = server =>
  hostHasHypervisor(server, 'virtualbox') || hostHasHypervisor(server, 'utm');

/**
 * The address types a host's create dialog offers beside static, as
 * hyperweaver-ui offered them: DHCP everywhere but on a VirtualBox or
 * UTM host whose platform is not Windows, and addrconf on every other
 * host alone.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {{ dhcp: boolean, addrconf: boolean }} The types offered
 */
export const addressTypesOf = server => {
  const go = isGoAgent(server);
  return { dhcp: !go || server?.capabilities?.platform === 'windows', addrconf: !go };
};

export const ADDRESS_FORM = {
  interface: '',
  type: 'static',
  addrobj: '',
  address: '',
  netmask: '24',
  primary: false,
  wait: '30',
  temporary: false,
  down: false,
};

/**
 * The address object hyperweaver-ui named for a form, the interface,
 * the version read from the address and the type, `vnic0/v4static`.
 *
 * @param {Object} form - The form, the shape of `ADDRESS_FORM`
 * @returns {string} The name, empty while the form names no interface
 */
export const addressObjectOf = form => {
  if (!form.interface || !form.type) {
    return '';
  }
  const version = String(form.address || '').includes(':') ? 'v6' : 'v4';
  return `${form.interface}/${version}${form.type}`;
};

const octetsValid = address => address.split('.').every(octet => Number(octet) <= OCTET_MAX);

const staticProblem = form => {
  const address = trimmed(form.address);
  if (!address) {
    return 'host.ipAddressCreateModal.errors.addressRequired';
  }
  if (address.includes('/')) {
    return 'host.ipAddressCreateModal.errors.noCidr';
  }
  if (!IPV4_PATTERN.test(address) && !IPV6_PATTERN.test(address)) {
    return 'host.ipAddressCreateModal.errors.invalidIp';
  }
  if (IPV4_PATTERN.test(address) && !octetsValid(address)) {
    return 'host.ipAddressCreateModal.errors.invalidOctets';
  }
  const netmask = parseInt(form.netmask, 10);
  if (Number.isNaN(netmask) || netmask < NETMASK_MIN || netmask > NETMASK_MAX) {
    return 'host.ipAddressCreateModal.errors.netmaskRange';
  }
  return '';
};

/**
 * Why an address form cannot be sent, hyperweaver-ui's checks in its
 * order, the key of the sentence, empty for a form that can.
 *
 * @param {Object} form - The form, the shape of `ADDRESS_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const addressProblem = form => {
  if (!trimmed(form.interface)) {
    return 'host.ipAddressCreateModal.errors.interfaceRequired';
  }
  if (!trimmed(form.addrobj)) {
    return 'host.ipAddressCreateModal.errors.addrobjRequired';
  }
  if (!ADDROBJ_PATTERN.test(trimmed(form.addrobj))) {
    return 'host.ipAddressCreateModal.errors.addrobjFormat';
  }
  return form.type === 'static' ? staticProblem(form) : '';
};

/**
 * The body of `POST network/addresses`, hyperweaver-ui's: the interface,
 * the type, the address object, the flags and the wait, and for a static
 * address the address and its netmask as one CIDR.
 *
 * @param {Object} form - The form, the shape of `ADDRESS_FORM`
 * @returns {Object} The body
 */
export const addressBody = form => ({
  interface: trimmed(form.interface),
  type: form.type,
  addrobj: trimmed(form.addrobj),
  primary: Boolean(form.primary),
  wait: parseInt(form.wait, 10),
  temporary: Boolean(form.temporary),
  down: Boolean(form.down),
  ...(form.type === 'static' && trimmed(form.address)
    ? { address: `${trimmed(form.address)}/${form.netmask}` }
    : {}),
});

/**
 * The bare address of an address row, `ip_address` or the part of `addr`
 * before the slash.
 *
 * @param {Object} row - The address row
 * @returns {string} The address
 */
export const bareAddressOf = row =>
  String(row?.ip_address || String(row?.addr || '').split('/')[0] || '');

/**
 * The query of `DELETE network/addresses/{addrobj}`, hyperweaver-ui's:
 * `release` false and, on a VirtualBox or UTM host whose one address
 * object covers several addresses, the bare address to remove.
 *
 * @param {Object} options - The rows held, the row and whether the host is such a one
 * @returns {Object} The query
 */
export const addressDeleteParams = ({ rows, row, goAgent }) => {
  const siblings = rows.filter(entry => entry.addrobj === row.addrobj).length;
  const bare = bareAddressOf(row);
  return { release: false, ...(goAgent && siblings > 1 && bare ? { address: bare } : {}) };
};

export const canEnableAddress = row => lower(row?.state) === 'disabled';

export const canDisableAddress = row => lower(row?.state) === 'ok';

/**
 * The address hyperweaver-ui's management table drew: `addr`, the
 * address and its prefix otherwise, the address alone last.
 *
 * @param {Object} row - The address row
 * @returns {string} The text, empty for a row that carries none
 */
export const managedAddressOf = row => {
  if (row?.addr) {
    return String(row.addr);
  }
  if (row?.ip_address && row?.prefix_length) {
    return `${row.ip_address}/${row.prefix_length}`;
  }
  return String(row?.ip_address || '');
};

export const addressStateTone = state => ADDRESS_STATE_TONES[lower(state)] || 'secondary';

export const addressTypeTone = type => ADDRESS_TYPE_TONES[lower(type)] || 'secondary';

export const linkStateTone = state => LINK_STATE_TONES[lower(state)] || 'secondary';

export const policyTone = policy => POLICY_TONES[policy] || 'secondary';

export const lacpTone = mode => LACP_TONES[lower(mode)] || 'secondary';

export const protectionTone = protection => PROTECTION_TONES[lower(protection)] || 'secondary';

/**
 * The tone a VLAN id draws in, hyperweaver-ui's ring of nine tones by
 * the id, dark for none.
 *
 * @param {number|string} vid - The VLAN id
 * @returns {string} The Bootstrap tone
 */
export const vlanTone = vid => {
  if (vid === undefined || vid === null || vid === '') {
    return 'dark';
  }
  return VLAN_TONES[parseInt(vid, 10) % VLAN_TONES.length] || 'secondary';
};

/**
 * A MAC address with its colons, hyperweaver-ui's: an address answered
 * without them is split into pairs.
 *
 * @param {string} mac - The address
 * @returns {string} The address with colons, empty for none
 */
export const formatMac = mac => {
  const text = String(mac || '');
  if (!text) {
    return '';
  }
  return text.includes(':') ? text : text.match(/.{2}/gu)?.join(':') || text;
};

/**
 * A link's speed as hyperweaver-ui's tables drew it, `1G` or `100M`,
 * empty for none.
 *
 * @param {number|string} speed - The speed in megabits a second
 * @returns {string} The text
 */
export const formatLinkSpeed = speed => {
  const megabits = Number(speed);
  if (!megabits) {
    return '';
  }
  return megabits >= 1000 ? `${megabits / 1000}G` : `${megabits}M`;
};

/**
 * The member links of an aggregate or a bridge as a list, read from a
 * list or from the comma-joined text an agent answers.
 *
 * @param {Array<string>|string} links - The `links` or the `over` member
 * @returns {Array<string>} The names
 */
export const linksArrayOf = links => {
  if (Array.isArray(links)) {
    return links;
  }
  return typeof links === 'string' && links
    ? links
        .split(',')
        .map(link => link.trim())
        .filter(Boolean)
    : [];
};

/**
 * The member links as hyperweaver-ui's tables drew them, two named and
 * the rest counted.
 *
 * @param {Array<string>} links - The names
 * @returns {string} The text
 */
export const formatLinks = links =>
  links.length <= LINKS_SHOWN
    ? links.join(', ')
    : `${links.slice(0, LINKS_SHOWN).join(', ')} +${links.length - LINKS_SHOWN}`;

/**
 * A zone's name as hyperweaver-ui's VNIC table drew it, cut at twenty
 * characters, empty for the global zone.
 *
 * @param {string} zone - The zone
 * @returns {string} The text
 */
export const shortZoneOf = zone => {
  if (!zone || zone === NO_LINK) {
    return '';
  }
  return zone.length > ZONE_NAME_CAP ? `${zone.slice(0, ZONE_NAME_CAP)}...` : zone;
};

/**
 * The interfaces an address may be created on, hyperweaver-ui's list:
 * every VNIC and every physical interface, each once.
 *
 * @param {Object} options - The VNIC rows and the interface rows
 * @returns {Array<{ name: string, type: string, over?: string, state?: string }>} The options
 */
export const addressInterfacesOf = ({ vnics, interfaces }) => {
  const rows = [
    ...listOf(vnics).map(vnic => ({ name: vnic.link, type: 'VNIC', over: vnic.over })),
    ...listOf(interfaces)
      .filter(row => row.class === 'phys')
      .map(row => ({ name: row.link, type: 'Physical', state: row.state })),
  ];
  return rows.filter(
    (row, index) => row.name && rows.findIndex(r => r.name === row.name) === index
  );
};

/**
 * The links a VNIC may be created over, hyperweaver-ui's list: every
 * interface, then the etherstubs, the aggregates and the bridges, each
 * named once.
 *
 * @param {Object} options - The interfaces, etherstubs, aggregates and bridges
 * @returns {Array<{ name: string, type: string, state: string, speed: string }>} The options
 */
export const vnicLinksOf = ({ interfaces, etherstubs, aggregates, bridges }) => {
  const rows = [
    ...listOf(interfaces).map(row => ({
      name: row.link,
      type: 'Physical',
      state: row.state || 'unknown',
      speed: String(row.speed || 'unknown'),
    })),
    ...listOf(etherstubs).map(row => ({
      name: nameOf(row),
      type: 'Etherstub',
      state: 'up',
      speed: 'unknown',
    })),
    ...listOf(aggregates).map(row => ({
      name: nameOf(row),
      type: 'Aggregate',
      state: row.state || 'unknown',
      speed: 'unknown',
    })),
    ...listOf(bridges).map(row => ({
      name: nameOf(row),
      type: 'Bridge',
      state: row.state || 'unknown',
      speed: 'unknown',
    })),
  ];
  return rows.filter(
    (row, index) => trimmed(row.name) && rows.findIndex(r => r.name === row.name) === index
  );
};

/**
 * The physical links of a host, each once, the ones a VLAN is created
 * over and the ones the VNIC and VLAN filters name.
 *
 * @param {Array<Object>} interfaces - The interface rows
 * @returns {Array<Object>} The physical rows, one a link
 */
export const physicalLinksOf = interfaces =>
  listOf(interfaces).filter(
    (row, index, rows) =>
      row.class === 'phys' && row.link && rows.findIndex(r => r.link === row.link) === index
  );

/**
 * The links a bridge may carry, hyperweaver-ui's: physical, VNIC and
 * unclassed interfaces, each once.
 *
 * @param {Array<Object>} interfaces - The interface rows
 * @returns {Array<Object>} The rows
 */
export const bridgeableLinksOf = interfaces =>
  listOf(interfaces).filter(
    (row, index, rows) =>
      row.link &&
      (row.class === 'phys' || row.class === 'vnic' || !row.class) &&
      rows.findIndex(r => r.link === row.link) === index
  );

/**
 * The links an aggregate may carry, hyperweaver-ui's: every interface
 * that is not a VNIC, each once.
 *
 * @param {Array<Object>} interfaces - The interface rows
 * @returns {Array<Object>} The rows
 */
export const aggregateLinksOf = interfaces =>
  listOf(interfaces).filter(
    (row, index, rows) =>
      row.link && row.class !== 'vnic' && rows.findIndex(r => r.link === row.link) === index
  );

export const VNIC_FORM = {
  name: '',
  link: '',
  vlan_id: '',
  mac_address: '',
  temporary: false,
  properties: {},
};

export const VNIC_PROPERTIES = [
  'maxbw',
  'priority',
  'cpus',
  'protection',
  'allowed-ips',
  'allowed-dhcp-cids',
  'rxrings',
  'txrings',
  'mtu',
  'cos',
  'pvid',
  'ethertype',
];

export const VNIC_PROPERTY_VALUES = {
  priority: ['low', 'medium', 'high'],
  protection: ['mac-nospoof', 'restricted', 'ip-nospoof', 'dhcp-nospoof'],
  cos: ['0', '1', '2', '3', '4', '5', '6', '7'],
  ethertype: ['0x0800', '0x86dd', '0x0806', '0x8100', '0x8137', '0x809b', '0x8863', '0x8864'],
  maxbw: ['10M', '100M', '1G', '10G', '25G', '40G', '100G'],
  rxrings: ['1', '2', '4', '8', '16'],
  txrings: ['1', '2', '4', '8', '16'],
  mtu: ['1500', '9000', '9216', '1514', '1518'],
};

const vlanInRange = value => {
  const vid = parseInt(value, 10);
  return !Number.isNaN(vid) && vid >= VLAN_MIN && vid <= VLAN_MAX;
};

/**
 * Why a VNIC form cannot be sent, hyperweaver-ui's checks in its order.
 *
 * @param {Object} form - The form, the shape of `VNIC_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const vnicProblem = form => {
  if (!trimmed(form.name)) {
    return 'host.vnicCreateModal.vnicNameRequired';
  }
  if (!trimmed(form.link)) {
    return 'host.vnicCreateModal.physicalLinkRequired';
  }
  if (!NAME_PATTERN.test(form.name)) {
    return 'host.vnicCreateModal.vnicNameFormat';
  }
  if (form.vlan_id && !vlanInRange(form.vlan_id)) {
    return 'host.vnicCreateModal.vlanIdRange';
  }
  if (form.mac_address && !MAC_PATTERN.test(form.mac_address)) {
    return 'host.vnicCreateModal.invalidMacFormat';
  }
  return '';
};

/**
 * The body of `POST network/vnics`, hyperweaver-ui's: the name, the
 * link and `temporary`, the VLAN id, the MAC address and the properties
 * where given.
 *
 * @param {Object} form - The form, the shape of `VNIC_FORM`
 * @returns {Object} The body
 */
export const vnicBody = form => ({
  name: trimmed(form.name),
  link: trimmed(form.link),
  temporary: Boolean(form.temporary),
  ...(form.vlan_id ? { vlan_id: parseInt(form.vlan_id, 10) } : {}),
  ...(form.mac_address ? { mac_address: trimmed(form.mac_address) } : {}),
  ...(Object.keys(form.properties || {}).length > 0 ? { properties: form.properties } : {}),
});

const randomFour = () => Math.floor(Math.random() * RANDOM_SPAN) + RANDOM_FLOOR;

/**
 * A VNIC name no held VNIC carries, hyperweaver-ui's convention,
 * `vnic_<four digits>_<sequence>`, the sequence the next after the ones
 * held under that number.
 *
 * @param {Array<Object>} vnics - The VNIC rows held
 * @param {Function} [random] - Answers a four-digit number, `Math.random` by default
 * @returns {string} The name
 */
export const suggestVnicName = (vnics, random = randomFour) => {
  const names = new Set(
    listOf(vnics)
      .map(vnic => vnic.link)
      .filter(Boolean)
  );
  let attempts = 0;
  let suggested = '';
  do {
    const base = `vnic_${random()}_`;
    const sequences = [...names]
      .filter(name => name.startsWith(base))
      .map(name => parseInt(name.split('_').pop(), 10) || 0);
    const sequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 0;
    suggested = `${base}${sequence}`;
    attempts += 1;
  } while (names.has(suggested) && attempts < NAME_ATTEMPTS);
  return suggested;
};

export const VLAN_FORM = { vid: '', link: '', name: '', force: false, temporary: false };

/**
 * The name dladm gives a VLAN, hyperweaver-ui's formula: the link's
 * base and a thousand times the id plus the link's PPA, `igb999000` for
 * `igb0` and 999; empty for a link the formula cannot read.
 *
 * @param {string} link - The link the VLAN is over
 * @param {number|string} vid - The VLAN id
 * @returns {string} The name, or the empty string
 */
export const vlanAutoName = (link, vid) => {
  const match = LINK_PATTERN.exec(String(link || ''));
  if (!match || !vid) {
    return '';
  }
  return `${match.groups.base}${1000 * parseInt(vid, 10) + parseInt(match.groups.ppa, 10)}`;
};

/**
 * Why a VLAN form cannot be sent, hyperweaver-ui's checks in its order.
 *
 * @param {Object} form - The form, the shape of `VLAN_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const vlanProblem = form => {
  if (!form.vid) {
    return 'host.vlanCreateModal.vlanIdRequired';
  }
  if (!vlanInRange(form.vid)) {
    return 'host.vlanCreateModal.vlanIdRange';
  }
  if (!trimmed(form.link)) {
    return 'host.vlanCreateModal.physicalLinkRequired';
  }
  if (form.name && !NAME_PATTERN.test(form.name)) {
    return 'host.vlanCreateModal.vlanNameFormat';
  }
  return '';
};

/**
 * The body of `POST network/vlans`, hyperweaver-ui's: the id, the link,
 * `force` and `temporary`, and the name only while it differs from the
 * one dladm would give, the agent naming the VLAN otherwise.
 *
 * @param {Object} form - The form, the shape of `VLAN_FORM`
 * @returns {Object} The body
 */
export const vlanBody = form => {
  const name = trimmed(form.name);
  const custom = name && name !== vlanAutoName(form.link, form.vid);
  return {
    vid: parseInt(form.vid, 10),
    link: trimmed(form.link),
    force: Boolean(form.force),
    temporary: Boolean(form.temporary),
    ...(custom ? { name } : {}),
  };
};

/**
 * The next free name of an indexed family, hyperweaver-ui's `stub0`,
 * `stub1` and `aggr0`: the lowest index no held row takes.
 *
 * @param {Array<Object>} rows - The rows held, each named by `name` or `link`
 * @param {string} prefix - `stub` or `aggr`
 * @returns {string} The name
 */
export const nextIndexedName = (rows, prefix) => {
  const taken = listOf(rows)
    .map(row => INDEXED_PATTERN.exec(nameOf(row)))
    .filter(match => match && match.groups.prefix === prefix)
    .map(match => parseInt(match.groups.index, 10))
    .sort((first, second) => first - second);
  let next = 0;
  taken.forEach(index => {
    if (index === next) {
      next += 1;
    }
  });
  return `${prefix}${next}`;
};

export const ETHERSTUB_FORM = { name: '', temporary: false };

/**
 * Why an etherstub form cannot be sent.
 *
 * @param {Object} form - The form, the shape of `ETHERSTUB_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const etherstubProblem = form => {
  if (!trimmed(form.name)) {
    return 'host.etherstubCreateModal.errors.nameRequired';
  }
  return NAME_PATTERN.test(form.name) ? '' : 'host.etherstubCreateModal.errors.nameFormat';
};

export const etherstubBody = form => ({
  name: trimmed(form.name),
  temporary: Boolean(form.temporary),
});

export const BRIDGE_FORM = {
  name: '',
  protection: 'stp',
  priority: '32768',
  max_age: '20',
  hello_time: '2',
  forward_delay: '15',
  force_protocol: '3',
  links: [],
};

const BRIDGE_RANGES = [
  ['priority', 0, 65535, 'host.bridgeCreateModal.errors.priorityRange'],
  ['max_age', 6, 40, 'host.bridgeCreateModal.errors.maxAgeRange'],
  ['hello_time', 1, 10, 'host.bridgeCreateModal.errors.helloTimeRange'],
  ['forward_delay', 4, 30, 'host.bridgeCreateModal.errors.forwardDelayRange'],
];

/**
 * Why a bridge form cannot be sent, hyperweaver-ui's checks in its
 * order, each number held to its range.
 *
 * @param {Object} form - The form, the shape of `BRIDGE_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const bridgeProblem = form => {
  if (!trimmed(form.name)) {
    return 'host.bridgeCreateModal.errors.nameRequired';
  }
  if (!NAME_PATTERN.test(form.name)) {
    return 'host.bridgeCreateModal.errors.nameFormat';
  }
  const out = BRIDGE_RANGES.find(
    ([member, low, high]) => Number(form[member]) < low || Number(form[member]) > high
  );
  return out ? out[3] : '';
};

export const bridgeBody = form => ({
  name: trimmed(form.name),
  protection: form.protection,
  priority: parseInt(form.priority, 10),
  max_age: parseInt(form.max_age, 10),
  hello_time: parseInt(form.hello_time, 10),
  forward_delay: parseInt(form.forward_delay, 10),
  force_protocol: parseInt(form.force_protocol, 10),
  links: listOf(form.links),
});

export const AGGREGATE_FORM = {
  name: '',
  links: [],
  policy: 'L4',
  lacp_mode: 'off',
  lacp_timer: 'short',
  unicast_address: '',
  temporary: false,
  disableCdp: false,
};

/**
 * Why an aggregate form cannot be sent, hyperweaver-ui's checks in its
 * order, the CDP service last: a running CDP must be disabled first.
 *
 * @param {Object} form - The form, the shape of `AGGREGATE_FORM`
 * @param {boolean} cdpRunning - Whether the host's CDP service is online
 * @returns {string} The locale key, or the empty string
 */
export const aggregateProblem = (form, cdpRunning) => {
  if (!trimmed(form.name)) {
    return 'host.aggregateCreateModal.errors.nameRequired';
  }
  if (listOf(form.links).length === 0) {
    return 'host.aggregateCreateModal.errors.linkRequired';
  }
  if (!NAME_PATTERN.test(form.name)) {
    return 'host.aggregateCreateModal.errors.nameFormat';
  }
  if (form.unicast_address && !MAC_PATTERN.test(form.unicast_address)) {
    return 'host.aggregateCreateModal.errors.macFormat';
  }
  return cdpRunning && !form.disableCdp ? 'host.aggregateCreateModal.errors.cdpRunning' : '';
};

export const aggregateBody = form => ({
  name: trimmed(form.name),
  links: listOf(form.links),
  policy: form.policy,
  lacp_mode: form.lacp_mode,
  lacp_timer: form.lacp_timer,
  temporary: Boolean(form.temporary),
  ...(trimmed(form.unicast_address) ? { unicast_address: trimmed(form.unicast_address) } : {}),
});

/**
 * The FMRI of the CDP service, the one `POST services/action` disables
 * before an aggregate is made.
 */
export const CDP_FMRI = 'svc:/network/cdp:default';

/**
 * Whether the host's CDP service is online among the services answered
 * for the pattern `cdp`, the state hyperweaver-ui warned of before an
 * aggregate is made.
 *
 * @param {Array<Object>|null} services - The rows of `GET services` with `pattern=cdp`
 * @returns {boolean} True while the service reads online
 */
export const cdpRunning = services =>
  listOf(services).some(
    service => String(service?.fmri || '').includes('network/cdp') && service.state === 'online'
  );

/**
 * Whether a hostname is one RFC names, hyperweaver-ui's check: at most
 * 253 characters, every label 1 to 63 of letters, digits and inner
 * hyphens.
 *
 * @param {string} hostname - The hostname
 * @returns {boolean} True when it is valid
 */
export const hostnameValid = hostname => {
  const text = String(hostname || '');
  if (!text || text.length > HOSTNAME_MAX) {
    return false;
  }
  return text
    .split('.')
    .every(label => label.length > 0 && label.length <= LABEL_MAX && LABEL_PATTERN.test(label));
};

/**
 * Why a hostname change cannot be sent: empty, the same as the current
 * one, or invalid.
 *
 * @param {string} next - The hostname typed
 * @param {string} current - The hostname the host answered
 * @returns {string} The locale key, or the empty string
 */
export const hostnameProblem = (next, current) => {
  if (!trimmed(next)) {
    return 'host.hostnameSettings.errors.empty';
  }
  if (next === current) {
    return 'host.hostnameSettings.errors.same';
  }
  return hostnameValid(next) ? '' : 'host.hostnameSettings.invalidHostname';
};

export const hostnameBody = (hostname, applyImmediately) => ({
  hostname: trimmed(hostname),
  apply_immediately: Boolean(applyImmediately),
});

export const linesFrom = list => (Array.isArray(list) ? list.join('\n') : '');

export const listFrom = text =>
  String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

export const DNS_FORM = {
  nameservers: '',
  searchDomains: '',
  domain: '',
  options: '',
  raw: '',
  rawMode: false,
};

/**
 * The DNS form as the answer of `GET system/dns` fills it.
 *
 * @param {Object|null} answer - The answer
 * @returns {Object} The form, the shape of `DNS_FORM`
 */
export const dnsFormOf = answer => ({
  ...DNS_FORM,
  nameservers: linesFrom(answer?.nameservers),
  searchDomains: linesFrom(answer?.search_domains),
  domain: answer?.domain || '',
  options: linesFrom(answer?.options),
  raw: answer?.raw || '',
});

/**
 * The body of `PUT system/dns`, hyperweaver-ui's: the raw file while
 * the raw mode is on, the parsed lists and the domain where given
 * otherwise.
 *
 * @param {Object} form - The form, the shape of `DNS_FORM`
 * @returns {Object} The body
 */
export const dnsBody = form =>
  form.rawMode
    ? { raw: form.raw }
    : {
        nameservers: listFrom(form.nameservers),
        search_domains: listFrom(form.searchDomains),
        options: listFrom(form.options),
        ...(trimmed(form.domain) ? { domain: trimmed(form.domain) } : {}),
      };

/**
 * The rows of the hosts file editor from the entries `GET system/hosts`
 * answers, each its address and its hostnames as one line.
 *
 * @param {Array<Object>|null} entries - The `entries` answered
 * @returns {Array<{ key: string, ip: string, hostnames: string }>} The rows
 */
export const hostsRowsFrom = entries =>
  listOf(entries).map((entry, index) => ({
    key: `row-${index}-${entry.ip}`,
    ip: entry.ip || '',
    hostnames: listOf(entry.hostnames).join(' '),
  }));

/**
 * The body of `PUT system/hosts`, hyperweaver-ui's: the raw file while
 * the raw mode is on, the rows that carry an address and a hostname
 * otherwise, the hostnames split on spaces.
 *
 * @param {Object} options - `rawMode`, `raw` and `rows`
 * @returns {Object} The body
 */
export const hostsBody = ({ rawMode, raw, rows }) =>
  rawMode
    ? { raw }
    : {
        entries: listOf(rows)
          .filter(row => trimmed(row.ip) && trimmed(row.hostnames))
          .map(row => ({ ip: trimmed(row.ip), hostnames: trimmed(row.hostnames).split(/\s+/u) })),
      };

/**
 * Which host-only families a host draws, hyperweaver-ui's platform
 * split: a Darwin host carries host-only networks alone, every other
 * platform host-only interfaces alone, an unknown platform both.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {{ hostonly: boolean, hostonlynet: boolean, natnetwork: boolean, intnet: boolean }} The families drawn
 */
export const spaceFamiliesOf = server => {
  const platform = server?.capabilities?.platform || null;
  return {
    hostonly: platform !== 'darwin',
    hostonlynet: platform === 'darwin' || platform === null,
    natnetwork: true,
    intnet: true,
  };
};

/**
 * The spaces a host answers grouped by their type.
 *
 * @param {Array<Object>|null} spaces - The `spaces` answered
 * @returns {{ hostonly: Array, hostonlynet: Array, natnetwork: Array, intnet: Array }} The groups
 */
export const spacesByType = spaces => ({
  hostonly: listOf(spaces).filter(space => space.type === 'hostonly'),
  hostonlynet: listOf(spaces).filter(space => space.type === 'hostonlynet'),
  natnetwork: listOf(spaces).filter(space => space.type === 'natnetwork'),
  intnet: listOf(spaces).filter(space => space.type === 'intnet'),
});

/**
 * The body of a host-only interface's create or modify, hyperweaver-ui's:
 * the address and netmask where an address was typed, the DHCP server
 * while it is on, and `dhcp: null` to remove one a space had.
 *
 * @param {Object} form - `ip`, `netmask`, `dhcpOn`, `serverIp`, `lowerIp`, `upperIp`
 * @param {Object|null} space - The space edited, null for a new one
 * @returns {Object} The body
 */
export const hostOnlyIfBody = (form, space) => ({
  ...(form.ip ? { ip: form.ip, netmask: form.netmask } : {}),
  ...(form.dhcpOn
    ? {
        dhcp: {
          server_ip: form.serverIp,
          netmask: form.netmask,
          lower_ip: form.lowerIp,
          upper_ip: form.upperIp,
        },
      }
    : {}),
  ...(!form.dhcpOn && space?.dhcp?.exists ? { dhcp: null } : {}),
});

export const hostOnlyIfReady = form =>
  !form.dhcpOn || Boolean(form.serverIp && form.lowerIp && form.upperIp);

export const hostOnlyNetBody = (form, space) => ({
  ...(space ? {} : { name: trimmed(form.name) }),
  netmask: form.netmask,
  lower_ip: form.lowerIp,
  upper_ip: form.upperIp,
  enabled: Boolean(form.enabled),
});

export const hostOnlyNetReady = (form, space) =>
  Boolean((space || trimmed(form.name)) && form.netmask && form.lowerIp && form.upperIp);

/**
 * The body of a NAT network's create or modify, hyperweaver-ui's: the
 * knobs and, on an edit, the forwards removed then the forwards added.
 *
 * @param {Object} form - `name`, `cidr`, `enabled`, `dhcp`, `ipv6`, `removedForwards`, `addedForwards`
 * @param {Object|null} space - The space edited, null for a new one
 * @returns {Object} The body
 */
export const natNetworkBody = (form, space) => ({
  ...(space ? {} : { name: trimmed(form.name) }),
  cidr: form.cidr,
  enabled: Boolean(form.enabled),
  dhcp: Boolean(form.dhcp),
  ipv6: Boolean(form.ipv6),
  ...(listOf(form.removedForwards).length > 0
    ? { remove_port_forwards: form.removedForwards }
    : {}),
  ...(listOf(form.addedForwards).length > 0 ? { add_port_forwards: form.addedForwards } : {}),
});

export const natNetworkReady = (form, space) => Boolean((space || trimmed(form.name)) && form.cidr);

export const FORWARD_DRAFT = {
  name: '',
  protocol: 'tcp',
  host_ip: '',
  host_port: '',
  guest_ip: '',
  guest_port: '',
  ipv6: false,
};

export const forwardReady = draft =>
  Boolean(trimmed(draft.name)) &&
  parseInt(draft.host_port, 10) > 0 &&
  parseInt(draft.guest_port, 10) > 0;

export const forwardOf = draft => ({
  ...draft,
  host_port: parseInt(draft.host_port, 10) || 0,
  guest_port: parseInt(draft.guest_port, 10) || 0,
});

/**
 * A port forward as one line, `name: host:port → guest:port`, a star for
 * an address the rule leaves open.
 *
 * @param {Object} forward - The forward row
 * @returns {string} The line
 */
export const forwardLineOf = forward =>
  `${forward.name}: ${forward.host_ip || '*'}:${forward.host_port} → ${forward.guest_ip || '*'}:${forward.guest_port}`;

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesManagedAddress = matcher(row => [
  row.interface,
  row.addrobj,
  row.addr,
  row.ip_address,
  row.type,
  row.state,
]);

export const matchesVnic = matcher(row => [row.link, row.over, row.macaddress, row.zone]);

export const matchesVlan = matcher(row => [row.link, row.over, row.vid]);

export const matchesNamed = matcher(row => [nameOf(row), row.over, row.class]);

export const matchesBridge = matcher(row => [row.name, row.protection, ...linksArrayOf(row.links)]);

export const matchesAggregate = matcher(row => [
  nameOf(row),
  row.policy,
  row.lacp_mode,
  ...linksArrayOf(row.links || row.over),
]);

export const matchesSpace = matcher(row => [
  row.name,
  row.type,
  row.ip_address,
  row.network_mask,
  row.cidr,
  row.gateway,
]);

const wordsOf = member => row => (row[member] ? [String(row[member])] : []);

const wordOf = value => value;

/**
 * The filter groups of the managed addresses table, one per enumerable
 * column: the type, the version and the state.
 */
export const MANAGED_ADDRESS_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.ipAddressTableManagement.type',
    values: wordsOf('type'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'version',
    labelKey: 'host.ipAddressTableManagement.version',
    values: wordsOf('ip_version'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
  {
    key: 'state',
    labelKey: 'host.ipAddressTableManagement.state',
    values: wordsOf('state'),
    activeClass: 'bg-secondary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the VNICs table, hyperweaver-ui's three filters:
 * the link, the zone and the state.
 */
export const VNIC_FILTERS = [
  {
    key: 'over',
    labelKey: 'host.vnicManagement.filterByPhysicalLink',
    values: wordsOf('over'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'zone',
    labelKey: 'host.vnicManagement.filterByZone',
    values: row => (row.zone && row.zone !== NO_LINK ? [String(row.zone)] : []),
    activeClass: 'bg-warning text-dark',
    labelFor: wordOf,
  },
  {
    key: 'state',
    labelKey: 'host.vnicManagement.filterByState',
    values: wordsOf('state'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the VLANs table, hyperweaver-ui's: the link and
 * the state.
 */
export const VLAN_FILTERS = [
  {
    key: 'over',
    labelKey: 'host.vlanManagement.filterByPhysicalLink',
    values: wordsOf('over'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
  {
    key: 'state',
    labelKey: 'host.vlanManagement.filterByState',
    values: wordsOf('state'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
];

/**
 * The filter groups of the aggregates table, hyperweaver-ui's: the
 * state and the policy.
 */
export const AGGREGATE_FILTERS = [
  {
    key: 'state',
    labelKey: 'host.aggregateManagement.filterByState',
    values: wordsOf('state'),
    activeClass: 'bg-primary',
    labelFor: wordOf,
  },
  {
    key: 'policy',
    labelKey: 'host.aggregateManagement.filterByPolicy',
    values: wordsOf('policy'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
];

/**
 * The filter group of the network spaces table, the type of a space.
 */
export const SPACE_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.networkSpaces.title',
    values: wordsOf('type'),
    activeClass: 'bg-info',
    labelFor: wordOf,
  },
];

/**
 * The key one row of a managed list is told from another by, the name
 * an agent gives it under `name` or `link`.
 *
 * @param {Object} row - The row
 * @returns {string} The key
 */
export const namedKey = row => nameOf(row);

/**
 * The key one managed address is told from another by, its address
 * object and its address, hyperweaver-ui's dedupe.
 *
 * @param {Object} row - The address row
 * @returns {string} The key
 */
export const managedAddressKey = row => `${row.addrobj}|${row.ip_address || row.addr || ''}`;

/**
 * The rows of a managed list each once by their key, hyperweaver-ui's
 * dedupe of what an agent answered.
 *
 * @param {Array<Object>|null} rows - The rows answered
 * @param {Function} keyOf - The key of a row
 * @returns {Array<Object>} The rows, each key once
 */
export const uniqueRows = (rows, keyOf) =>
  listOf(rows).filter((row, index, all) => all.findIndex(r => keyOf(r) === keyOf(row)) === index);
