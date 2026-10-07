import { describe, expect, it } from 'vitest';

import {
  buildPathGeometry,
  laneHeat,
  laneWidth,
  packetBytes,
  fitLevelsOf,
  nextFitLevel,
  packetSpawnRate,
  pipeWidth,
  tightRate,
} from '../../src/features/hosts/components/NetworkTopology/pathMeasure.js';
import {
  buildPathGraph,
  hopPoints,
  networkTitleOf,
  orderPaths,
  packetSizesOf,
  railLayout,
  seriesKey,
  utilizationOf,
} from '../../src/features/hosts/components/NetworkTopology/pathModel.js';
import {
  buildHostGraph,
  sliceForMachine,
} from '../../src/features/hosts/components/NetworkTopology/topologyModel.js';
import {
  bridgeNamesOf,
  buildVBoxGraph,
} from '../../src/features/hosts/components/NetworkTopology/topologyModelVBox.js';
import { machineUsageOf } from '../../src/features/hosts/components/NetworkTopology/useTopologyFeed.js';

const INTEL = 'Intel(R) 82599 10 Gigabit Dual Port Network Connection';

const SWITCHBOARD = '8617--switchboard.m4kr.net';

const FIREWALL = '4001--fw-os-n1.home.m4kr.net';

const LAN_VLANS = 12;

const FIRST_LAN_VLAN = 4;

const vboxDetail = {
  knob_current: {
    nics: [
      { adapter: 1, mac: '00FF00FF00FF', nic_type: '82540EM', cable_connected: 'on' },
      {
        adapter: 2,
        mac: '080027AABBCC',
        nic_type: 'virtio',
        cable_connected: 'on',
        interface: 'Ethernet 2',
        speed: 1000000,
      },
    ],
    devices: {
      nics: [
        { adapter: 1, mode: 'nat', mac: '00FF00FF00FF' },
        { adapter: 2, mode: 'bridged', network: INTEL, mac: '080027AABBCC' },
      ],
    },
  },
};

const vboxGraph = () =>
  buildVBoxGraph({
    interfaces: [
      {
        link: 'Ethernet 2',
        class: 'phys',
        state: 'up',
        mtu: 1500,
        addresses: ['10.0.0.11/24', 'fe80::1/64'],
      },
      { link: 'Wi-Fi', class: 'phys', state: 'down', mtu: 1500, addresses: [] },
    ],
    spaces: [],
    machines: [{ name: SWITCHBOARD, status: 'running' }],
    machineDetails: new Map([[SWITCHBOARD, vboxDetail]]),
    usage: [{ link: 'Ethernet 2', rx_mbps: 90, tx_mbps: 40 }],
    machineUsage: machineUsageOf({
      usage: [
        {
          machine_name: SWITCHBOARD,
          nics: [
            { adapter: 1, rx_bps: 100000, tx_bps: 25000 },
            { adapter: 2, rx_bps: 62500000, tx_bps: 12500000 },
          ],
        },
      ],
    }),
  });

const lanName = index => `vnici3_4001_${index}`;

const firewallGraph = ({ speed = 10000 } = {}) => {
  const lan = [...Array(LAN_VLANS).keys()].map(index => ({
    link: lanName(index),
    over: 'ixgbe1',
    vid: FIRST_LAN_VLAN + index,
    zone: FIREWALL,
  }));
  const wan = { link: 'vnice3_4001_0', over: 'ixgbe0', vid: 99, zone: FIREWALL };
  const usage = [
    {
      link: 'vnice3_4001_0',
      rx_mbps: '2400',
      tx_mbps: '950',
      rbytes_delta: '60000000',
      ipackets_delta: '40000',
      obytes_delta: '1000000',
      opackets_delta: '10000',
      scan_timestamp: '2026-10-07T12:00:00Z',
    },
    ...lan.map((row, index) => ({
      link: row.link,
      rx_mbps: String(500 + index),
      tx_mbps: String(300 + index),
      scan_timestamp: '2026-10-07T12:00:00Z',
    })),
  ];
  const graph = buildHostGraph({
    interfaces: [
      { link: 'ixgbe0', class: 'phys', state: 'up', speed, mtu: 1500 },
      { link: 'ixgbe1', class: 'phys', state: 'up', speed, mtu: 9000 },
    ],
    vnics: [lan[0], wan, ...lan.slice(1)],
    machines: [{ name: FIREWALL, status: 'running' }],
    usage,
  });
  return { slice: sliceForMachine(graph, FIREWALL), usage };
};

const aggregateSlice = () =>
  sliceForMachine(
    buildHostGraph({
      interfaces: [
        { link: 'ixgbe1', class: 'phys', state: 'up', speed: 10000 },
        { link: 'ixgbe2', class: 'phys', state: 'up', speed: 10000 },
        { link: 'ixgbe3', class: 'phys', state: 'down', speed: 10000 },
      ],
      aggregates: [{ link: 'aggr0', over: 'ixgbe1,ixgbe2,ixgbe3', state: 'up', mtu: 9000 }],
      vnics: [{ link: 'vnic0', over: 'aggr0', vid: 4, zone: FIREWALL }],
      machines: [{ name: FIREWALL, status: 'running' }],
      usage: [
        { link: 'vnic0', rx_mbps: 10, tx_mbps: 5 },
        { link: 'ixgbe1', rx_mbps: 30, tx_mbps: 10 },
        { link: 'ixgbe2', rx_mbps: 10, tx_mbps: 30 },
      ],
    }),
    FIREWALL
  );

const byId = (graph, id) => graph.nodes.find(node => node.id === id);

describe('the VirtualBox join', () => {
  it('names an OS interface by the bridge adapter an adapter joins it to', () => {
    expect(bridgeNamesOf(new Map([[SWITCHBOARD, vboxDetail]]))).toEqual(
      new Map([['Ethernet 2', INTEL]])
    );
  });

  it('draws the joined interface under the bridge name with its state, MTU and addresses', () => {
    const graph = vboxGraph();
    const adapter = graph.adapters.find(a => a.id === INTEL);
    expect(adapter).toMatchObject({ name: INTEL, link: 'Ethernet 2', state: 'up', mtu: 1500 });
    expect(adapter.ips.map(ip => [ip.ip_address, ip.prefix_length, ip.ip_version])).toEqual([
      ['10.0.0.11', 24, 'v4'],
      ['fe80::1', 64, 'v6'],
    ]);
    expect(adapter.usage).toEqual({ rxMbps: 90, txMbps: 40, speedMbps: 0 });
    expect(graph.networks.find(net => net.id === `bridged|${INTEL}`).usage).toEqual(adapter.usage);
    expect(graph.adapters.filter(a => a.id === INTEL)).toHaveLength(1);
  });

  it("joins by the interface row's description where the row carries one", () => {
    const graph = buildVBoxGraph({
      interfaces: [{ link: 'Ethernet 2', class: 'phys', state: 'up', description: INTEL }],
      machines: [{ name: SWITCHBOARD, status: 'running' }],
      machineDetails: new Map([
        [
          SWITCHBOARD,
          { knob_current: { devices: { nics: vboxDetail.knob_current.devices.nics } } },
        ],
      ]),
    });
    expect(graph.adapters.map(a => [a.id, a.link, a.state])).toEqual([[INTEL, 'Ethernet 2', 'up']]);
  });

  it("reads each adapter's speed in kilobits, its cable and its type", () => {
    const [{ nics }] = vboxGraph().consumers;
    expect(nics.map(nic => [nic.link, nic.speedMbps, nic.cableConnected, nic.nicType])).toEqual([
      ['adapter 1', 0, 'on', '82540EM'],
      ['adapter 2', 1000, 'on', 'virtio'],
    ]);
    expect(nics[1].usage).toEqual({ rxMbps: 500, txMbps: 100, speedMbps: 0 });
  });
});

describe('buildPathGraph', () => {
  it('draws the rows in the order of the adapters, the NAT switch ending its path', () => {
    const graph = buildPathGraph(sliceForMachine(vboxGraph(), SWITCHBOARD));
    expect(graph.paths.map(path => path.nodes)).toEqual([
      ['vnic:adapter 1', 'switch:nat'],
      ['vnic:adapter 2', `portgroup:bridged|${INTEL}`, `uplink:${INTEL}`],
    ]);
    expect(graph.layers).toBe(3);
    expect(graph.layout.separators).toEqual([1]);
    expect(graph.layout.pathRows.get('vnic:adapter 2')).toBe(2);
    expect(graph.layout.ends).toEqual([{ id: 'end:switch:nat', layer: 2, row: 0, span: 1 }]);
    expect(byId(graph, `uplink:${INTEL}`).lines).toEqual([
      {
        words: [{ key: 'hostTools.topology.physical', values: {} }, { text: '1G' }],
        tinted: false,
        extra: false,
      },
      { words: [{ rate: true, of: '1G' }, { text: 'MTU 1500' }], tinted: false, extra: false },
      {
        words: [
          { text: '10.0.0.11', mono: true },
          { text: 'fe80::1', mono: true },
          { text: '10.0.0.0/24', mono: true },
        ],
        tinted: false,
        extra: true,
      },
    ]);
    expect(byId(graph, 'vnic:adapter 2').lines).toEqual([
      { words: [{ text: 'bridged' }, { text: INTEL, mono: true }], tinted: true, extra: false },
      { words: [{ rate: true }, { text: 'MTU 1500' }], tinted: false, extra: false },
      { words: [{ text: '080027AABBCC', mono: true }], tinted: false, extra: true },
    ]);
    expect(byId(graph, 'switch:nat').lines[0].words[1]).toEqual({
      key: 'hostTools.networkPath.mode.nat',
      values: {},
    });
    expect(byId(graph, `portgroup:bridged|${INTEL}`).lines[0].words).toEqual([
      { key: 'hostTools.topology.overCarrier', values: { carrier: INTEL } },
      { key: 'hostTools.topology.liveCount', values: { count: 1 } },
    ]);
    expect(byId(graph, `portgroup:bridged|${INTEL}`).lines[2]).toEqual({
      words: [{ text: '10.0.0.0/24', mono: true }],
      tinted: false,
      extra: true,
    });
    expect(byId(graph, `uplink:${INTEL}`).paths).toEqual(['vnic:adapter 2']);
  });

  it("carries an aggregate uplink's member links, its speed the sum of the up members", () => {
    const uplink = byId(buildPathGraph(aggregateSlice()), 'uplink:aggr0');
    expect(uplink.members).toEqual([
      { name: 'ixgbe1', state: 'up', speed: 10000 },
      { name: 'ixgbe2', state: 'up', speed: 10000 },
      { name: 'ixgbe3', state: 'down', speed: 10000 },
    ]);
    expect(uplink.lines[0].words).toEqual([
      { key: 'hostTools.topology.lacpAggregate', values: {} },
      { text: '20G' },
    ]);
    expect(uplink.lines[1].words).toEqual([
      { rate: true, of: '20G' },
      { text: 'MTU 9000' },
      { key: 'hostTools.networkPath.memberCount', values: { count: 3, down: 1 } },
    ]);
    expect(uplink.speedMbps).toBe(20000);
  });

  it("stacks an aggregate's member links in layer 3, each at its part of the members' own rates", () => {
    const graph = buildPathGraph(aggregateSlice());
    expect(graph.layers).toBe(4);
    expect(graph.layout.stacks).toEqual([
      {
        id: 'stack:uplink:aggr0',
        layer: 3,
        row: 0,
        span: 1,
        nodes: ['member:aggr0:ixgbe1', 'member:aggr0:ixgbe2', 'member:aggr0:ixgbe3'],
      },
    ]);
    expect(graph.layout.places.has('member:aggr0:ixgbe1')).toBe(false);
    expect(graph.layout.ends).toEqual([]);
    const first = byId(graph, 'member:aggr0:ixgbe1');
    expect(first).toMatchObject({
      layer: 3,
      kind: 'member',
      state: 'up',
      rate: { rx: 7.5, tx: 1.25 },
      speedMbps: 10000,
      capacityMbps: 10000,
      paths: ['vnic:vnic0'],
      series: [seriesKey('link', 'ixgbe1')],
    });
    expect(first.facts.find(item => item.key === 'share').value).toBe('↓75% ↑25%');
    expect(byId(graph, 'member:aggr0:ixgbe3')).toMatchObject({ state: 'down', rate: null });
    const down = graph.links.find(link => link.id === 'uplink:aggr0>member:aggr0:ixgbe3');
    expect(down).toMatchObject({ down: true, speedMbps: 0, capacityMbps: 10000, ghost: false });
    expect(graph.paths[0].tails).toEqual([
      { node: 'member:aggr0:ixgbe1', share: { rx: 0.75, tx: 0.25 } },
      { node: 'member:aggr0:ixgbe2', share: { rx: 0.25, tx: 0.75 } },
    ]);
    expect(graph.hot).toBe('uplink:aggr0');
  });

  it("sums an uplink's vNICs against the fastest adapter riding it where the interface has no speed", () => {
    const graph = buildPathGraph(sliceForMachine(vboxGraph(), SWITCHBOARD));
    const uplink = byId(graph, `uplink:${INTEL}`);
    expect(uplink.rate).toEqual({ rx: 500, tx: 100 });
    expect(uplink.speedMbps).toBe(1000);
    expect(uplink.util).toBe(0.5);
    expect(graph.hot).toBe(`uplink:${INTEL}`);
    expect(byId(graph, 'switch:nat').rate).toEqual({ rx: 0.8, tx: 0.2 });
    expect(byId(graph, 'switch:nat').hot).toBe(false);
  });

  it('keeps every node on neighbouring rows so no wire crosses on a thirteen-net zone', () => {
    const { slice } = firewallGraph();
    const graph = buildPathGraph(slice);
    expect(graph.paths.map(path => path.id)).toEqual([
      'vnic:vnici3_4001_0',
      ...[...Array(LAN_VLANS - 1).keys()].map(index => `vnic:${lanName(index + 1)}`),
      'vnic:vnice3_4001_0',
    ]);
    expect(graph.layout.places.get('uplink:ixgbe1')).toEqual({ row: 0, span: LAN_VLANS });
    expect(graph.layout.separators).toEqual([LAN_VLANS]);
    expect(graph.layout.places.get('uplink:ixgbe0')).toEqual({ row: LAN_VLANS + 1, span: 1 });
    expect(graph.layout.rows).toBe(LAN_VLANS + 2);
    expect(graph.layout.ends).toEqual([]);
    [0, 1, 2].forEach(layer => {
      const ranges = graph.nodes
        .filter(node => node.layer === layer)
        .map(node => graph.layout.places.get(node.id))
        .sort((first, second) => first.row - second.row);
      ranges.slice(1).forEach((range, index) => {
        expect(range.row).toBeGreaterThanOrEqual(ranges[index].row + ranges[index].span);
      });
    });
  });

  it('totals every hop and rings the busiest uplink alone', () => {
    const { slice } = firewallGraph();
    const graph = buildPathGraph(slice);
    const lanRx = [...Array(LAN_VLANS).keys()]
      .map(index => 500 + index)
      .reduce((sum, value) => sum + value, 0);
    const lanTx = [...Array(LAN_VLANS).keys()]
      .map(index => 300 + index)
      .reduce((sum, value) => sum + value, 0);
    expect(byId(graph, 'uplink:ixgbe1').rate).toEqual({ rx: lanRx, tx: lanTx });
    expect(byId(graph, 'uplink:ixgbe1').util).toBeCloseTo(lanRx / 10000, 5);
    expect(byId(graph, 'uplink:ixgbe0').util).toBeCloseTo(0.24, 5);
    expect(byId(graph, 'portgroup:ixgbe1|4').rate).toEqual({ rx: 500, tx: 300 });
    expect(graph.hot).toBe('uplink:ixgbe1');
    expect(graph.nodes.filter(node => node.hot).map(node => node.id)).toEqual(['uplink:ixgbe1']);
    const link = graph.links.find(entry => entry.id === 'portgroup:ixgbe1|4>uplink:ixgbe1');
    expect(link.rate).toEqual({ rx: 500, tx: 300 });
    expect(link.speedMbps).toBe(10000);
    expect(link.util).toBeCloseTo(0.05, 5);
  });

  it('rings nothing where no speed is known', () => {
    const { slice } = firewallGraph({ speed: 0 });
    const graph = buildPathGraph(slice);
    expect(graph.hot).toBe('');
    expect(byId(graph, 'uplink:ixgbe1').util).toBeNull();
  });

  it("averages a link's packet size from its newest deltas and hands it to the path", () => {
    const { slice, usage } = firewallGraph();
    const sizes = packetSizesOf(usage);
    expect(sizes.get(seriesKey('link', 'vnice3_4001_0'))).toEqual({ rx: 1500, tx: 100 });
    expect(sizes.has(seriesKey('link', lanName(0)))).toBe(false);
    const graph = buildPathGraph(slice, sizes);
    expect(graph.paths.at(-1).packets).toEqual({ rx: 1500, tx: 100 });
    expect(graph.paths[0].packets).toBeNull();
  });

  it('draws a planned vNIC as a dashed path that moves no traffic', () => {
    const graph = buildHostGraph({
      interfaces: [{ link: 'igb0', class: 'phys', state: 'up', speed: 1000 }],
      machines: [
        {
          name: 'web-2',
          status: 'installed',
          configuration: { net: [{ physical: 'vnic5', 'global-nic': 'igb0' }] },
        },
      ],
      usage: [{ link: 'igb0', rx_mbps: 5, tx_mbps: 5 }],
    });
    const path = buildPathGraph(sliceForMachine(graph, 'web-2'));
    expect(path.paths[0]).toMatchObject({ ghost: true, rate: null });
    expect(path.links.every(link => link.ghost)).toBe(true);
    expect(path.hot).toBe('');
  });
});

describe('orderPaths and railLayout', () => {
  it('groups paths by the node they end at, then by each node before it', () => {
    const paths = [
      { id: 'a', nodes: ['a', 'p1', 'u1'] },
      { id: 'b', nodes: ['b', 's1'] },
      { id: 'c', nodes: ['c', 'p2', 'u1'] },
      { id: 'd', nodes: ['d', 'p1', 'u1'] },
    ];
    const ordered = orderPaths(paths);
    expect(ordered.map(path => path.id)).toEqual(['a', 'd', 'c', 'b']);
    const layers = new Map(
      ['a', 'b', 'c', 'd', 'p1', 'p2', 's1', 'u1'].map(id => [
        id,
        { layer: { p1: 1, p2: 1, s1: 1, u1: 2 }[id] ?? 0 },
      ])
    );
    const layout = railLayout(ordered, layers, 3);
    expect(layout.places.get('p1')).toEqual({ row: 0, span: 2 });
    expect(layout.places.get('u1')).toEqual({ row: 0, span: 3 });
    expect(layout.separators).toEqual([3]);
    expect(layout.places.get('s1')).toEqual({ row: 4, span: 1 });
    expect(layout.ends).toEqual([{ id: 'end:s1', layer: 2, row: 4, span: 1 }]);
    expect(layout.rows).toBe(5);
  });
});

describe('hopPoints', () => {
  it("sums a hop's series per instant, a gap a null point", () => {
    const rows = [
      { link: 'a', rx_mbps: 1, tx_mbps: 2, scan_timestamp: '2026-10-07T12:00:00Z' },
      { link: 'b', rx_mbps: 3, tx_mbps: 4, scan_timestamp: '2026-10-07T12:00:00Z' },
      { link: 'a', gap: true, scan_timestamp: '2026-10-07T12:00:10Z' },
      { link: 'c', rx_mbps: 9, tx_mbps: 9, scan_timestamp: '2026-10-07T12:00:20Z' },
    ];
    const at = Date.parse('2026-10-07T12:00:00Z');
    const gap = Date.parse('2026-10-07T12:00:10Z');
    expect(hopPoints([seriesKey('link', 'a'), seriesKey('link', 'b')], { link: rows })).toEqual({
      first: [
        [at, 4],
        [gap, null],
      ],
      second: [
        [at, 6],
        [gap, null],
      ],
      total: [
        [at, 10],
        [gap, null],
      ],
    });
  });

  it("reads an adapter's bytes a second from the machine's usage as megabits", () => {
    const at = Date.parse('2026-10-07T12:00:00Z');
    const rows = [
      { scan_timestamp: '2026-10-07T12:00:00Z', nics: [{ adapter: 2, rx_bps: 125000, tx_bps: 0 }] },
      { scan_timestamp: '2026-10-07T12:00:05Z', nics: [{ adapter: 2, rx_bps: null }] },
    ];
    expect(hopPoints([seriesKey('adapter', 2)], { adapter: rows }).first).toEqual([
      [at, 1],
      [Date.parse('2026-10-07T12:00:05Z'), null],
    ]);
  });
});

describe('buildPathGeometry', () => {
  const edgesFor = (graph, { height = 0 } = {}) => {
    const edges = new Map();
    const put = (id, layer, y) => {
      const left = layer * 300;
      edges.set(id, { l: { x: left, y }, r: { x: left + 150, y }, h: height });
    };
    graph.nodes.forEach(node => {
      const place = graph.layout.places.get(node.id);
      if (place) {
        put(node.id, node.layer, (place.row + place.span / 2) * 40);
      }
    });
    graph.layout.stacks.forEach(stack => {
      stack.nodes.forEach((id, index) => {
        put(id, stack.layer, (stack.row + ((index + 0.5) * stack.span) / stack.nodes.length) * 40);
      });
    });
    return edges;
  };

  const lastY = d => Number(d.split(',').at(-1));

  const pipeOf = capacity => pipeWidth(capacity);

  const offsetOf = capacity => pipeOf(capacity) / 2 + 2;

  it('draws a hop without a known capacity as two plain lanes and one with it as two hollow pipes filled by the rate, one flow a lane end to end', () => {
    const graph = buildPathGraph(sliceForMachine(vboxGraph(), SWITCHBOARD));
    const geometry = buildPathGeometry(graph, edgesFor(graph));
    const nat = geometry.segments.find(segment => segment.id === 'vnic:adapter 1>switch:nat');
    expect(nat.lanes.map(lane => lane.d)).toEqual(['M150,14 L 300,14', 'M150,26 L 300,26']);
    expect(nat.lanes.map(lane => lane.hollow)).toEqual([null, null]);
    expect(nat.lanes.every(lane => !/[CQ]/u.test(lane.d))).toBe(true);
    const pipe = pipeOf(1000);
    const off = offsetOf(1000);
    const bridged = geometry.segments.find(
      segment => segment.id === `vnic:adapter 2>portgroup:bridged|${INTEL}`
    );
    expect(bridged.lanes[1]).toMatchObject({
      width: pipe,
      hollow: pipe - 2.5,
      fill: Math.max(1.5, (pipe - 2.5) * 0.1),
      heat: 'green',
      stripe: null,
    });
    const flows = geometry.flows.filter(flow => flow.paths[0] === 'vnic:adapter 2');
    expect(flows.map(flow => flow.lane)).toEqual(['rx', 'tx']);
    const [, sent] = flows;
    const y = 100 + off;
    expect(sent.d).toBe(`M150,${y} L 300,${y} L 450,${y} L 600,${y}`);
    expect(sent.length).toBe(450);
    expect(sent.mbps).toBe(100);
    expect(sent.dotMin).toBe(2);
    expect(sent.pieces).toEqual([
      { end: 300, heat: 'green', tint: `bridged|${INTEL}`, inner: pipe - 2.5 },
      { end: 450, heat: 'green', tint: `bridged|${INTEL}`, inner: pipe - 2.5 },
    ]);
  });

  it('flies every live lane and spans the packet sizes across the flows that move', () => {
    const { slice } = firewallGraph();
    const graph = buildPathGraph(slice);
    const geometry = buildPathGeometry(graph, edgesFor(graph));
    const wan = geometry.flows.filter(flow => flow.paths[0] === 'vnic:vnice3_4001_0');
    expect(wan.map(flow => [flow.lane, flow.mbps])).toEqual([
      ['rx', 2400],
      ['tx', 950],
    ]);
    const moving = geometry.flows.map(flow => flow.mbps).filter(mbps => mbps > 0);
    expect(geometry.range).toEqual({
      lo: packetBytes(Math.min(...moving)),
      hi: packetBytes(Math.max(...moving)),
    });
  });

  it('heats a lane by its share of a known speed, sizes a pipe by its capacity and a packet by the bytes it carries', () => {
    expect(laneHeat(0, 1000)).toBe('idle');
    expect(laneHeat(5, 0)).toBe('tint');
    expect(laneHeat(100, 1000)).toBe('green');
    expect(laneHeat(500, 1000)).toBe('yellow');
    expect(laneHeat(700, 1000)).toBe('orange');
    expect(laneHeat(950, 1000)).toBe('red');
    expect(laneWidth(0)).toBe(3);
    expect(laneWidth(10000)).toBe(8);
    expect(laneWidth(0, 1.5)).toBe(4.5);
    expect(laneWidth(1)).toBeGreaterThan(laneWidth(0.01));
    expect(pipeWidth(10)).toBe(6);
    expect(pipeWidth(100)).toBe(6);
    expect(pipeWidth(100000)).toBe(20);
    expect(pipeWidth(1000000)).toBe(20);
    expect(pipeWidth(10000, 1.5)).toBeCloseTo((6 + (14 * 2) / 3) * 1.5, 6);
    expect(packetBytes(8)).toBeCloseTo(1000000 / packetSpawnRate(8), 6);
    expect(packetBytes(800)).toBeGreaterThan(packetBytes(8));
    expect(tightRate(4.2)).toBe('4M');
    expect(tightRate(0.82)).toBe('820K');
    expect(tightRate(2600)).toBe('3G');
    expect(tightRate(999.7)).toBe('1G');
  });

  it('turns a lone wire down a row with a vertical elbow before its target', () => {
    const { slice } = firewallGraph();
    const graph = buildPathGraph(slice);
    const edges = edgesFor(graph);
    const uplink = edges.get('uplink:ixgbe0');
    const drop = 220;
    edges.set('uplink:ixgbe0', {
      ...uplink,
      l: { ...uplink.l, y: uplink.l.y + drop },
      r: { ...uplink.r, y: uplink.r.y + drop },
    });
    const geometry = buildPathGeometry(graph, edges);
    const turn = geometry.segments.find(
      segment => segment.id === 'portgroup:ixgbe0|99>uplink:ixgbe0'
    );
    const off = offsetOf(10000);
    const top = 540;
    const bottom = top + drop;
    expect(turn.lanes[0].d).toBe(
      `M450,${top - off} L ${584 + off},${top - off} L ${584 + off},${bottom - off} L 600,${bottom - off}`
    );
    expect(turn.lanes[1].d).toBe(
      `M450,${top + off} L ${584 - off},${top + off} L ${584 - off},${bottom + off} L 600,${bottom + off}`
    );
    expect(turn.lanes.map(lane => lane.heat)).toEqual(['green', 'green']);
    expect(turn.lanes[0].pill.label).toBe('↓2.4G');
  });

  const twoOnOne = () =>
    buildPathGraph(
      sliceForMachine(
        buildHostGraph({
          interfaces: [{ link: 'ixgbe1', class: 'phys', state: 'up', speed: 10000 }],
          vnics: [
            { link: 'vnic0', over: 'ixgbe1', vid: 4, zone: FIREWALL },
            { link: 'vnic1', over: 'ixgbe1', vid: 4, zone: FIREWALL },
          ],
          machines: [{ name: FIREWALL, status: 'running' }],
          usage: [
            { link: 'vnic0', rx_mbps: 10, tx_mbps: 5 },
            { link: 'vnic1', rx_mbps: 20, tx_mbps: 5 },
          ],
        }),
        FIREWALL
      )
    );

  it('staggers wires that converge on a chip tall enough, each its own bend and its own height into the chip', () => {
    const graph = twoOnOne();
    const geometry = buildPathGeometry(graph, edgesFor(graph, { height: 80 }));
    expect(geometry.trunks).toEqual([]);
    const lanesOf = id =>
      geometry.segments.find(segment => segment.id === `${id}>portgroup:ixgbe1|4`).lanes;
    const off = offsetOf(10000);
    const extent = pipeOf(10000) + off * 2;
    const slots = [40 - extent / 2, 40 + extent / 2];
    const ends = [...lanesOf('vnic:vnic0'), ...lanesOf('vnic:vnic1')].map(lane => lastY(lane.d));
    [slots[0] - off, slots[0] + off, slots[1] - off, slots[1] + off].forEach((y, index) => {
      expect(ends[index]).toBeCloseTo(y, 6);
    });
    const flow = geometry.flows.find(entry => entry.id === 'vnic:vnic0|tx');
    expect(flow.d).toContain(`300,${lanesOf('vnic:vnic0')[1].d.split(',').at(-1)}`);
  });

  it('merges wires that converge on a short chip into one trunk, each lane a stripe of its share', () => {
    const graph = twoOnOne();
    const geometry = buildPathGeometry(graph, edgesFor(graph, { height: 30 }));
    const width = pipeOf(10000) * 2 + 2;
    expect(geometry.trunks).toHaveLength(1);
    expect(geometry.trunks[0]).toMatchObject({
      id: 'trunk:portgroup:ixgbe1|4',
      width,
      hollow: width - 2.5,
      paths: ['vnic:vnic0', 'vnic:vnic1'],
    });
    expect(geometry.widestTrunk).toBeCloseTo(width + 16 + 20, 6);
    const [rx] = geometry.segments.find(
      segment => segment.id === 'vnic:vnic0>portgroup:ixgbe1|4'
    ).lanes;
    const wall = Number(/L (?<x>[\d.]+),/u.exec(rx.d).groups.x);
    expect(wall).toBeCloseTo(300 - 16 - width, 6);
    expect(rx.stripe.width).toBeGreaterThan(0);
    expect(rx.stripe.d.startsWith(`M${wall},`)).toBe(true);
  });

  it('flies a path over an aggregate on through each up member at its share, and stops at the aggregate where the members are hidden', () => {
    const graph = buildPathGraph(aggregateSlice());
    const edges = edgesFor(graph);
    const geometry = buildPathGeometry(graph, edges);
    expect(geometry.flows.map(flow => [flow.id, flow.mbps])).toEqual([
      ['vnic:vnic0|rx|member:aggr0:ixgbe1', 7.5],
      ['vnic:vnic0|tx|member:aggr0:ixgbe1', 1.25],
      ['vnic:vnic0|rx|member:aggr0:ixgbe2', 2.5],
      ['vnic:vnic0|tx|member:aggr0:ixgbe2', 3.75],
    ]);
    expect(geometry.flows[0].pieces.at(-1)).toMatchObject({
      heat: 'green',
      inner: pipeOf(10000) - 2.5,
    });
    const down = geometry.segments.find(
      segment => segment.id === 'uplink:aggr0>member:aggr0:ixgbe3'
    );
    expect(down.down).toBe(true);
    expect(down.lanes).toHaveLength(1);
    expect(down.lanes[0]).toMatchObject({
      lane: 'down',
      heat: 'down',
      width: pipeOf(10000),
      hollow: pipeOf(10000) - 2.5,
    });
    expect(down.lanes[0].pill.key).toBe('hostTools.networkPath.down');
    graph.layout.stacks[0].nodes.forEach(id => edges.delete(id));
    const hidden = buildPathGeometry(graph, edges);
    expect(hidden.flows.map(flow => [flow.id, flow.mbps])).toEqual([
      ['vnic:vnic0|rx', 10],
      ['vnic:vnic0|tx', 5],
    ]);
    expect(hidden.segments.some(segment => segment.down)).toBe(false);
  });

  it('labels a compact rail in whole units centred in the connector and sizes everything by the scale', () => {
    const graph = buildPathGraph(sliceForMachine(vboxGraph(), SWITCHBOARD));
    const compact = buildPathGeometry(graph, edgesFor(graph), { compact: true });
    const bridged = compact.segments.find(
      segment => segment.id === `vnic:adapter 2>portgroup:bridged|${INTEL}`
    );
    const [, sent] = bridged.lanes;
    expect(sent.pill.label).toBe('↑100M');
    expect(sent.pill.x).toBe(225);
    expect(sent.pill.y).toBeCloseTo(100 + offsetOf(1000) + 7.5 + pipeOf(1000) / 2, 6);
    const scaled = buildPathGeometry(graph, edgesFor(graph), { scale: 1.5 });
    const nat = scaled.segments.find(segment => segment.id === 'vnic:adapter 1>switch:nat');
    expect(nat.lanes.map(lane => lane.d)).toEqual(['M150,11 L 300,11', 'M150,29 L 300,29']);
    expect(nat.lanes[0].width).toBe(laneWidth(0.8, 1.5));
    expect(scaled.flows[0].scale).toBe(1.5);
    expect(scaled.flows[0].dotMin).toBe(3);
  });
});

describe('the fit levels', () => {
  it('folds an 800 pixel card with members through compact to the member fold and back as the card widens, never scrolling', () => {
    const levels = fitLevelsOf(true);
    expect(levels).toEqual(['full', 'compact', 'fold', 'small']);
    expect(fitLevelsOf(false)).toEqual(['full', 'compact', 'small']);
    const top = levels.length - 1;
    const needs = new Map();
    const step = (level, room, drawn) => {
      const next = nextFitLevel({ level, top, room, drawn, needs });
      if (next.need !== null) {
        needs.set(level, next.need);
      }
      return next.level;
    };
    expect(step(0, 800, 876)).toBe(1);
    expect(step(1, 800, 800)).toBe(1);
    expect(step(1, 700, 760)).toBe(2);
    expect(step(2, 700, 690)).toBe(2);
    expect(step(2, 780, 700)).toBe(1);
    expect(step(1, 900, 900)).toBe(0);
    expect(step(0, 900, 900)).toBe(0);
    expect(step(3, 200, 320)).toBe(3);
  });
});

describe('the words and the utilization', () => {
  it('titles a network by its kind and measures a rate against a speed', () => {
    expect(networkTitleOf({ kind: 'vlan', vlanId: 99, carrier: 'ixgbe0' })).toEqual({
      key: 'hostTools.topology.vlanNetwork',
      values: { vlanId: 99 },
    });
    expect(networkTitleOf({ kind: 'nat', vlanId: 0, carrier: 'nat' }).key).toBe(
      'hostTools.topology.natShared'
    );
    expect(utilizationOf({ rx: 10, tx: 500 }, 1000)).toBe(0.5);
    expect(utilizationOf({ rx: 10, tx: 500 }, 0)).toBeNull();
  });
});
