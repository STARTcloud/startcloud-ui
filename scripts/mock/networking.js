import { randomInt } from 'node:crypto';

import { ROLE_STATUS, featuresOf, hypervisorsOf, rowOf } from './fleet.js';
import { AGENT_MODE, ok, problem, refusal } from './kit.js';
import { queue, settles } from './tasks.js';

const MINUTE_MS = 60 * 1000;
const PAGE = { limit: 100, offset: 0 };
const CDP_FMRI = 'svc:/network/cdp:default';
const NO_LINK = '--';
const ZONE_ADDRESSES = [
  { interface: 'lo0', ip_address: '127.0.0.1', ip_version: 'v4', state: 'ok', type: 'static' },
  { interface: 'lo0', ip_address: '::1', ip_version: 'v6', state: 'ok', type: 'static' },
  { interface: 'igb0', ip_address: '10.0.0.31', ip_version: 'v4', state: 'ok', type: 'static' },
  {
    interface: 'igb0',
    ip_address: 'fe80::a00:27ff:fe4f:3c01',
    ip_version: 'v6',
    state: 'ok',
    type: 'addrconf',
  },
  { interface: 'vnic0', ip_address: '10.0.0.41', ip_version: 'v4', state: 'ok', type: 'dhcp' },
  {
    interface: 'vnic1',
    ip_address: '192.168.50.1',
    ip_version: 'v4',
    state: 'tentative',
    type: 'static',
  },
];
const ZONE_PREFIXES = { '127.0.0.1': 8, '::1': 128, 'fe80::a00:27ff:fe4f:3c01': 10 };
const DEFAULT_PREFIX = 24;
const AGENT_ADDRESSES = [
  { interface: 'eth0', addr: '10.0.0.21/24', ip_version: 'v4', state: 'ok' },
  { interface: 'eth0', addr: '10.0.0.22/24', ip_version: 'v4', state: 'ok' },
  { interface: 'eth0', addr: 'fe80::a00:27ff:fe4f:2b01/64', ip_version: 'v6', state: 'ok' },
  { interface: 'lo', addr: '127.0.0.1/8', ip_version: 'v4', state: 'ok' },
  { interface: 'wlan0', addr: '169.254.12.7/16', ip_version: 'v4', state: 'down' },
];
const ZONE_ROUTES = [
  { destination: 'default', gateway: '10.0.0.1', interface: 'igb0', flags: 'UG', mask: null },
  {
    destination: '10.0.0.0',
    gateway: '10.0.0.31',
    interface: 'igb0',
    flags: 'U',
    mask: '255.255.255.0',
  },
  {
    destination: '10.0.0.41',
    gateway: '10.0.0.41',
    interface: 'vnic0',
    flags: 'UH',
    mask: '255.255.255.255',
  },
  {
    destination: '192.168.50.0',
    gateway: '192.168.50.1',
    interface: 'vnic1',
    flags: 'U',
    mask: '255.255.255.0',
  },
  { destination: '127.0.0.1', gateway: '127.0.0.1', interface: 'lo0', flags: 'UH', mask: null },
];
const SEED_SPACES = [
  {
    type: 'hostonly',
    name: 'vboxnet0',
    ip_address: '192.168.56.1',
    network_mask: '255.255.255.0',
    dhcp: {
      exists: true,
      server_ip: '192.168.56.100',
      lower_ip: '192.168.56.101',
      upper_ip: '192.168.56.254',
      enabled: true,
    },
  },
  {
    type: 'hostonlynet',
    name: 'HostOnlyNet',
    network_mask: '255.255.255.0',
    lower_ip: '192.168.60.10',
    upper_ip: '192.168.60.200',
    enabled: true,
  },
  {
    type: 'natnetwork',
    name: 'NatNetwork',
    cidr: '10.0.2.0/24',
    gateway: '10.0.2.1',
    enabled: true,
    dhcp_enabled: true,
    ipv6: false,
    port_forwards: [
      {
        name: 'ssh',
        protocol: 'tcp',
        host_ip: '',
        host_port: 2222,
        guest_ip: '10.0.2.15',
        guest_port: 22,
        ipv6: false,
      },
    ],
  },
  { type: 'intnet', name: 'intnet' },
];
const SEED_DNS = {
  nameservers: ['10.0.0.1', '1.1.1.1'],
  search_domains: ['example.com'],
  domain: '',
  options: ['ndots:2'],
};
const SEED_HOSTS = [
  { ip: '127.0.0.1', hostnames: ['localhost'] },
  { ip: '::1', hostnames: ['localhost'] },
  { ip: '10.0.0.31', hostnames: ['zone-1', 'zone-1.example.com'] },
];

const states = new Map();

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const offersAny = (host, tokens) => tokens.some(token => offers(host, token));

const iso = at => new Date(at).toISOString();

const pad = (number, width) => String(number).padStart(width, '0');

const platformOf = host =>
  AGENT_MODE ? ROLE_STATUS.platform : rowOf(host)?.capabilities?.platform || null;

const hostnameOf = host => host.facts.hostname;

const twice = rows =>
  [0, MINUTE_MS].flatMap((age, scan) =>
    rows.map((row, index) => ({
      id: (1 - scan) * rows.length + index + 1,
      ...row,
      scan_timestamp: iso(Date.now() - age),
    }))
  );

const seedVnics = host =>
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

const zoneAddress = entry => {
  const prefix = ZONE_PREFIXES[entry.ip_address] || DEFAULT_PREFIX;
  return {
    ...entry,
    addrobj: `${entry.interface}/${entry.ip_version}${entry.type}`,
    addr: `${entry.ip_address}/${prefix}`,
    prefix_length: prefix,
  };
};

const agentAddress = entry => ({
  addrobj: `${entry.interface}/${entry.ip_version}`,
  type: 'static',
  ...entry,
  source: 'live',
});

const seeded = host => ({
  addresses: isZone(host) ? ZONE_ADDRESSES.map(zoneAddress) : AGENT_ADDRESSES.map(agentAddress),
  vnics: isZone(host) ? seedVnics(host) : [],
  vlans: isZone(host)
    ? [{ link: 'igb100000', vid: 100, over: 'igb0', state: 'up', class: 'vlan', mtu: 1500 }]
    : [],
  etherstubs: isZone(host)
    ? [{ name: 'stub0', class: 'etherstub', state: 'up', over: NO_LINK, vnics: [], mtu: 9000 }]
    : [],
  bridges: isZone(host)
    ? [
        {
          name: 'bridge0',
          protection: 'stp',
          priority: 32768,
          links: ['igb1'],
          max_age: 20,
          hello_time: 2,
          forward_delay: 15,
        },
      ]
    : [],
  aggregates: [],
  spaces: isZone(host) ? [] : SEED_SPACES.map(space => ({ ...space })),
  cdp: 'online',
  hostname: { hostname: hostnameOf(host), nodename: hostnameOf(host), pending: '' },
  dns: { ...SEED_DNS },
  hosts: SEED_HOSTS.map(entry => ({ ...entry, hostnames: [...entry.hostnames] })),
});

const stateOf = host => {
  if (!states.has(host.id)) {
    states.set(host.id, seeded(host));
  }
  return states.get(host.id);
};

const monitoringAddresses = ctx => {
  const { addresses } = stateOf(ctx.host);
  const rows = isZone(ctx.host) ? twice(addresses) : addresses;
  return ok({ addresses: rows, returned: rows.length, pagination: PAGE });
};

const zoneRoute = ({ mask, ...entry }) => ({
  ...entry,
  ip_version: 'v4',
  is_default: entry.destination === 'default',
  ref: 1,
  use: '0',
  destination_mask: mask,
});

const routes = ctx => {
  if (!isZone(ctx.host)) {
    return problem(404, 'Not Found');
  }
  const rows = twice(ZONE_ROUTES.map(zoneRoute));
  return ok({ routes: rows, returned: rows.length, pagination: PAGE });
};

const behind = (tokens, handler) => ctx =>
  tokens.every(token => offers(ctx.host, token)) ? handler(ctx) : problem(404, 'Not Found');

const behindAny = (tokens, handler) => ctx =>
  offersAny(ctx.host, tokens) ? handler(ctx) : problem(404, 'Not Found');

const nameOf = (ctx, member) => decodeURIComponent(ctx.params[member]);

const queued = ({ ctx, operation, message, metadata }) => {
  const task = queue({
    host: ctx.host,
    by: ctx.person.username,
    operation,
    target: 'system',
    metadata,
  });
  return ok({ success: true, message, task_id: task.id }, 202);
};

const addresses = ctx => {
  const rows = stateOf(ctx.host).addresses;
  return ok({ addresses: rows, returned: rows.length, source: 'live' });
};

const addressBody = body => {
  const [address = '', prefix = String(DEFAULT_PREFIX)] = String(body.address || '').split('/');
  return {
    addrobj: body.addrobj,
    interface: body.interface,
    type: body.type || 'static',
    ip_version: address.includes(':') ? 'v6' : 'v4',
    state: body.down ? 'disabled' : 'ok',
    ...(address ? { ip_address: address, prefix_length: Number(prefix), addr: body.address } : {}),
  };
};

const addressRefusal = ({ host, body }) => {
  if (!body.interface || !body.addrobj) {
    return refusal(400, 'interface and addrobj are required');
  }
  if (
    stateOf(host).addresses.some(row => row.addrobj === body.addrobj && row.addr === body.address)
  ) {
    return refusal(409, `Address object ${body.addrobj} already exists`);
  }
  return null;
};

const addressCreated = ctx => {
  const refused = addressRefusal(ctx);
  if (refused) {
    return refused;
  }
  const { host, body } = ctx;
  if (isZone(host)) {
    return queued({
      ctx,
      operation: 'ip_address_create',
      message: `IP address creation task created for ${body.addrobj}`,
      metadata: { address: addressBody(body) },
    });
  }
  const state = stateOf(host);
  state.addresses = [...state.addresses, agentAddress(addressBody(body))];
  return ok({ success: true, message: `Address ${body.address} added to ${body.interface}` });
};

const afterAddressCreate = (host, task) => {
  const state = stateOf(host);
  state.addresses = [...state.addresses, task.metadata.address];
};

const addressRows = (host, addrobj, address) =>
  stateOf(host).addresses.filter(
    row =>
      row.addrobj === addrobj &&
      (!address || (row.ip_address || row.addr.split('/')[0]) === address)
  );

const addressDeleted = ctx => {
  const { host, url } = ctx;
  const addrobj = nameOf(ctx, 'addrobj');
  const address = url.searchParams.get('address') || '';
  if (addressRows(host, addrobj, address).length === 0) {
    return refusal(404, `Address object ${addrobj} not found`);
  }
  if (isZone(host)) {
    return queued({
      ctx,
      operation: 'ip_address_delete',
      message: `IP address deletion task created for ${addrobj}`,
      metadata: { addrobj, address },
    });
  }
  const state = stateOf(host);
  const gone = addressRows(host, addrobj, address);
  state.addresses = state.addresses.filter(row => !gone.includes(row));
  return ok({ success: true, message: `Address object ${addrobj} removed` });
};

const afterAddressDelete = (host, task) => {
  const state = stateOf(host);
  const gone = addressRows(host, task.metadata.addrobj, task.metadata.address);
  state.addresses = state.addresses.filter(row => !gone.includes(row));
};

const setAddressState = (host, addrobj, state) => {
  const held = stateOf(host);
  held.addresses = held.addresses.map(row => (row.addrobj === addrobj ? { ...row, state } : row));
};

const addressToggled = action => ctx => {
  const { host } = ctx;
  const addrobj = nameOf(ctx, 'addrobj');
  if (addressRows(host, addrobj).length === 0) {
    return refusal(404, `Address object ${addrobj} not found`);
  }
  if (isZone(host)) {
    return queued({
      ctx,
      operation: `ip_address_${action}`,
      message: `IP address ${action} task created for ${addrobj}`,
      metadata: { addrobj },
    });
  }
  setAddressState(host, addrobj, action === 'enable' ? 'ok' : 'disabled');
  return ok({
    success: true,
    message: `Address object ${addrobj} ${action}d`,
    ...(action === 'disable'
      ? { note: `The whole interface ${addrobj.split('/')[0]} was taken down with it` }
      : {}),
  });
};

const afterAddressToggle = action => (host, task) =>
  setAddressState(host, task.metadata.addrobj, action === 'enable' ? 'ok' : 'disabled');

const vnics = ctx => {
  const rows = stateOf(ctx.host).vnics;
  return ok({ vnics: rows, returned: rows.length, source: 'live' });
};

const vnicShown = ctx => {
  const link = nameOf(ctx, 'link');
  const row = stateOf(ctx.host).vnics.find(entry => entry.link === link);
  return row
    ? ok({ vnic: { ...row, created_at: iso(Date.now() - MINUTE_MS) } })
    : refusal(404, `VNIC ${link} not found`);
};

const vnicCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name || !body.link) {
    return refusal(400, 'name and link are required');
  }
  if (stateOf(host).vnics.some(row => row.link === body.name)) {
    return refusal(409, `VNIC ${body.name} already exists`);
  }
  return queued({
    ctx,
    operation: 'vnic_create',
    message: `VNIC creation task created for ${body.name}`,
    metadata: {
      vnic: {
        link: body.name,
        over: body.link,
        speed: 0,
        macaddress: body.mac_address || `02:08:20:cc:${pad(randomInt(99), 2)}:01`,
        macaddrtype: body.mac_address ? 'fixed' : 'random',
        vid: body.vlan_id || 0,
        mtu: Number(body.properties?.mtu) || 1500,
        state: 'up',
        zone: NO_LINK,
      },
    },
  });
};

const afterVnicCreate = (host, task) => {
  const state = stateOf(host);
  state.vnics = [...state.vnics, task.metadata.vnic];
};

const vnicDeleted = ctx => {
  const link = nameOf(ctx, 'link');
  if (!stateOf(ctx.host).vnics.some(row => row.link === link)) {
    return refusal(404, `VNIC ${link} not found`);
  }
  return queued({
    ctx,
    operation: 'vnic_delete',
    message: `VNIC deletion task created for ${link}`,
    metadata: { link },
  });
};

const afterVnicDelete = (host, task) => {
  const state = stateOf(host);
  state.vnics = state.vnics.filter(row => row.link !== task.metadata.link);
};

const vlans = ctx => {
  const rows = stateOf(ctx.host).vlans;
  return ok({ vlans: rows, returned: rows.length, source: 'live' });
};

const vlanShown = ctx => {
  const link = nameOf(ctx, 'link');
  const row = stateOf(ctx.host).vlans.find(entry => entry.link === link);
  return row ? ok({ vlan: row }) : refusal(404, `VLAN ${link} not found`);
};

const vlanNameOf = body => {
  const match = /^(?<base>[a-zA-Z]+)(?<ppa>\d+)$/u.exec(String(body.link || ''));
  return match
    ? `${match.groups.base}${1000 * Number(body.vid) + Number(match.groups.ppa)}`
    : `vlan${body.vid}`;
};

const vlanCreated = ctx => {
  const { host, body } = ctx;
  if (!body.vid || !body.link) {
    return refusal(400, 'vid and link are required');
  }
  const link = body.name || vlanNameOf(body);
  if (stateOf(host).vlans.some(row => row.link === link)) {
    return refusal(409, `VLAN ${link} already exists`);
  }
  return queued({
    ctx,
    operation: 'vlan_create',
    message: `VLAN creation task created for ${link}`,
    metadata: {
      vlan: { link, vid: Number(body.vid), over: body.link, state: 'up', class: 'vlan', mtu: 1500 },
    },
  });
};

const afterVlanCreate = (host, task) => {
  const state = stateOf(host);
  state.vlans = [...state.vlans, task.metadata.vlan];
};

const vlanDeleted = ctx => {
  const link = nameOf(ctx, 'link');
  if (!stateOf(ctx.host).vlans.some(row => row.link === link)) {
    return refusal(404, `VLAN ${link} not found`);
  }
  return queued({
    ctx,
    operation: 'vlan_delete',
    message: `VLAN deletion task created for ${link}`,
    metadata: { link },
  });
};

const afterVlanDelete = (host, task) => {
  const state = stateOf(host);
  state.vlans = state.vlans.filter(row => row.link !== task.metadata.link);
};

const etherstubs = ctx => {
  const { vnics: held, etherstubs: rows } = stateOf(ctx.host);
  const listed = rows.map(row => ({
    ...row,
    vnics: held.filter(vnic => vnic.over === row.name).map(vnic => vnic.link),
  }));
  return ok({ etherstubs: listed, returned: listed.length, source: 'live' });
};

const etherstubShown = ctx => {
  const name = nameOf(ctx, 'name');
  const { vnics: held, etherstubs: rows } = stateOf(ctx.host);
  const row = rows.find(entry => entry.name === name);
  if (!row) {
    return refusal(404, `Etherstub ${name} not found`);
  }
  const showVnics = ctx.url.searchParams.get('show_vnics') === 'true';
  return ok({
    etherstub: row,
    ...(showVnics ? { vnics: held.filter(vnic => vnic.over === name) } : {}),
  });
};

const etherstubCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name) {
    return refusal(400, 'name is required');
  }
  if (stateOf(host).etherstubs.some(row => row.name === body.name)) {
    return refusal(409, `Etherstub ${body.name} already exists`);
  }
  return queued({
    ctx,
    operation: 'etherstub_create',
    message: `Etherstub creation task created for ${body.name}`,
    metadata: {
      etherstub: {
        name: body.name,
        class: 'etherstub',
        state: 'up',
        over: NO_LINK,
        vnics: [],
        mtu: 9000,
      },
    },
  });
};

const afterEtherstubCreate = (host, task) => {
  const state = stateOf(host);
  state.etherstubs = [...state.etherstubs, task.metadata.etherstub];
};

const etherstubDeleted = ctx => {
  const name = nameOf(ctx, 'name');
  const { vnics: held, etherstubs: rows } = stateOf(ctx.host);
  if (!rows.some(row => row.name === name)) {
    return refusal(404, `Etherstub ${name} not found`);
  }
  if (held.some(vnic => vnic.over === name) && ctx.url.searchParams.get('force') !== 'true') {
    return refusal(400, `Etherstub ${name} still carries VNICs; delete them first or force`);
  }
  return queued({
    ctx,
    operation: 'etherstub_delete',
    message: `Etherstub deletion task created for ${name}`,
    metadata: { name },
  });
};

const afterEtherstubDelete = (host, task) => {
  const state = stateOf(host);
  state.etherstubs = state.etherstubs.filter(row => row.name !== task.metadata.name);
};

const bridges = ctx => {
  const rows = stateOf(ctx.host).bridges;
  return ok({ bridges: rows, returned: rows.length, source: 'live' });
};

const bridgeShown = ctx => {
  const name = nameOf(ctx, 'name');
  const row = stateOf(ctx.host).bridges.find(entry => entry.name === name);
  if (!row) {
    return refusal(404, `Bridge ${name} not found`);
  }
  return ok({
    bridge: row,
    links: row.links.map(link => ({ link, state: 'forwarding' })),
    forwarding: [{ dest: '02:08:20:aa:bb:00', link: row.links[0] || NO_LINK, age: 12 }],
  });
};

const bridgeCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name) {
    return refusal(400, 'name is required');
  }
  if (stateOf(host).bridges.some(row => row.name === body.name)) {
    return refusal(409, `Bridge ${body.name} already exists`);
  }
  return queued({
    ctx,
    operation: 'bridge_create',
    message: `Bridge creation task created for ${body.name}`,
    metadata: {
      bridge: {
        name: body.name,
        protection: body.protection || 'stp',
        priority: Number(body.priority) || 32768,
        links: Array.isArray(body.links) ? body.links : [],
        max_age: Number(body.max_age) || 20,
        hello_time: Number(body.hello_time) || 2,
        forward_delay: Number(body.forward_delay) || 15,
      },
    },
  });
};

const afterBridgeCreate = (host, task) => {
  const state = stateOf(host);
  state.bridges = [...state.bridges, task.metadata.bridge];
};

const bridgeDeleted = ctx => {
  const name = nameOf(ctx, 'name');
  if (!stateOf(ctx.host).bridges.some(row => row.name === name)) {
    return refusal(404, `Bridge ${name} not found`);
  }
  return queued({
    ctx,
    operation: 'bridge_delete',
    message: `Bridge deletion task created for ${name}`,
    metadata: { name },
  });
};

const afterBridgeDelete = (host, task) => {
  const state = stateOf(host);
  state.bridges = state.bridges.filter(row => row.name !== task.metadata.name);
};

const aggregates = ctx => {
  const rows = stateOf(ctx.host).aggregates;
  return ok({ aggregates: rows, returned: rows.length, source: 'live' });
};

const aggregateShown = ctx => {
  const name = nameOf(ctx, 'name');
  const row = stateOf(ctx.host).aggregates.find(entry => entry.name === name);
  if (!row) {
    return refusal(404, `Aggregate ${name} not found`);
  }
  const lacp = ctx.url.searchParams.get('lacp') === 'true';
  return ok({
    aggregate: row,
    ...(lacp
      ? {
          lacp: {
            activity: row.lacp_mode,
            timeout: row.lacp_timer,
            aggregation: 'yes',
            synchronization: 'yes',
          },
        }
      : {}),
  });
};

const aggregateCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name || !Array.isArray(body.links) || body.links.length === 0) {
    return refusal(400, 'name and at least one link are required');
  }
  if (stateOf(host).aggregates.some(row => row.name === body.name)) {
    return refusal(409, `Aggregate ${body.name} already exists`);
  }
  if (stateOf(host).cdp === 'online') {
    return refusal(
      400,
      'CDP is running; disable svc:/network/cdp:default before creating an aggregate'
    );
  }
  return queued({
    ctx,
    operation: 'aggregate_create',
    message: `Aggregate creation task created for ${body.name}`,
    metadata: {
      aggregate: {
        name: body.name,
        policy: body.policy || 'L4',
        links: body.links,
        over: body.links.join(','),
        state: 'up',
        lacp_mode: body.lacp_mode || 'off',
        lacp_timer: body.lacp_timer || 'short',
        mtu: 1500,
        class: 'aggr',
        ...(body.unicast_address ? { macaddress: body.unicast_address, macaddrtype: 'fixed' } : {}),
      },
    },
  });
};

const afterAggregateCreate = (host, task) => {
  const state = stateOf(host);
  state.aggregates = [...state.aggregates, task.metadata.aggregate];
};

const aggregateDeleted = ctx => {
  const name = nameOf(ctx, 'name');
  if (!stateOf(ctx.host).aggregates.some(row => row.name === name)) {
    return refusal(404, `Aggregate ${name} not found`);
  }
  return queued({
    ctx,
    operation: 'aggregate_delete',
    message: `Aggregate deletion task created for ${name}`,
    metadata: { name },
  });
};

const afterAggregateDelete = (host, task) => {
  const state = stateOf(host);
  state.aggregates = state.aggregates.filter(row => row.name !== task.metadata.name);
};

const services = ctx => {
  const pattern = ctx.url.searchParams.get('pattern') || '';
  const rows = [
    { fmri: CDP_FMRI, state: stateOf(ctx.host).cdp, stime: iso(Date.now() - 20 * MINUTE_MS) },
    { fmri: 'svc:/network/ssh:default', state: 'online', stime: iso(Date.now() - 30 * MINUTE_MS) },
  ];
  return ok(pattern ? rows.filter(row => row.fmri.includes(pattern)) : rows);
};

const serviceAction = ctx => {
  const { host, body } = ctx;
  const fmri = decodeURIComponent(body.fmri || '');
  if (fmri !== CDP_FMRI) {
    return refusal(404, `Service ${fmri} not found`);
  }
  if (!['enable', 'disable', 'restart'].includes(body.action)) {
    return refusal(400, 'action must be enable, disable or restart');
  }
  stateOf(host).cdp = body.action === 'disable' ? 'disabled' : 'online';
  return ok({ success: true, message: `Service ${fmri} ${body.action}d`, fmri });
};

const hostname = ctx => {
  const held = stateOf(ctx.host).hostname;
  return ok({
    hostname: held.hostname,
    nodename_file: held.nodename,
    system_hostname: held.hostname,
    matches: held.hostname === held.nodename,
    ...(held.pending ? { pending_hostname: held.pending } : {}),
  });
};

const hostnameSet = ctx => {
  const { host, body } = ctx;
  if (!body.hostname) {
    return refusal(400, 'hostname is required');
  }
  const held = stateOf(host).hostname;
  held.nodename = body.hostname;
  if (body.apply_immediately) {
    held.hostname = body.hostname;
    held.pending = '';
  } else {
    held.pending = body.hostname;
  }
  return ok({
    success: true,
    hostname: body.hostname,
    applied: Boolean(body.apply_immediately),
    message: body.apply_immediately
      ? `Hostname changed to ${body.hostname}`
      : `Hostname change to ${body.hostname} takes effect at the next reboot`,
  });
};

const dnsRaw = dns =>
  [
    ...(dns.domain ? [`domain ${dns.domain}`] : []),
    ...dns.nameservers.map(server => `nameserver ${server}`),
    ...(dns.search_domains.length > 0 ? [`search ${dns.search_domains.join(' ')}`] : []),
    ...dns.options.map(option => `options ${option}`),
    '',
  ].join('\n');

const dnsParsed = raw => {
  const lines = String(raw).split('\n');
  const wordsAfter = word =>
    lines
      .filter(line => line.startsWith(`${word} `))
      .flatMap(line =>
        line
          .slice(word.length + 1)
          .trim()
          .split(/\s+/u)
      );
  return {
    nameservers: wordsAfter('nameserver'),
    search_domains: wordsAfter('search'),
    domain: wordsAfter('domain')[0] || '',
    options: wordsAfter('options'),
  };
};

const dns = ctx => {
  const held = stateOf(ctx.host).dns;
  return ok({ ...held, raw: dnsRaw(held) });
};

const dnsSet = ctx => {
  const { host, body } = ctx;
  const state = stateOf(host);
  if (typeof body.raw === 'string') {
    state.dns = dnsParsed(body.raw);
  } else {
    state.dns = {
      nameservers: Array.isArray(body.nameservers) ? body.nameservers : [],
      search_domains: Array.isArray(body.search_domains) ? body.search_domains : [],
      domain: body.domain || '',
      options: Array.isArray(body.options) ? body.options : [],
    };
  }
  return ok({
    success: true,
    message: 'DNS configuration written',
    backup: `/etc/resolv.conf.${iso(Date.now()).replace(/[-:.]/gu, '').slice(0, 14)}`,
  });
};

const hostsRaw = entries =>
  `${entries.map(entry => `${entry.ip}\t${entry.hostnames.join(' ')}`).join('\n')}\n`;

const hostsParsed = raw =>
  String(raw)
    .split('\n')
    .map(line => line.replace(/#.*$/u, '').trim())
    .filter(Boolean)
    .map(line => {
      const [ip, ...hostnames] = line.split(/\s+/u);
      return { ip, hostnames };
    });

const hostsFile = ctx => {
  const held = stateOf(ctx.host).hosts;
  return ok({ entries: held, raw: hostsRaw(held), path: '/etc/inet/hosts' });
};

const hostsFileSet = ctx => {
  const { host, body } = ctx;
  const state = stateOf(host);
  if (typeof body.raw === 'string') {
    state.hosts = hostsParsed(body.raw);
  } else if (Array.isArray(body.entries)) {
    state.hosts = body.entries.filter(entry => entry && entry.ip && Array.isArray(entry.hostnames));
  } else {
    return refusal(400, 'raw or entries is required');
  }
  return ok({
    success: true,
    message: 'Hosts file written',
    backup: `/etc/inet/hosts.${iso(Date.now()).replace(/[-:.]/gu, '').slice(0, 14)}`,
  });
};

const spacesShown = ctx => {
  const platform = platformOf(ctx.host);
  const rows = stateOf(ctx.host).spaces.filter(space => {
    if (space.type === 'hostonly') {
      return platform !== 'darwin';
    }
    if (space.type === 'hostonlynet') {
      return platform === 'darwin' || platform === null;
    }
    return true;
  });
  return ok({ spaces: rows, returned: rows.length });
};

const spaceOf = (host, type, name) =>
  stateOf(host).spaces.find(space => space.type === type && space.name === name) || null;

const nextHostOnlyName = host => {
  const taken = stateOf(host).spaces.filter(space => space.type === 'hostonly').length;
  return `vboxnet${taken}`;
};

const hostOnlyOf = (body, held) => ({
  type: 'hostonly',
  name: held?.name,
  ip_address: body.ip || held?.ip_address || '192.168.56.1',
  network_mask: body.netmask || held?.network_mask || '255.255.255.0',
  dhcp:
    body.dhcp === null
      ? { exists: false }
      : {
          ...(held?.dhcp || { exists: false }),
          ...(body.dhcp ? { exists: true, enabled: true, ...body.dhcp } : {}),
        },
});

const hostOnlyCreated = ctx => {
  const { host, body } = ctx;
  const state = stateOf(host);
  const space = { ...hostOnlyOf(body, null), name: nextHostOnlyName(host) };
  state.spaces = [...state.spaces, space];
  return ok({
    success: true,
    name: space.name,
    message: `Host-only interface ${space.name} created`,
  });
};

const spaceFound = (type, handler) => ctx => {
  const name = nameOf(ctx, 'name');
  const space = spaceOf(ctx.host, type, name);
  return space ? handler({ ...ctx, space }) : refusal(404, `${type} ${name} not found`);
};

const replaced = (host, held, next) => {
  const state = stateOf(host);
  state.spaces = state.spaces.map(space => (space === held ? next : space));
};

const hostOnlyModified = ctx => {
  const { host, body, space } = ctx;
  replaced(host, space, hostOnlyOf(body, space));
  return ok({
    success: true,
    name: space.name,
    message: `Host-only interface ${space.name} modified`,
  });
};

const spaceDeleted = ctx => {
  const { host, space } = ctx;
  const state = stateOf(host);
  state.spaces = state.spaces.filter(entry => entry !== space);
  return ok({ success: true, name: space.name, message: `${space.type} ${space.name} removed` });
};

const hostOnlyNetOf = (body, held) => ({
  type: 'hostonlynet',
  name: held?.name || body.name,
  network_mask: body.netmask || held?.network_mask,
  lower_ip: body.lower_ip || held?.lower_ip,
  upper_ip: body.upper_ip || held?.upper_ip,
  enabled: body.enabled === undefined ? held?.enabled !== false : Boolean(body.enabled),
});

const hostOnlyNetCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name) {
    return refusal(400, 'name is required');
  }
  if (spaceOf(host, 'hostonlynet', body.name)) {
    return refusal(409, `Host-only network ${body.name} already exists`);
  }
  const state = stateOf(host);
  state.spaces = [...state.spaces, hostOnlyNetOf(body, null)];
  return ok({ success: true, name: body.name, message: `Host-only network ${body.name} created` });
};

const hostOnlyNetModified = ctx => {
  const { host, body, space } = ctx;
  replaced(host, space, hostOnlyNetOf(body, space));
  return ok({
    success: true,
    name: space.name,
    message: `Host-only network ${space.name} modified`,
  });
};

const forwardsOf = (held, body) => {
  const removed = Array.isArray(body.remove_port_forwards) ? body.remove_port_forwards : [];
  const added = Array.isArray(body.add_port_forwards) ? body.add_port_forwards : [];
  return [
    ...(held?.port_forwards || []).filter(
      forward =>
        !removed.some(
          gone => gone.name === forward.name && Boolean(gone.ipv6) === Boolean(forward.ipv6)
        )
    ),
    ...added,
  ];
};

const natNetworkOf = (body, held) => ({
  type: 'natnetwork',
  name: held?.name || body.name,
  cidr: body.cidr || held?.cidr,
  gateway: held?.gateway || String(body.cidr || '').replace(/\.0\/\d+$/u, '.1'),
  enabled: body.enabled === undefined ? held?.enabled !== false : Boolean(body.enabled),
  dhcp_enabled: body.dhcp === undefined ? Boolean(held?.dhcp_enabled) : Boolean(body.dhcp),
  ipv6: body.ipv6 === undefined ? Boolean(held?.ipv6) : Boolean(body.ipv6),
  port_forwards: forwardsOf(held, body),
});

const natNetworkCreated = ctx => {
  const { host, body } = ctx;
  if (!body.name || !body.cidr) {
    return refusal(400, 'name and cidr are required');
  }
  if (spaceOf(host, 'natnetwork', body.name)) {
    return refusal(409, `NAT network ${body.name} already exists`);
  }
  const state = stateOf(host);
  state.spaces = [...state.spaces, natNetworkOf(body, null)];
  return ok({ success: true, name: body.name, message: `NAT network ${body.name} created` });
};

const natNetworkModified = ctx => {
  const { host, body, space } = ctx;
  replaced(host, space, natNetworkOf(body, space));
  return ok({ success: true, name: space.name, message: `NAT network ${space.name} modified` });
};

const SERVICE_WORDS = { start: 'started', stop: 'stopped' };

const natNetworkService = action => ctx => {
  const { host, space } = ctx;
  replaced(host, space, { ...space, enabled: action === 'start' });
  return ok({
    success: true,
    name: space.name,
    message: `NAT network ${space.name} ${SERVICE_WORDS[action]}`,
  });
};

const machineUsage = ctx => {
  const { host } = ctx;
  const at = Date.now();
  const rows = host.machines
    .filter(row => row.status === 'running')
    .map((row, index) => ({
      machine_name: row.name,
      nics: [
        {
          adapter: 1,
          rx_bps: Math.round(((Math.sin(at / 7000 + index) + 1.2) * 4000000) / 8),
          tx_bps: Math.round(((Math.cos(at / 9000 + index) + 1.1) * 1500000) / 8),
        },
      ],
      scan_timestamp: iso(at),
    }));
  return ok({ usage: rows, returnedCount: rows.length });
};

const zoneOnly = handler => ctx => (isZone(ctx.host) ? handler(ctx) : problem(404, 'Not Found'));

const vbox = handler => ctx =>
  hypervisorsOf(ctx.host).includes('virtualbox') || hypervisorsOf(ctx.host).includes('utm')
    ? handler(ctx)
    : problem(404, 'Not Found');

/**
 * The networking page's reads and writes, each route answered as the
 * agent of the host's kind answers it and 404 on a host that does not
 * list its tokens. The monitoring reads: the IP addresses behind
 * `monitoring`, the rows of two scans on the zoneweaver kind and the
 * live rows on the hyperweaver kind; the routing table on the
 * zoneweaver kind alone. The management, hyperweaver-ui's calls the
 * truth of every body: `network/addresses` behind `ip-addresses` or
 * `vnics`, the create, the delete with `address` for one of several
 * under one object, the enable and the disable, each a queued task on
 * the zoneweaver kind that changes the list when it ends and an answer
 * at once on the hyperweaver kind, whose disable carries `note`; the
 * VNICs, the VLANs, the etherstubs, the bridges and the aggregates
 * behind `vnics`, each list, one row's details and a create and a
 * delete that queue a task on the target `system`; `services` with
 * `pattern=cdp` and `services/action`, the CDP service refusing an
 * aggregate while online; the hostname behind `hostname` or `vnics`,
 * `apply_immediately` moving it now and the next reboot otherwise; the
 * DNS behind `dns` or `vnics` and the hosts file behind `hosts-file`,
 * the raw file winning over the parsed members, each answering the
 * backup it wrote; the network spaces behind `network-spaces`, the
 * host-only interfaces named by VirtualBox, the host-only networks, the
 * NAT networks with their forwards and the internal networks, the
 * families the host's platform draws, and the NAT service's start and
 * stop; and `monitoring/machines/usage` behind `monitoring` and
 * `network-spaces`, one row a running machine with its adapters' rates.
 * `GET network/vnics` answers here, before the machine settings' route
 * of the same path, so the list a create changes is the one the
 * settings' NIC editor reads too.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountNetworking = agentRoute => {
  const monitoring = ['monitoring'];
  const addressed = ['ip-addresses', 'vnics'];
  const vnic = handler => zoneOnly(behind(['vnics'], handler));
  const spaces = handler => vbox(behind(['network-spaces'], handler));
  settles('ip_address_create', afterAddressCreate);
  settles('ip_address_delete', afterAddressDelete);
  settles('ip_address_enable', afterAddressToggle('enable'));
  settles('ip_address_disable', afterAddressToggle('disable'));
  settles('vnic_create', afterVnicCreate);
  settles('vnic_delete', afterVnicDelete);
  settles('vlan_create', afterVlanCreate);
  settles('vlan_delete', afterVlanDelete);
  settles('etherstub_create', afterEtherstubCreate);
  settles('etherstub_delete', afterEtherstubDelete);
  settles('bridge_create', afterBridgeCreate);
  settles('bridge_delete', afterBridgeDelete);
  settles('aggregate_create', afterAggregateCreate);
  settles('aggregate_delete', afterAggregateDelete);
  agentRoute('GET', 'monitoring/network/ipaddresses', behind(monitoring, monitoringAddresses));
  agentRoute('GET', 'monitoring/network/routes', behind(monitoring, routes));
  agentRoute('GET', 'monitoring/machines/usage', spaces(behind(monitoring, machineUsage)));
  agentRoute('GET', 'network/addresses', behindAny(addressed, addresses));
  agentRoute('POST', 'network/addresses', behindAny(addressed, addressCreated));
  agentRoute('DELETE', 'network/addresses/:addrobj', behindAny(addressed, addressDeleted));
  agentRoute(
    'PUT',
    'network/addresses/:addrobj/enable',
    behindAny(addressed, addressToggled('enable'))
  );
  agentRoute(
    'PUT',
    'network/addresses/:addrobj/disable',
    behindAny(addressed, addressToggled('disable'))
  );
  agentRoute('GET', 'network/vnics', vnic(vnics));
  agentRoute('POST', 'network/vnics', vnic(vnicCreated));
  agentRoute('GET', 'network/vnics/:link', vnic(vnicShown));
  agentRoute('DELETE', 'network/vnics/:link', vnic(vnicDeleted));
  agentRoute('GET', 'network/vlans', vnic(vlans));
  agentRoute('POST', 'network/vlans', vnic(vlanCreated));
  agentRoute('GET', 'network/vlans/:link', vnic(vlanShown));
  agentRoute('DELETE', 'network/vlans/:link', vnic(vlanDeleted));
  agentRoute('GET', 'network/etherstubs', vnic(etherstubs));
  agentRoute('POST', 'network/etherstubs', vnic(etherstubCreated));
  agentRoute('GET', 'network/etherstubs/:name', vnic(etherstubShown));
  agentRoute('DELETE', 'network/etherstubs/:name', vnic(etherstubDeleted));
  agentRoute('GET', 'network/bridges', vnic(bridges));
  agentRoute('POST', 'network/bridges', vnic(bridgeCreated));
  agentRoute('GET', 'network/bridges/:name', vnic(bridgeShown));
  agentRoute('DELETE', 'network/bridges/:name', vnic(bridgeDeleted));
  agentRoute('GET', 'network/aggregates', vnic(aggregates));
  agentRoute('POST', 'network/aggregates', vnic(aggregateCreated));
  agentRoute('GET', 'network/aggregates/:name', vnic(aggregateShown));
  agentRoute('DELETE', 'network/aggregates/:name', vnic(aggregateDeleted));
  agentRoute('GET', 'services', vnic(services));
  agentRoute('POST', 'services/action', vnic(serviceAction));
  agentRoute('GET', 'network/hostname', behindAny(['hostname', 'vnics'], hostname));
  agentRoute('PUT', 'network/hostname', behindAny(['hostname', 'vnics'], hostnameSet));
  agentRoute('GET', 'system/dns', behindAny(['dns', 'vnics'], dns));
  agentRoute('PUT', 'system/dns', behindAny(['dns', 'vnics'], dnsSet));
  agentRoute('GET', 'system/hosts', behind(['hosts-file'], hostsFile));
  agentRoute('PUT', 'system/hosts', behind(['hosts-file'], hostsFileSet));
  agentRoute('GET', 'network/spaces', spaces(spacesShown));
  agentRoute('POST', 'network/spaces/hostonly', spaces(hostOnlyCreated));
  agentRoute(
    'PUT',
    'network/spaces/hostonly/:name',
    spaces(spaceFound('hostonly', hostOnlyModified))
  );
  agentRoute(
    'DELETE',
    'network/spaces/hostonly/:name',
    spaces(spaceFound('hostonly', spaceDeleted))
  );
  agentRoute('POST', 'network/spaces/hostonlynet', spaces(hostOnlyNetCreated));
  agentRoute(
    'PUT',
    'network/spaces/hostonlynet/:name',
    spaces(spaceFound('hostonlynet', hostOnlyNetModified))
  );
  agentRoute(
    'DELETE',
    'network/spaces/hostonlynet/:name',
    spaces(spaceFound('hostonlynet', spaceDeleted))
  );
  agentRoute('POST', 'network/spaces/natnetwork', spaces(natNetworkCreated));
  agentRoute(
    'PUT',
    'network/spaces/natnetwork/:name',
    spaces(spaceFound('natnetwork', natNetworkModified))
  );
  agentRoute(
    'DELETE',
    'network/spaces/natnetwork/:name',
    spaces(spaceFound('natnetwork', spaceDeleted))
  );
  agentRoute(
    'POST',
    'network/spaces/natnetwork/:name/start',
    spaces(spaceFound('natnetwork', natNetworkService('start')))
  );
  agentRoute(
    'POST',
    'network/spaces/natnetwork/:name/stop',
    spaces(spaceFound('natnetwork', natNetworkService('stop')))
  );
};
