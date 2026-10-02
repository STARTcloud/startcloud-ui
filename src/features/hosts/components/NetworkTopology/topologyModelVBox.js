const HEADER_LINK = 'LINK';

export const vboxModeForKind = {
  bridged: 'bridged',
  hostonly: 'hostonly',
  hostonlynet: 'hostonlynet',
  internal: 'intnet',
  natnetwork: 'natnetwork',
  nat: 'nat',
};

const MODE_TARGETS = {
  bridged: name => ({ id: `bridged|${name}`, kind: 'bridged', carrier: name }),
  hostonly: name => ({ id: `space|hostonly|${name}`, kind: 'hostonly', carrier: name }),
  hostonlynetwork: name => ({
    id: `space|hostonlynet|${name}`,
    kind: 'hostonlynet',
    carrier: name,
  }),
  hostonlynet: name => ({ id: `space|hostonlynet|${name}`, kind: 'hostonlynet', carrier: name }),
  intnet: name => ({ id: `space|intnet|${name}`, kind: 'internal', carrier: name }),
  natnetwork: name => ({ id: `space|natnetwork|${name}`, kind: 'natnetwork', carrier: name }),
  nat: () => ({ id: 'nat|shared', kind: 'nat', carrier: 'nat' }),
};

const vboxNetworkId = nic => {
  const mode = (nic.mode || '').toLowerCase();
  const name = nic.network || 'unknown';
  const target = MODE_TARGETS[mode];
  return target
    ? target(name)
    : { id: `mode|${mode || 'none'}`, kind: 'internal', carrier: mode || 'none' };
};

const spaceDetail = space => {
  if (space.type === 'hostonly') {
    return [space.ip_address, space.network_mask, space.dhcp?.enabled ? 'dhcp' : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (space.type === 'hostonlynet') {
    return [
      space.network_mask,
      space.lower_ip && space.upper_ip ? `${space.lower_ip}–${space.upper_ip}` : null,
      space.enabled === false ? 'disabled' : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (space.type === 'natnetwork') {
    return [space.cidr, space.gateway, space.dhcp_enabled ? 'dhcp' : null]
      .filter(Boolean)
      .join(' · ');
  }
  return null;
};

const usageMapOf = (usage, liveLinks) => {
  const usageByLink = new Map();
  const staleUsageLinks = [];
  usage.forEach(row => {
    if (!row.link) {
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

const consumerOf = ({
  row,
  machineDetails,
  machineUsage,
  ensureNetwork,
  switches,
  usageByLink,
}) => {
  const status = (row.status || row.state || '').toLowerCase();
  const detail = machineDetails.get(row.name);
  const nicRows = Array.isArray(detail?.knob_current?.devices?.nics)
    ? detail.knob_current.devices.nics
    : [];
  const adapterUsage = machineUsage.get(row.name) || new Map();
  const nics = nicRows.map(nic => {
    const target = vboxNetworkId(nic);
    const net = ensureNetwork(target);
    net.live += 1;
    net.members.push({ link: `${row.name}#${nic.adapter}`, zone: row.name });
    const swtch = switches.find(s => s.id === target.carrier);
    if (swtch) {
      swtch.ports += 1;
    }
    return {
      link: `adapter ${nic.adapter}`,
      adapter: nic.adapter,
      over: target.carrier,
      vlanId: 0,
      mode: (nic.mode || '').toLowerCase(),
      mac: nic.mac || null,
      mtu: null,
      networkId: target.id,
      ghost: false,
      usage: adapterUsage.get(String(nic.adapter)) || null,
    };
  });
  nics.forEach(nic => {
    if (nic.usage) {
      usageByLink.set(`${row.name}#${nic.adapter}`, nic.usage);
    }
  });
  return {
    id: row.name,
    name: row.name,
    type: 'machine',
    status: status || 'unknown',
    running: status === 'running',
    ghostOnly: false,
    nics,
  };
};

/**
 * A VirtualBox host's topology graph, hyperweaver-ui's builder: the
 * machines' structured NIC rows, `knob_current.devices.nics` with their
 * `network`, against the host's network spaces, the same shape as
 * `buildHostGraph` so the renderer never branches. A bridged carrier
 * whose VirtualBox network name matches no monitored interface gets a
 * synthesized adapter, state unknown, so its wires still land.
 *
 * @param {Object} input - The interfaces, spaces, machines, their details, the usage samples, the per-machine usage and the addresses
 * @returns {Object} The graph
 */
export const buildVBoxGraph = ({
  interfaces = [],
  spaces = [],
  machines = [],
  machineDetails = new Map(),
  usage = [],
  machineUsage = new Map(),
  ipAddresses = [],
}) => {
  const physRows = interfaces.filter(
    row => row.class === 'phys' && row.link && row.link !== HEADER_LINK
  );
  const liveLinks = new Set(physRows.map(row => row.link));
  const { usageByLink, staleUsageLinks } = usageMapOf(usage, liveLinks);
  const feedPresent = usage.length > 0 || machineUsage.size > 0;
  const ipsByLink = ipsMapOf(ipAddresses);

  const adapters = physRows.map(row => ({
    id: row.link,
    name: row.link,
    kind: 'phys',
    state: row.state || 'unknown',
    speedMbps: parseInt(row.speed, 10) || 0,
    mtu: parseInt(row.mtu, 10) || null,
    members: [],
    memberOf: null,
    ips: ipsByLink.get(row.link) || [],
    usage: usageByLink.get(row.link) || null,
  }));

  const networks = new Map();
  const ensureNetwork = ({ id, kind, carrier, detail = null }) => {
    if (!networks.has(id)) {
      networks.set(id, {
        id,
        carrier,
        carrierKind: kind === 'bridged' ? 'phys' : 'space',
        vlanId: 0,
        kind,
        detail,
        live: 0,
        planned: 0,
        members: [],
      });
    }
    return networks.get(id);
  };

  spaces.forEach(space => {
    ensureNetwork({
      id: `space|${space.type}|${space.name}`,
      kind: space.type === 'intnet' ? 'internal' : space.type,
      carrier: space.name,
      detail: spaceDetail(space),
    });
  });

  const switches = spaces.map(space => ({
    id: space.name,
    name: space.name,
    state: space.enabled === false ? 'down' : 'up',
    mtu: null,
    ports: 0,
    usage: null,
  }));
  switches.push({ id: 'nat', name: 'NAT', state: 'up', mtu: null, ports: 0, usage: null });

  const consumers = machines
    .filter(row => row.name)
    .map(row =>
      consumerOf({ row, machineDetails, machineUsage, ensureNetwork, switches, usageByLink })
    );

  [...networks.values()]
    .filter(net => net.carrierKind === 'phys' && !adapters.some(a => a.id === net.carrier))
    .forEach(net => {
      adapters.push({
        id: net.carrier,
        name: net.carrier,
        kind: 'phys',
        state: 'unknown',
        speedMbps: 0,
        mtu: null,
        members: [],
        memberOf: null,
        ips: [],
        usage: usageByLink.get(net.carrier) || null,
      });
    });

  const networkList = [...networks.values()].map(net => {
    const memberUsage = net.members.reduce(
      (acc, member) => {
        const rates = usageByLink.get(member.link);
        acc.rxMbps += rates?.rxMbps || 0;
        acc.txMbps += rates?.txMbps || 0;
        return acc;
      },
      { rxMbps: 0, txMbps: 0 }
    );
    if (net.kind === 'bridged') {
      return { ...net, usage: usageByLink.get(net.carrier) || memberUsage };
    }
    return { ...net, usage: machineUsage.size > 0 ? memberUsage : null };
  });

  return {
    feedPresent,
    adapters,
    switches: switches.filter(s => s.ports > 0 || s.id !== 'nat'),
    networks: networkList,
    consumers,
    usageByLink,
    issues: {
      downAdapters: adapters.filter(a => a.state === 'down'),
      emptySwitches: switches.filter(s => s.ports === 0 && s.id !== 'nat'),
      unassignedVnics: [],
      staleUsageLinks: [...new Set(staleUsageLinks)],
      disconnectedMachines: consumers.filter(c => c.running && c.nics.length === 0),
    },
  };
};

export default buildVBoxGraph;
