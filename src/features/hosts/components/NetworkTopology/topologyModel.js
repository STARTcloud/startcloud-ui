const HEADER_LINK = 'LINK';

const HEADER_PACKETS = 'IPACKETS';

const NO_ZONE = '--';

const OCTET = 255;

const OCTETS = 4;

const PREFIX_MAX = 32;

const asArray = value => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
};

const parseConfig = raw => {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
};

const isGlobalZone = zone => !zone || zone === NO_ZONE || zone.toLowerCase() === 'global';

const networkKey = (carrier, vid) => `${carrier}|${Number(vid) || 0}`;

const networkKind = (carrierKind, vid) => {
  if (carrierKind === 'etherstub') {
    return 'internal';
  }
  return Number(vid) > 0 ? 'vlan' : 'untagged';
};

const usageMapOf = (usage, liveLinks) => {
  const usageByLink = new Map();
  const staleUsageLinks = [];
  usage.forEach(row => {
    if (!row.link || row.ipackets === HEADER_PACKETS) {
      return;
    }
    if (!liveLinks.has(row.link)) {
      staleUsageLinks.push(row.link);
      return;
    }
    usageByLink.set(row.link, {
      rxMbps: parseFloat(row.rx_mbps) || 0,
      txMbps: parseFloat(row.tx_mbps) || 0,
      speedMbps: parseFloat(row.interface_speed_mbps) || 0,
    });
  });
  return { usageByLink, staleUsageLinks };
};

const ipsMapOf = ipAddresses => {
  const ipsByLink = new Map();
  ipAddresses.forEach(row => {
    if (!row.interface || !row.ip_address) {
      return;
    }
    if (!ipsByLink.has(row.interface)) {
      ipsByLink.set(row.interface, []);
    }
    ipsByLink.get(row.interface).push(row);
  });
  return ipsByLink;
};

const adaptersOf = ({ aggregates, physRows, ipsByLink, usageByLink }) => {
  const adapters = [];
  aggregates.forEach(row => {
    const members = (row.over || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => {
        const phys = physRows.find(p => p.link === name);
        return { name, state: phys?.state || 'unknown', speed: parseInt(phys?.speed, 10) || 0 };
      });
    adapters.push({
      id: row.link,
      name: row.link,
      kind: 'aggr',
      state: row.state || 'unknown',
      speedMbps: members.reduce((sum, m) => sum + (m.speed || 0), 0),
      mtu: parseInt(row.mtu, 10) || null,
      members,
      policy: row.policy || null,
      lacpActivity: row.lacp_activity || null,
      ips: ipsByLink.get(row.link) || [],
      usage: usageByLink.get(row.link) || null,
    });
  });
  physRows.forEach(row => {
    adapters.push({
      id: row.link,
      name: row.link,
      kind: 'phys',
      state: row.state || 'unknown',
      speedMbps: parseInt(row.speed, 10) || 0,
      mtu: parseInt(row.mtu, 10) || null,
      members: [],
      memberOf: adapters.find(a => a.members.some(m => m.name === row.link))?.id || null,
      ips: ipsByLink.get(row.link) || [],
      usage: usageByLink.get(row.link) || null,
    });
  });
  return adapters;
};

const ghostNicsOf = ({ row, name, liveNames, buildNic }) =>
  asArray(parseConfig(row.configuration).net)
    .filter(net => net && (net.physical || net['global-nic']))
    .filter(net => !liveNames.has(net.physical))
    .map(net =>
      buildNic(
        {
          link: net.physical || `${name}-planned`,
          over: net['global-nic'] || net.over || 'unknown',
          vid: net['vlan-id'] || 0,
          macaddress: net['mac-addr'] || null,
          zone: name,
          synthetic: !net.physical,
        },
        true
      )
    );

/**
 * One host's topology graph from the rows the networking page holds,
 * hyperweaver-ui's pure builder: no fetching, no React, the same rows in
 * give the same graph out. `adapters` are the physical links and the
 * aggregates with their members, `switches` the etherstubs with their
 * port counts, `networks` one per carrier and VLAN id with live and
 * planned counts, `consumers` the machines and the global zone each with
 * its NICs, a NIC named by a zone's configuration and not yet live drawn
 * as a ghost, `usageByLink` the rates of the links that exist and
 * `issues` what the debug lens counts.
 *
 * @param {Object} input - The interfaces, aggregates, etherstubs, VNICs, machines, usage samples and addresses
 * @returns {Object} The graph
 */
export const buildHostGraph = ({
  interfaces = [],
  aggregates = [],
  etherstubs = [],
  vnics = [],
  machines = [],
  usage = [],
  ipAddresses = [],
}) => {
  const physRows = interfaces.filter(
    row => row.class === 'phys' && row.link && row.link !== HEADER_LINK
  );
  const stubRows = [
    ...etherstubs.map(row => ({ ...row, link: row.name })),
    ...interfaces.filter(row => row.class === 'stub' || row.class === 'etherstub'),
  ].filter(
    (row, index, all) => row.link && all.findIndex(other => other.link === row.link) === index
  );
  const vnicRows = vnics.filter(row => row.link && row.link !== HEADER_LINK);

  const liveLinks = new Set([
    ...physRows.map(row => row.link),
    ...stubRows.map(row => row.link),
    ...vnicRows.map(row => row.link),
    ...aggregates.map(row => row.link),
  ]);

  const { usageByLink, staleUsageLinks } = usageMapOf(usage, liveLinks);
  const feedPresent = usage.length > 0;
  const ipsByLink = ipsMapOf(ipAddresses);
  const adapters = adaptersOf({ aggregates, physRows, ipsByLink, usageByLink });

  const switches = stubRows.map(row => ({
    id: row.link,
    name: row.link,
    state: row.state || 'unknown',
    mtu: parseInt(row.mtu, 10) || null,
    ports: vnicRows.filter(v => v.over === row.link).length,
    usage: usageByLink.get(row.link) || null,
  }));

  const carrierKindOf = name => {
    if (switches.some(s => s.id === name)) {
      return 'etherstub';
    }
    if (adapters.some(a => a.id === name && a.kind === 'aggr')) {
      return 'aggr';
    }
    return 'phys';
  };

  const networks = new Map();
  const touchNetwork = (carrier, vid, { live = 0, planned = 0, member = null }) => {
    const key = networkKey(carrier, vid);
    if (!networks.has(key)) {
      const carrierKind = carrierKindOf(carrier);
      networks.set(key, {
        id: key,
        carrier,
        carrierKind,
        vlanId: Number(vid) || 0,
        kind: networkKind(carrierKind, vid),
        live: 0,
        planned: 0,
        members: [],
      });
    }
    const net = networks.get(key);
    net.live += live;
    net.planned += planned;
    if (member) {
      net.members.push(member);
    }
    return net;
  };

  const vnicsByZone = new Map();
  vnicRows.forEach(row => {
    const zone = isGlobalZone(row.zone) ? 'global' : row.zone;
    if (!vnicsByZone.has(zone)) {
      vnicsByZone.set(zone, []);
    }
    vnicsByZone.get(zone).push(row);
  });

  const buildNic = (row, ghost) => {
    const netId = networkKey(row.over, row.vid);
    if (ghost) {
      touchNetwork(row.over, row.vid, { planned: 1 });
    } else {
      touchNetwork(row.over, row.vid, { live: 1, member: { link: row.link, zone: row.zone } });
    }
    return {
      link: row.link,
      over: row.over,
      vlanId: Number(row.vid) || 0,
      mac: row.macaddress || row['mac-addr'] || null,
      mtu: parseInt(row.mtu, 10) || null,
      networkId: netId,
      ghost,
      synthetic: Boolean(row.synthetic),
      usage: ghost ? null : usageByLink.get(row.link) || null,
    };
  };

  const consumers = machines
    .filter(row => row.name || row.zonename)
    .map(row => {
      const name = row.name || row.zonename;
      const status = (row.status || row.state || '').toLowerCase();
      const running = status === 'running';
      const liveNics = (vnicsByZone.get(name) || []).map(v => buildNic(v, false));
      const liveNames = new Set(liveNics.map(nic => nic.link));
      const ghostNics = ghostNicsOf({ row, name, liveNames, buildNic });
      return {
        id: name,
        name,
        type: 'machine',
        status: status || 'unknown',
        running,
        ghostOnly: !running && liveNics.length === 0,
        nics: [...liveNics, ...ghostNics],
      };
    });

  const globalVnics = (vnicsByZone.get('global') || []).map(v => buildNic(v, false));
  if (globalVnics.length > 0) {
    consumers.push({
      id: 'global',
      name: 'global',
      type: 'global',
      status: 'running',
      running: true,
      ghostOnly: false,
      nics: globalVnics,
    });
  }

  const networkList = [...networks.values()].map(net => ({
    ...net,
    usage: net.members.reduce(
      (acc, member) => {
        const memberUsage = usageByLink.get(member.link);
        acc.rxMbps += memberUsage?.rxMbps || 0;
        acc.txMbps += memberUsage?.txMbps || 0;
        return acc;
      },
      { rxMbps: 0, txMbps: 0 }
    ),
  }));

  const issues = {
    downAdapters: adapters.filter(a => a.kind === 'phys' && !a.memberOf && a.state === 'down'),
    emptySwitches: switches.filter(s => s.ports === 0),
    unassignedVnics: vnicRows.filter(v => isGlobalZone(v.zone)).map(v => v.link),
    staleUsageLinks: [...new Set(staleUsageLinks)],
    disconnectedMachines: consumers.filter(
      c => c.type === 'machine' && c.running && c.nics.length === 0
    ),
  };

  return {
    feedPresent,
    adapters,
    switches,
    networks: networkList,
    consumers,
    usageByLink,
    issues,
  };
};

const ipv4SubnetOf = row => {
  if (!row?.ip_address || !row.prefix_length || (row.ip_version || 'v4') !== 'v4') {
    return null;
  }
  const parts = row.ip_address.split('.').map(Number);
  if (parts.length !== OCTETS || parts.some(Number.isNaN)) {
    return null;
  }
  const len = Number(row.prefix_length);
  if (!len || len < 1 || len > PREFIX_MAX) {
    return null;
  }
  const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = len === PREFIX_MAX ? 0xffffffff : (0xffffffff << (PREFIX_MAX - len)) >>> 0;
  const net = (ipInt & mask) >>> 0;
  return `${(net >>> 24) & OCTET}.${(net >>> 16) & OCTET}.${(net >>> 8) & OCTET}.${net & OCTET}/${len}`;
};

/**
 * The networks two or more hosts share, on subnet evidence alone,
 * hyperweaver-ui's rule: the same VLAN id and IPv4 subnet, the subnet
 * read from the carrier's own addresses, on two or more hosts; a VLAN
 * without a host address carries no evidence and is never merged.
 *
 * @param {Array<{ server: Object, graph: Object }>} hosts - The hosts drawn
 * @returns {Array<{ key: string, subnet: string, vlanId: number, hosts: Array<string>, refs: Array<Object> }>} The shared networks
 */
export const detectSharedNetworks = hosts => {
  const byKey = new Map();
  hosts.forEach(({ server, graph }) => {
    const hostName = server.entity_name || server.hostname;
    const hostKey = String(server.id);
    graph.networks.forEach(net => {
      const carrier = graph.adapters.find(a => a.id === net.carrier);
      const subnets = (carrier?.ips || []).map(ipv4SubnetOf).filter(Boolean);
      subnets.forEach(subnet => {
        const key = `${net.vlanId}|${subnet}`;
        if (!byKey.has(key)) {
          byKey.set(key, { key, subnet, vlanId: net.vlanId, hosts: [], refs: [] });
        }
        const entry = byKey.get(key);
        if (!entry.hosts.includes(hostName)) {
          entry.hosts.push(hostName);
        }
        entry.refs.push({ hostKey, netId: net.id });
      });
    });
  });
  return [...byKey.values()].filter(entry => entry.hosts.length > 1);
};

/**
 * One machine's slice of a host graph, the paths it alone owns; null
 * for a machine with no NIC.
 *
 * @param {Object} graph - The graph of `buildHostGraph`
 * @param {string} machineName - The machine
 * @returns {Object|null} The reduced graph
 */
export const sliceForMachine = (graph, machineName) => {
  const consumer = graph.consumers.find(c => c.id === machineName);
  if (!consumer || consumer.nics.length === 0) {
    return null;
  }
  const netIds = new Set(consumer.nics.map(nic => nic.networkId));
  const carriers = new Set(consumer.nics.map(nic => nic.over));
  return {
    ...graph,
    consumers: [consumer],
    networks: graph.networks.filter(net => netIds.has(net.id)),
    adapters: graph.adapters.filter(
      a => carriers.has(a.id) || a.members.some(m => carriers.has(m.name))
    ),
    switches: graph.switches.filter(s => carriers.has(s.id)),
  };
};
