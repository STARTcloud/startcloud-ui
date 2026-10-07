import { isGap } from '../../charts/splice';
import { networkRates, timeOf } from '../../utils/series';

const TITLE_KEYS = {
  internal: 'hostTools.topology.internalNetwork',
  bridged: 'hostTools.topology.bridgedNetwork',
  hostonly: 'hostTools.topology.hostOnlyNetwork',
  hostonlynet: 'hostTools.topology.hostOnlyNetNetwork',
  natnetwork: 'hostTools.topology.natNetwork',
};

const KEY_BAR = ':';

const LINK_SOURCE = 'link';

const ADAPTER_SOURCE = 'adapter';

const NO_RATE = { rx: 0, tx: 0 };

const OCTET = 255;

const OCTETS = 4;

const PREFIX_MAX = 32;

const ROUNDING = 1000;

const GIGABIT = 1000;

const MEGA = 1000000;

const BITS = 8;

/**
 * The megabits a second of a bytes-a-second rate, the per-adapter
 * `rx_bps` and `tx_bps` of `monitoring/machines/usage`.
 *
 * @param {number|string|null} bytesPerSecond - The rate in bytes a second
 * @returns {number} The megabits a second
 */
export const megabitsOf = bytesPerSecond => ((parseFloat(bytesPerSecond) || 0) * BITS) / MEGA;

export const LAYERS = { vnic: 0, carrier: 1, uplink: 2, member: 3 };

const PATH_LAYERS = LAYERS.uplink + 1;

const PERCENT = 100;

const FULL_SHARE = { rx: 1, tx: 1 };

/**
 * The words a network is titled by, the locale key and its values,
 * hyperweaver-ui's titles by the network's kind.
 *
 * @param {{ kind: string, carrier: string, vlanId: number }} network - The network
 * @returns {{ key: string, values: Object }} The title's key and values
 */
export const networkTitleOf = network => {
  if (TITLE_KEYS[network.kind]) {
    return { key: TITLE_KEYS[network.kind], values: { name: network.carrier } };
  }
  if (network.kind === 'nat') {
    return { key: 'hostTools.topology.natShared', values: {} };
  }
  if (network.vlanId > 0) {
    return { key: 'hostTools.topology.vlanNetwork', values: { vlanId: network.vlanId } };
  }
  return { key: 'hostTools.topology.untaggedNetwork', values: {} };
};

/**
 * The key one series of a hop is read by, its source and its name.
 *
 * @param {string} source - `link` for a link of the host's network series, `adapter` for an adapter of the machine's usage
 * @param {string|number} name - The link or the adapter
 * @returns {string} The key
 */
export const seriesKey = (source, name) => `${source}${KEY_BAR}${name}`;

const keyParts = key => {
  const at = key.indexOf(KEY_BAR);
  return { source: key.slice(0, at), name: key.slice(at + 1) };
};

const round = value => Math.round(value * ROUNDING) / ROUNDING;

const add = (first, second) => ({
  rx: first.rx + (second?.rx || 0),
  tx: first.tx + (second?.tx || 0),
});

const rateOf = usage => (usage ? { rx: usage.rxMbps || 0, tx: usage.txMbps || 0 } : null);

const ipv4SubnetOf = row => {
  if (!row?.ip_address || !row.prefix_length || (row.ip_version || 'v4') !== 'v4') {
    return '';
  }
  const parts = row.ip_address.split('.').map(Number);
  const len = Number(row.prefix_length);
  if (parts.length !== OCTETS || parts.some(Number.isNaN) || len < 1 || len > PREFIX_MAX) {
    return '';
  }
  const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = len === PREFIX_MAX ? 0xffffffff : (0xffffffff << (PREFIX_MAX - len)) >>> 0;
  const net = (ipInt & mask) >>> 0;
  return `${(net >>> 24) & OCTET}.${(net >>> 16) & OCTET}.${(net >>> 8) & OCTET}.${net & OCTET}/${len}`;
};

const unique = values => [...new Set(values.filter(Boolean))];

const fact = (key, value) => ({ key, value: value === null || value === undefined ? '' : value });

const text = value => ({ text: String(value) });

const mono = value => ({ text: String(value), mono: true });

const said = (key, values = {}) => ({ key, values });

const badgeOf = nic => {
  if (nic.vlanId > 0) {
    return said('hostTools.topology.vlanBadge', { vlanId: nic.vlanId });
  }
  return nic.mode ? text(nic.mode) : said('hostTools.topology.untaggedBadge');
};

const RATE = { rate: true };

const speedText = mbps => (mbps >= GIGABIT ? `${mbps / GIGABIT}G` : `${mbps}M`);

const rateAgainst = speedMbps => (speedMbps > 0 ? { rate: true, of: speedText(speedMbps) } : RATE);

const mtuWords = mtu => (mtu ? [text(`MTU ${mtu}`)] : []);

const line = (words, tinted = false, extra = false) => ({ words, tinted, extra });

const SWITCH_MODES = {
  nat: 'nat',
  hostonly: 'hostonly',
  hostonlynet: 'hostonly',
  natnetwork: 'natnetwork',
};

const switchModeOf = network => {
  if (network.carrierKind === 'etherstub') {
    return 'etherstub';
  }
  return SWITCH_MODES[network.kind] || 'internal';
};

const stateOf = (up, ghost = false) => {
  if (ghost) {
    return 'ghost';
  }
  return up ? 'up' : 'down';
};

const vnicNode = (consumer, nic, carrier) => ({
  id: `vnic:${nic.link}`,
  layer: LAYERS.vnic,
  kind: 'vnic',
  label: nic.label || nic.link,
  mono: true,
  state: stateOf(consumer.running, nic.ghost),
  tint: nic.networkId,
  meta: [],
  lines: [
    line([badgeOf(nic), mono(nic.over)], true),
    line([RATE, ...mtuWords(nic.mtu || carrier.mtu)]),
    ...(nic.mac ? [line([mono(nic.mac)], false, true)] : []),
  ],
  members: [],
  speedMbps: nic.speedMbps || nic.usage?.speedMbps || 0,
  series: [
    nic.adapter === undefined || nic.adapter === null
      ? seriesKey(LINK_SOURCE, nic.link)
      : seriesKey(ADAPTER_SOURCE, nic.adapter),
  ],
  facts: [
    fact('mode', nic.mode || (nic.vlanId > 0 ? 'vlan' : 'untagged')),
    fact('mac', nic.mac),
    fact('vlan', nic.vlanId > 0 ? String(nic.vlanId) : ''),
    fact('over', nic.over),
    fact('mtu', nic.mtu || carrier.mtu ? String(nic.mtu || carrier.mtu) : ''),
    fact('cable', nic.cableConnected),
    fact('nicType', nic.nicType),
  ],
  capacityMbps: nic.speedMbps || nic.usage?.speedMbps || carrier.speedMbps || 0,
});

const portsWord = ports =>
  ports === 0
    ? said('hostTools.topology.emptySwitch')
    : said('hostTools.topology.portCount', { count: ports });

const switchNode = (swtch, network) => ({
  id: `switch:${swtch.id}`,
  layer: LAYERS.carrier,
  kind: 'switch',
  label: swtch.name,
  mono: true,
  state: stateOf(swtch.state === 'up'),
  tint: network.id,
  meta: [],
  lines: [
    line([
      said('hostTools.topology.internalSwitch'),
      said(`hostTools.networkPath.mode.${switchModeOf(network)}`),
    ]),
    line([RATE, portsWord(swtch.ports), ...mtuWords(swtch.mtu)]),
    ...(network.detail ? [line([mono(network.detail)], false, true)] : []),
  ],
  members: [],
  speedMbps: 0,
  series: [],
  facts: [
    fact('ports', String(swtch.ports)),
    fact('detail', network.detail || ''),
    fact('mtu', swtch.mtu ? String(swtch.mtu) : ''),
    fact('live', String(network.live)),
    fact('planned', String(network.planned)),
  ],
  capacityMbps: 0,
});

const ipsOf = adapter => adapter.ips.filter(ip => ip.ip_address);

const subnetsOf = adapter => unique(ipsOf(adapter).map(ipv4SubnetOf));

const portGroupNode = (network, adapter, linkSpeed) => {
  const subnets = subnetsOf(adapter);
  return {
    id: `portgroup:${network.id}`,
    layer: LAYERS.carrier,
    kind: 'portgroup',
    label: '',
    title: networkTitleOf(network),
    mono: false,
    state: stateOf(network.live > 0),
    tint: network.id,
    meta: [],
    lines: [
      line([
        said('hostTools.topology.overCarrier', { carrier: adapter.name }),
        said('hostTools.topology.liveCount', { count: network.live }),
        ...(network.planned > 0
          ? [said('hostTools.topology.plannedCount', { count: network.planned })]
          : []),
      ]),
      line([RATE]),
      ...(subnets.length > 0 ? [line([mono(subnets[0])], false, true)] : []),
    ],
    members: [],
    speedMbps: 0,
    series: [],
    facts: [
      fact('vlan', network.vlanId > 0 ? String(network.vlanId) : ''),
      fact('over', adapter.name),
      fact('subnet', subnets.join(', ')),
      fact('live', String(network.live)),
      fact('planned', String(network.planned)),
    ],
    capacityMbps: linkSpeed,
  };
};

const speedFromVnics = nics => Math.max(0, ...nics.map(nic => nic.speedMbps || 0));

const kindWord = adapter =>
  said(
    adapter.kind === 'aggr' ? 'hostTools.topology.lacpAggregate' : 'hostTools.topology.physical'
  );

const memberWords = members =>
  members.length > 0
    ? [
        said('hostTools.networkPath.memberCount', {
          count: members.length,
          down: members.filter(member => member.state !== 'up').length,
        }),
      ]
    : [];

const upSpeedOf = members =>
  members
    .filter(member => member.state === 'up')
    .reduce((sum, member) => sum + (member.speed || 0), 0);

const uplinkNode = (adapter, nics) => {
  const ips = ipsOf(adapter);
  const subnets = subnetsOf(adapter);
  const members = adapter.members || [];
  const speedMbps = upSpeedOf(members) || adapter.speedMbps || speedFromVnics(nics);
  const addresses = [...ips.map(ip => ip.ip_address), ...subnets];
  return {
    id: `uplink:${adapter.id}`,
    layer: LAYERS.uplink,
    kind: 'uplink',
    label: adapter.name,
    mono: true,
    state: stateOf(adapter.state === 'up'),
    tint: '',
    meta: [],
    lines: [
      line([kindWord(adapter), ...(speedMbps > 0 ? [text(speedText(speedMbps))] : [])]),
      line([rateAgainst(speedMbps), ...mtuWords(adapter.mtu), ...memberWords(members)]),
      ...(addresses.length > 0 ? [line(addresses.map(mono), false, true)] : []),
    ],
    members,
    speedMbps,
    series: [],
    facts: [
      fact('link', adapter.link && adapter.link !== adapter.name ? adapter.link : ''),
      fact('mtu', adapter.mtu ? String(adapter.mtu) : ''),
      fact('ip', ips.map(ip => ip.ip_address).join(', ')),
      fact('subnet', subnets.join(', ')),
      fact('members', members.map(member => member.name).join(', ')),
    ],
    capacityMbps: speedMbps,
  };
};

const adapterOf = (graph, over) =>
  graph.adapters.find(a => a.id === over) ||
  graph.adapters.find(a => a.members.some(m => m.name === over)) || {
    id: over,
    name: over,
    link: null,
    kind: 'phys',
    state: 'unknown',
    speedMbps: 0,
    mtu: null,
    members: [],
    ips: [],
    usage: null,
  };

const firstUse = paths => {
  const order = new Map();
  paths.forEach((path, index) => {
    path.nodes.forEach(id => {
      if (!order.has(id)) {
        order.set(id, index);
      }
    });
  });
  return order;
};

const compareKeys = (first, second) => {
  const length = Math.max(first.length, second.length);
  for (let i = 0; i < length; i += 1) {
    const a = first[i] ?? -1;
    const b = second[i] ?? -1;
    if (a !== b) {
      return a - b;
    }
  }
  return 0;
};

/**
 * The paths in the order the rows draw: by the first use of the node a
 * path ends at, then of each node before it back to its second, then by
 * the path's own place, so every node's paths are neighbours and no
 * wire crosses another.
 *
 * @param {Array<{ id: string, nodes: Array<string> }>} paths - The paths in the order their sources list them
 * @returns {Array<Object>} The paths in row order
 */
export const orderPaths = paths => {
  const used = firstUse(paths);
  const keyOf = (path, index) => [
    ...path.nodes
      .slice(1)
      .reverse()
      .map(id => used.get(id)),
    index,
  ];
  return paths
    .map((path, index) => ({ path, key: keyOf(path, index) }))
    .sort((first, second) => compareKeys(first.key, second.key))
    .map(entry => entry.path);
};

const terminalOf = path => path.nodes[path.nodes.length - 1];

/**
 * Where everything of the rail draws among its rows: a row a path in row
 * order, a separator row before a path that ends at another node than
 * the one before it; each node on the rows of the paths that pass
 * through it, the first and how many; and after a path that ends short
 * of the last layer the end note in the next layer over the rows of the
 * node it ends at.
 *
 * @param {Array<{ id: string, nodes: Array<string> }>} paths - The paths in row order
 * @param {Map<string, { layer: number }>} layerOf - Node id to its node
 * @param {number} layers - The layers the graph holds
 * @returns {{ rows: number, pathRows: Map<string, number>, places: Map<string, { row: number, span: number }>, separators: Array<number>, ends: Array<{ id: string, layer: number, row: number, span: number }> }} The layout
 */
export const railLayout = (paths, layerOf, layers) => {
  const pathRows = new Map();
  const places = new Map();
  const separators = [];
  let row = 0;
  paths.forEach((path, index) => {
    if (index > 0 && terminalOf(path) !== terminalOf(paths[index - 1])) {
      separators.push(row);
      row += 1;
    }
    pathRows.set(path.id, row);
    path.nodes.forEach(id => {
      const place = places.get(id);
      if (place) {
        place.span = row - place.row + 1;
      } else {
        places.set(id, { row, span: 1 });
      }
    });
    row += 1;
  });
  const ends = unique(paths.map(terminalOf))
    .filter(id => layerOf.get(id).layer < layers - 1)
    .map(id => ({ id: `end:${id}`, layer: layerOf.get(id).layer + 1, ...places.get(id) }));
  return { rows: row, pathRows, places, separators, ends };
};

/**
 * A utilization fraction of a rate against a link speed, the busier way,
 * null while the speed is unknown.
 *
 * @param {{ rx: number, tx: number }|null} rate - The rate in megabits a second
 * @param {number} speedMbps - The link speed in megabits a second
 * @returns {number|null} The fraction
 */
export const utilizationOf = (rate, speedMbps) =>
  speedMbps > 0 && rate ? Math.max(rate.rx, rate.tx) / speedMbps : null;

const totals = (nodes, paths) => {
  const byNode = new Map(nodes.map(node => [node.id, { ...NO_RATE }]));
  const carried = new Map(nodes.map(node => [node.id, false]));
  paths
    .filter(path => path.rate)
    .forEach(path => {
      path.nodes.forEach(id => {
        byNode.set(id, add(byNode.get(id), path.rate));
        carried.set(id, true);
      });
    });
  return nodes.map(node => {
    const rate = carried.get(node.id) ? byNode.get(node.id) : null;
    return { ...node, rate, util: utilizationOf(rate, node.speedMbps) };
  });
};

const oneOf = values => (values.length === 1 ? values[0] : '');

const withPaths = (nodes, paths) =>
  nodes.map(node => {
    const through = paths.filter(path => path.nodes.includes(node.id));
    return {
      ...node,
      tint: node.tint || oneOf(unique(through.map(path => path.tint))),
      paths: through.map(path => path.id),
      packets: node.layer === LAYERS.vnic ? through[0]?.packets || null : null,
      series: node.series.length > 0 ? node.series : unique(through.flatMap(path => path.series)),
    };
  });

const linksOf = (paths, byId) => {
  const links = new Map();
  paths.forEach(path => {
    path.nodes.slice(1).forEach((to, index) => {
      const from = path.nodes[index];
      const id = `${from}>${to}`;
      const held = links.get(id) || {
        id,
        from,
        to,
        rate: null,
        ghost: true,
        tint: path.tint,
        paths: [],
      };
      held.paths.push(path.id);
      held.ghost &&= path.ghost;
      held.rate = path.rate ? add(held.rate || NO_RATE, path.rate) : held.rate;
      links.set(id, held);
    });
  });
  return [...links.values()].map(link => {
    const speedMbps = byId.get(link.from)?.capacityMbps || 0;
    return {
      ...link,
      down: false,
      capacityMbps: speedMbps,
      speedMbps,
      util: utilizationOf(link.rate, speedMbps),
    };
  });
};

const hottest = nodes => {
  const busy = nodes.filter(node => node.kind === 'uplink' && node.util > 0);
  if (busy.length === 0) {
    return '';
  }
  return busy.reduce((best, node) => (node.util > best.util ? node : best)).id;
};

const addNode = (nodes, node) => {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
  return node.id;
};

const pathOf = ({ graph, consumer, nic, nodes, packets }) => {
  const swtch = graph.switches.find(s => s.id === nic.over);
  const adapter = swtch ? null : adapterOf(graph, nic.over);
  const riders = consumer.nics.filter(other => other.over === nic.over);
  const uplink = adapter ? nodes.get(`uplink:${adapter.id}`) || uplinkNode(adapter, riders) : null;
  const carrier = uplink
    ? { mtu: adapter.mtu, speedMbps: uplink.speedMbps }
    : { mtu: swtch.mtu, speedMbps: 0 };
  const ids = [addNode(nodes, vnicNode(consumer, nic, carrier))];
  const network = graph.networks.find(net => net.id === nic.networkId) || {
    id: nic.networkId,
    carrier: nic.over,
    kind: nic.vlanId > 0 ? 'vlan' : 'untagged',
    vlanId: nic.vlanId,
    live: 0,
    planned: 1,
    detail: null,
  };
  if (swtch) {
    ids.push(addNode(nodes, switchNode(swtch, network)));
  } else {
    ids.push(addNode(nodes, portGroupNode(network, adapter, uplink.speedMbps)));
    ids.push(addNode(nodes, uplink));
  }
  const live = !nic.ghost && graph.feedPresent;
  const vnic = nodes.get(ids[0]);
  return {
    id: vnic.id,
    nodes: ids,
    tint: nic.networkId,
    ghost: Boolean(nic.ghost),
    rate: live ? rateOf(nic.usage) || { ...NO_RATE } : null,
    series: vnic.series,
    packets: packets.get(vnic.series[0]) || null,
  };
};

const laneShare = (up, usageByLink, lane) => {
  const rates = up.map(member => usageByLink.get(member.name)?.[lane] || 0);
  const sum = rates.reduce((total, rate) => total + rate, 0);
  return rates.map(rate => (sum > 0 ? rate / sum : 1 / up.length));
};

const sharesOf = (members, usageByLink) => {
  const up = members.filter(member => member.state === 'up');
  const rx = laneShare(up, usageByLink, 'rxMbps');
  const tx = laneShare(up, usageByLink, 'txMbps');
  return new Map(up.map((member, index) => [member.name, { rx: rx[index], tx: tx[index] }]));
};

const scaled = (rate, share) => (rate ? { rx: rate.rx * share.rx, tx: rate.tx * share.tx } : null);

const shareText = share =>
  `↓${Math.round(share.rx * PERCENT)}% ↑${Math.round(share.tx * PERCENT)}%`;

const memberNode = ({ uplink, adapter, member, share }) => {
  const up = member.state === 'up';
  const rate = up ? scaled(uplink.rate, share) : null;
  return {
    id: `member:${adapter.id}:${member.name}`,
    layer: LAYERS.member,
    kind: 'member',
    label: member.name,
    mono: true,
    state: stateOf(up),
    tint: uplink.tint,
    meta: [],
    lines: [
      line([
        said('hostTools.topology.physical'),
        ...(member.speed > 0 ? [text(speedText(member.speed))] : []),
      ]),
      line([rateAgainst(member.speed), ...mtuWords(adapter.mtu)]),
    ],
    members: [],
    speedMbps: member.speed || 0,
    series: [seriesKey(LINK_SOURCE, member.name)],
    facts: [
      fact('state', member.state),
      fact('mtu', adapter.mtu ? String(adapter.mtu) : ''),
      fact('memberOf', adapter.name),
      fact('share', up ? shareText(share) : ''),
    ],
    capacityMbps: member.speed || 0,
    rate,
    util: up ? utilizationOf(rate, member.speed) : null,
    hot: false,
    paths: uplink.paths,
    packets: null,
  };
};

const memberLink = (uplink, node, ghost) => ({
  id: `${uplink.id}>${node.id}`,
  from: uplink.id,
  to: node.id,
  rate: node.rate,
  ghost: node.state === 'up' && ghost,
  down: node.state !== 'up',
  tint: uplink.tint,
  paths: uplink.paths,
  capacityMbps: node.capacityMbps,
  speedMbps: node.state === 'up' ? node.capacityMbps : 0,
  util: node.util,
});

const membersOf = (slice, nodes, paths) => {
  const usageByLink = slice.usageByLink || new Map();
  return nodes
    .filter(node => node.kind === 'uplink' && node.members.length > 0)
    .map(uplink => {
      const adapter = adapterOf(slice, uplink.id.slice('uplink:'.length));
      const shares = sharesOf(uplink.members, usageByLink);
      const ghost = paths.filter(path => uplink.paths.includes(path.id)).every(path => path.ghost);
      const members = uplink.members.map(member =>
        memberNode({ uplink, adapter, member, share: shares.get(member.name) || FULL_SHARE })
      );
      return {
        uplink,
        members,
        links: members.map(node => memberLink(uplink, node, ghost)),
        tails: members
          .filter(node => node.state === 'up')
          .map(node => ({ node: node.id, share: shares.get(node.label) })),
      };
    });
};

const stacksOf = (groups, places) =>
  groups.map(({ uplink, members }) => ({
    id: `stack:${uplink.id}`,
    layer: LAYERS.member,
    ...places.get(uplink.id),
    nodes: members.map(node => node.id),
  }));

/**
 * One machine's network path as a layered graph, the generic shape any
 * source of hops fills: `nodes`, each `{ id, layer, kind, label, title,
 * meta, lines, members, state, tint, rate, speedMbps, capacityMbps,
 * util, hot, paths, series, facts }`, `capacityMbps` the capacity of
 * the hop that leaves it, `meta` the words beside its name and `lines` the
 * lines of its card, each `{ words, tinted, extra }`, hyperweaver-ui's,
 * `extra` a line a narrow rail leaves to the title: a vNIC's badge and
 * carrier in its network's colour, its rate and MTU and its MAC; a
 * switch's kind and mode, its rate, ports and MTU and its detail; a port
 * group's carrier with its live and planned counts, its rate and its
 * subnet; an uplink's kind and speed, its rate, MTU and an aggregate's
 * member and down counts, and its addresses and subnets, with an
 * aggregate's `members`, each its name, state and speed; a member link's
 * kind and speed and its rate and MTU; a word is a locale key with
 * values, a text, or the rate, `of` the speed a rate is shown against. The
 * machine's vNICs are in layer 0, the switch or port group each rides in
 * layer 1, the uplink of a port group in layer 2, a switch ending its
 * path, and an aggregate's member links in layer 3; `links`, each `{ id,
 * from, to, rate, capacityMbps, speedMbps, util, ghost, down, tint,
 * paths }`, the received and sent lanes of a hop, its capacity the
 * `capacityMbps` of the node it leaves and on a member link the member's
 * speed: a vNIC's own speed where the host answers one and otherwise its
 * uplink's, a port group's its uplink's, none on a switch; `speedMbps`
 * the capacity a lane's heat reads, none on a member link that is down,
 * `down` that member link; `paths`, one
 * a vNIC, the nodes its data passes in order with its rate, its series,
 * its average packet sizes and its `tails`, each up member link of the
 * aggregate it ends at with its share each way, in the order the rows
 * draw; and `layout`, the rows of `railLayout` with `stacks`, each
 * aggregate's member links stacked in layer 3 over the rows of the
 * aggregate. Every node's rate is the sum of the vNICs that pass it, an
 * uplink's against its speed, an aggregate's the sum of its up members,
 * otherwise the speed of its interface where the host answers one and
 * otherwise the fastest vNIC riding it; a member link's
 * rate is its aggregate's at its share, each way the member's part of
 * the up members' own rates on the host, an even part where none moves;
 * `hot` is the uplink of the highest utilization, empty where no speed
 * is known or nothing moves.
 *
 * @param {Object} slice - One machine's slice of a host graph, `sliceForMachine`
 * @param {Map<string, { rx: number|null, tx: number|null }>} [packets] - Series key to average packet bytes each way
 * @returns {{ nodes: Array<Object>, links: Array<Object>, paths: Array<Object>, layout: Object, layers: number, hot: string }} The graph
 */
export const buildPathGraph = (slice, packets = new Map()) => {
  const [consumer] = slice.consumers;
  const nodes = new Map();
  const listed = consumer.nics.map(nic => pathOf({ graph: slice, consumer, nic, nodes, packets }));
  const paths = orderPaths(listed);
  const counted = withPaths(totals([...nodes.values()], paths), paths);
  const byId = new Map(counted.map(node => [node.id, node]));
  const hot = hottest(counted);
  const groups = membersOf(slice, counted, paths);
  const tails = new Map(groups.map(group => [group.uplink.id, group.tails]));
  const layout = railLayout(paths, byId, PATH_LAYERS);
  return {
    nodes: [
      ...counted.map(node => ({ ...node, hot: node.id === hot })),
      ...groups.flatMap(group => group.members),
    ],
    links: [...linksOf(paths, byId), ...groups.flatMap(group => group.links)],
    paths: paths.map(path => ({ ...path, tails: tails.get(terminalOf(path)) || [] })),
    layout: { ...layout, stacks: stacksOf(groups, layout.places) },
    layers: groups.length > 0 ? LAYERS.member + 1 : PATH_LAYERS,
    hot,
  };
};

const latestPerLink = rows => {
  const latest = new Map();
  rows.forEach(row => {
    if (!isGap(row) && row.link) {
      const held = latest.get(row.link);
      if (!held || timeOf(held) <= timeOf(row)) {
        latest.set(row.link, row);
      }
    }
  });
  return latest;
};

const averageOf = (bytes, packets) => {
  const count = parseFloat(packets);
  return count > 0 ? (parseFloat(bytes) || 0) / count : null;
};

/**
 * The average packet size each way of every link of the host's network
 * series, its newest sample's byte deltas over its packet deltas, a way
 * without packet deltas null.
 *
 * @param {Array<Object>} rows - The samples of the host's network series
 * @returns {Map<string, { rx: number|null, tx: number|null }>} Series key to average bytes
 */
export const packetSizesOf = rows => {
  const sizes = new Map();
  latestPerLink(rows).forEach((row, link) => {
    const rx = averageOf(row.rbytes_delta, row.ipackets_delta);
    const tx = averageOf(row.obytes_delta, row.opackets_delta);
    if (rx !== null || tx !== null) {
      sizes.set(seriesKey(LINK_SOURCE, link), { rx, tx });
    }
  });
  return sizes;
};

const linkSamples = (rows, name) =>
  rows
    .filter(row => row.link === name)
    .map(row => ({
      at: timeOf(row),
      rate: isGap(row) ? null : networkRates(row),
    }));

const adapterRate = (row, name) => {
  const nic = (Array.isArray(row.nics) ? row.nics : []).find(
    entry => String(entry.adapter) === name
  );
  if (!nic || nic.rx_bps === null || nic.rx_bps === undefined) {
    return null;
  }
  return { rx: megabitsOf(nic.rx_bps), tx: megabitsOf(nic.tx_bps) };
};

const adapterSamples = (rows, name) =>
  rows.map(row => ({ at: timeOf(row), rate: isGap(row) ? null : adapterRate(row, name) }));

const SAMPLERS = { [LINK_SOURCE]: linkSamples, [ADAPTER_SOURCE]: adapterSamples };

/**
 * A hop's points, the received, the sent and both in megabits a second
 * at every instant one of its series holds, its series summed, an
 * instant where one of them holds no number a null point; the shape
 * `entitySpec` draws.
 *
 * @param {Array<string>} keys - The hop's series keys
 * @param {Object<string, Array<Object>>} sources - The rows of each source, `link` the host's network series and `adapter` the machine's usage series
 * @returns {{ first: Array, second: Array, total: Array }} The points
 */
export const hopPoints = (keys, sources) => {
  const instants = new Map();
  keys.forEach(key => {
    const { source, name } = keyParts(key);
    const sampler = SAMPLERS[source];
    if (!sampler) {
      return;
    }
    sampler(sources[source] || [], name).forEach(({ at, rate }) => {
      if (!Number.isFinite(at)) {
        return;
      }
      const held = instants.has(at) ? instants.get(at) : NO_RATE;
      instants.set(at, held && rate ? add(held, rate) : null);
    });
  });
  const ordered = [...instants.entries()].sort((first, second) => first[0] - second[0]);
  const pointsOf = read => ordered.map(([at, rate]) => [at, rate ? round(read(rate)) : null]);
  return {
    first: pointsOf(rate => rate.rx),
    second: pointsOf(rate => rate.tx),
    total: pointsOf(rate => rate.rx + rate.tx),
  };
};
