import { describe, expect, it } from 'vitest';

import { buildNicBody } from '../../src/features/hosts/components/NetworkTopology/topologyApply.js';
import { plannedNetworksFor } from '../../src/features/hosts/components/NetworkTopology/topologyMeasure.js';
import {
  buildHostGraph,
  detectSharedNetworks,
  sliceForMachine,
} from '../../src/features/hosts/components/NetworkTopology/topologyModel.js';
import {
  buildVBoxGraph,
  vboxModeForKind,
} from '../../src/features/hosts/components/NetworkTopology/topologyModelVBox.js';
import {
  MOTION_IDLE,
  MOTION_NO_FEED,
  MOTION_TRAFFIC,
  assignNetworkColors,
  flowPeriod,
  motionState,
  rateLabels,
  utilization,
  utilizationColor,
  widthForCount,
} from '../../src/features/hosts/components/NetworkTopology/topologyPalette.js';
import { machineUsageOf } from '../../src/features/hosts/components/NetworkTopology/useTopologyFeed.js';

const INTERFACES = [
  { link: 'igb0', class: 'phys', state: 'up', speed: 1000, mtu: 1500 },
  { link: 'igb1', class: 'phys', state: 'down', speed: 0, mtu: 1500 },
  { link: 'stub0', class: 'etherstub', state: 'unknown', mtu: 9000 },
  { link: 'LINK', class: 'phys' },
];

const VNICS = [
  {
    link: 'vnic0',
    over: 'igb0',
    vid: 0,
    zone: 'web-1',
    macaddress: '02:08:20:aa:bb:01',
    mtu: 1500,
  },
  { link: 'vnic1', over: 'igb0', vid: 100, zone: 'web-2', mtu: 1500 },
  { link: 'vnic2', over: 'stub0', vid: 0, zone: '--', mtu: 9000 },
];

const MACHINES = [
  { name: 'web-1', status: 'running' },
  {
    name: 'web-2',
    status: 'installed',
    configuration: {
      net: [{ physical: 'vnic1', 'global-nic': 'igb0', 'vlan-id': 100 }, { 'global-nic': 'igb1' }],
    },
  },
  { name: 'db-1', status: 'running' },
];

const USAGE = [
  { link: 'igb0', rx_mbps: '4', tx_mbps: '1', interface_speed_mbps: 1000 },
  { link: 'vnic0', rx_mbps: '2.5', tx_mbps: '0.5' },
  { link: 'gone0', rx_mbps: '1', tx_mbps: '1' },
];

const ADDRESSES = [
  { interface: 'igb0', ip_address: '10.0.0.31', prefix_length: 24, ip_version: 'v4' },
  { interface: 'igb0', ip_address: 'fe80::1', prefix_length: 10, ip_version: 'v6' },
];

describe('buildHostGraph', () => {
  const graph = buildHostGraph({
    interfaces: INTERFACES,
    aggregates: [{ link: 'aggr0', over: 'igb0,igb1', state: 'up', policy: 'L4' }],
    etherstubs: [],
    vnics: VNICS,
    machines: MACHINES,
    usage: USAGE,
    ipAddresses: ADDRESSES,
  });

  it('draws the adapters, the aggregate first with its members, the physical rows after', () => {
    expect(graph.adapters.map(a => [a.id, a.kind, a.memberOf])).toEqual([
      ['aggr0', 'aggr', undefined],
      ['igb0', 'phys', 'aggr0'],
      ['igb1', 'phys', 'aggr0'],
    ]);
    expect(graph.adapters[0].speedMbps).toBe(1000);
    expect(graph.adapters[1].ips).toHaveLength(2);
    expect(graph.adapters[1].usage).toEqual({ rxMbps: 4, txMbps: 1, speedMbps: 1000 });
  });

  it('draws the etherstub as a switch with its port count', () => {
    expect(graph.switches).toEqual([
      { id: 'stub0', name: 'stub0', state: 'unknown', mtu: 9000, ports: 1, usage: null },
    ]);
  });

  it('derives one network per carrier and VLAN with live and planned counts', () => {
    const byId = Object.fromEntries(graph.networks.map(net => [net.id, net]));
    expect(byId['igb0|0']).toMatchObject({
      carrier: 'igb0',
      vlanId: 0,
      kind: 'untagged',
      live: 1,
      planned: 0,
    });
    expect(byId['igb0|100']).toMatchObject({ kind: 'vlan', live: 1, planned: 0 });
    expect(byId['stub0|0']).toMatchObject({ kind: 'internal', carrierKind: 'etherstub', live: 1 });
    expect(byId['igb1|0']).toMatchObject({ planned: 1, live: 0 });
    expect(byId['igb0|0'].usage).toEqual({ rxMbps: 2.5, txMbps: 0.5 });
  });

  it('draws the consumers with their NICs, a planned NIC as a ghost and the global zone last', () => {
    const web2 = graph.consumers.find(c => c.id === 'web-2');
    expect(web2.running).toBe(false);
    expect(web2.ghostOnly).toBe(false);
    expect(web2.nics.map(nic => [nic.link, nic.ghost, nic.synthetic])).toEqual([
      ['vnic1', false, false],
      ['web-2-planned', true, true],
    ]);
    const db = graph.consumers.find(c => c.id === 'db-1');
    expect(db.nics).toEqual([]);
    expect(graph.consumers[graph.consumers.length - 1]).toMatchObject({
      id: 'global',
      type: 'global',
    });
    expect(graph.feedPresent).toBe(true);
  });

  it('counts the issues the debug lens draws', () => {
    expect(graph.issues.downAdapters).toEqual([]);
    expect(graph.issues.emptySwitches).toEqual([]);
    expect(graph.issues.unassignedVnics).toEqual(['vnic2']);
    expect(graph.issues.staleUsageLinks).toEqual(['gone0']);
    expect(graph.issues.disconnectedMachines.map(c => c.id)).toEqual(['db-1']);
  });

  it('answers an empty graph with no feed for nothing', () => {
    const empty = buildHostGraph({});
    expect(empty.feedPresent).toBe(false);
    expect(empty.adapters).toEqual([]);
    expect(empty.consumers).toEqual([]);
  });

  it('slices the graph to one machine and finds the networks two hosts share', () => {
    const slice = sliceForMachine(graph, 'web-1');
    expect(slice.consumers.map(c => c.id)).toEqual(['web-1']);
    expect(slice.networks.map(n => n.id)).toEqual(['igb0|0']);
    expect(slice.adapters.map(a => a.id)).toEqual(['aggr0', 'igb0']);
    expect(sliceForMachine(graph, 'db-1')).toBeNull();
    const twin = buildHostGraph({
      interfaces: INTERFACES,
      vnics: VNICS,
      machines: MACHINES,
      ipAddresses: ADDRESSES,
    });
    const shared = detectSharedNetworks([
      { server: { id: 3, entity_name: 'Zones', hostname: 'zone-1' }, graph },
      { server: { id: 5, hostname: 'store-1' }, graph: twin },
    ]);
    expect(shared).toHaveLength(2);
    expect(shared[0]).toMatchObject({
      subnet: '10.0.0.0/24',
      vlanId: 0,
      hosts: ['Zones', 'store-1'],
    });
    expect(shared[0].refs).toEqual([
      { hostKey: '3', netId: 'igb0|0' },
      { hostKey: '5', netId: 'igb0|0' },
    ]);
    expect(detectSharedNetworks([{ server: { id: 3 }, graph }])).toEqual([]);
  });
});

describe('buildVBoxGraph', () => {
  const details = new Map([
    [
      'dev-1',
      {
        knob_current: {
          devices: {
            nics: [
              { adapter: 1, mode: 'natnetwork', network: 'NatNetwork', mac: '080027AABB01' },
              { adapter: 2, mode: 'bridged', network: 'Ethernet' },
              { adapter: 3, mode: 'nat' },
            ],
          },
        },
      },
    ],
  ]);
  const graph = buildVBoxGraph({
    interfaces: [{ link: 'Ethernet', class: 'phys', state: 'up', speed: 1000 }],
    spaces: [
      {
        type: 'natnetwork',
        name: 'NatNetwork',
        cidr: '10.0.2.0/24',
        gateway: '10.0.2.1',
        dhcp_enabled: true,
      },
      {
        type: 'hostonly',
        name: 'vboxnet0',
        ip_address: '192.168.56.1',
        network_mask: '255.255.255.0',
        dhcp: { enabled: true },
      },
      { type: 'intnet', name: 'intnet' },
    ],
    machines: [
      { name: 'dev-1', status: 'running' },
      { name: 'dev-2', status: 'stopped' },
    ],
    machineDetails: details,
    usage: [
      { link: 'Ethernet', rx_mbps: 6, tx_mbps: 1.6, interface_speed_mbps: 1000 },
      { link: 'Wi-Fi', rx_mbps: 0, tx_mbps: 0 },
    ],
    machineUsage: new Map([['dev-1', new Map([['1', { rxMbps: 1, txMbps: 0.5, speedMbps: 0 }]])]]),
    ipAddresses: [],
  });

  it("reads each machine's adapters from its detail against the spaces", () => {
    const dev1 = graph.consumers.find(c => c.id === 'dev-1');
    expect(dev1.nics.map(nic => [nic.link, nic.networkId, nic.mode, nic.mac])).toEqual([
      ['adapter 1', 'space|natnetwork|NatNetwork', 'natnetwork', '080027AABB01'],
      ['adapter 2', 'bridged|Ethernet', 'bridged', null],
      ['adapter 3', 'nat|shared', 'nat', null],
    ]);
    expect(dev1.nics[0].usage).toEqual({ rxMbps: 1, txMbps: 0.5, speedMbps: 0 });
    expect(graph.consumers.find(c => c.id === 'dev-2').nics).toEqual([]);
  });

  it('draws every space as a network with its detail, the NAT switch only while used', () => {
    const byId = Object.fromEntries(graph.networks.map(net => [net.id, net]));
    expect(byId['space|natnetwork|NatNetwork']).toMatchObject({
      kind: 'natnetwork',
      carrierKind: 'space',
      live: 1,
      detail: '10.0.2.0/24 · 10.0.2.1 · dhcp',
    });
    expect(byId['space|hostonly|vboxnet0']).toMatchObject({
      kind: 'hostonly',
      live: 0,
      detail: '192.168.56.1 · 255.255.255.0 · dhcp',
    });
    expect(byId['space|intnet|intnet']).toMatchObject({ kind: 'internal', detail: null });
    expect(byId['bridged|Ethernet'].usage).toEqual({ rxMbps: 6, txMbps: 1.6, speedMbps: 1000 });
    expect(byId['space|natnetwork|NatNetwork'].usage).toEqual({ rxMbps: 1, txMbps: 0.5 });
    expect(graph.switches.map(s => [s.id, s.ports])).toEqual([
      ['NatNetwork', 1],
      ['vboxnet0', 0],
      ['intnet', 0],
      ['nat', 1],
    ]);
    expect(graph.issues.staleUsageLinks).toEqual(['Wi-Fi']);
    expect(graph.issues.emptySwitches.map(s => s.id)).toEqual(['vboxnet0', 'intnet']);
  });

  it('synthesizes an adapter for a bridged carrier no interface row names', () => {
    const bare = buildVBoxGraph({
      machines: [{ name: 'dev-1', status: 'running' }],
      machineDetails: new Map([
        [
          'dev-1',
          {
            knob_current: { devices: { nics: [{ adapter: 1, mode: 'bridged', network: 'en0' }] } },
          },
        ],
      ]),
    });
    expect(bare.adapters).toEqual([
      {
        id: 'en0',
        name: 'en0',
        kind: 'phys',
        state: 'unknown',
        speedMbps: 0,
        mtu: null,
        members: [],
        memberOf: null,
        ips: [],
        usage: null,
      },
    ]);
    expect(bare.feedPresent).toBe(false);
    expect(vboxModeForKind.internal).toBe('intnet');
  });
});

describe('the palette', () => {
  it('colors the networks by live count, internal ones neutral and planned ones ghost', () => {
    const colors = assignNetworkColors([
      { id: 'a', kind: 'untagged', live: 1 },
      { id: 'b', kind: 'vlan', live: 5 },
      { id: 'c', kind: 'internal', live: 2 },
      { id: 'd', kind: 'vlan', live: 0 },
    ]);
    expect(colors.get('b')).toBe('var(--hw-topo-net-1)');
    expect(colors.get('a')).toBe('var(--hw-topo-net-2)');
    expect(colors.get('c')).toBe('var(--hw-topo-net-internal)');
    expect(colors.get('d')).toBe('var(--hw-topo-ghost)');
  });

  it('widths, motion, period, utilization and labels', () => {
    expect(widthForCount(0)).toBe(4);
    expect(widthForCount(4)).toBe(8);
    expect(widthForCount(1000)).toBe(18);
    expect(motionState(false, { rxMbps: 5, txMbps: 5 })).toBe(MOTION_NO_FEED);
    expect(motionState(true, { rxMbps: 0, txMbps: 0 })).toBe(MOTION_IDLE);
    expect(motionState(true, { rxMbps: 0.1, txMbps: 0 })).toBe(MOTION_TRAFFIC);
    expect(flowPeriod(0)).toBe(0);
    expect(flowPeriod(9)).toBeCloseTo(2.1, 5);
    expect(flowPeriod(1000000)).toBe(0.5);
    expect(utilization(500, 1000)).toBe(0.5);
    expect(utilization(5000, 1000)).toBe(1);
    expect(utilization(5, 0)).toBe(0);
    expect(utilizationColor(0)).toBe('var(--hw-topo-idle-flow)');
    expect(utilizationColor(0.05)).toBe('hsl(230, 90%, 60%)');
    expect(utilizationColor(1)).toBe('hsl(0, 100%, 50%)');
    expect(rateLabels(false, null)).toBeNull();
    expect(rateLabels(true, { rxMbps: 1500, txMbps: 2.5 })).toEqual({
      rx: '1.5 Gbps',
      tx: '2.5 Mbps',
      total: '1.5 Gbps',
    });
    expect(rateLabels(true, { rxMbps: 0.25, txMbps: 0 })).toEqual({
      rx: '250 Kbps',
      tx: '0 Kbps',
      total: '250 Kbps',
    });
  });
});

describe('buildNicBody and the planned networks', () => {
  it('speaks VirtualBox for a vbox host, the NAT re-attach without a network', () => {
    const moves = [
      { adapter: 1, toMode: 'bridged', toCarrier: 'Ethernet' },
      { adapter: 2, toMode: 'nat', toCarrier: 'nat' },
      { isAdd: true, toCarrier: 'Ethernet' },
      { isRemove: true, adapter: 3 },
    ];
    expect(buildNicBody('vbox', moves)).toEqual({
      body: {
        nics: [
          { adapter: 1, mode: 'bridged', network: 'Ethernet' },
          { adapter: 2, mode: 'nat' },
        ],
        add_nics: [{ global_nic: 'Ethernet' }],
        remove_nics: [3],
      },
    });
  });

  it('speaks bhyve for a zone host and refuses an unnamed add', () => {
    const moves = [
      { link: 'vnic0', toCarrier: 'igb0', toVlanId: 100 },
      { isAdd: true, newName: ' vnic9 ', toCarrier: 'stub0', toVlanId: 0 },
      { isRemove: true, link: 'vnic1' },
    ];
    expect(buildNicBody('bhyve', moves)).toEqual({
      body: {
        update_nics: [{ physical: 'vnic0', global_nic: 'igb0', vlan_id: 100 }],
        add_nics: [{ physical: 'vnic9', global_nic: 'stub0' }],
        remove_nics: ['vnic1'],
      },
    });
    expect(buildNicBody('bhyve', [{ isAdd: true, newName: '', toCarrier: 'igb0' }])).toEqual({
      error: 'unnamed',
    });
    expect(buildNicBody('bhyve', [])).toEqual({ body: {} });
  });

  it('materializes a planned network card for a staged target that has none', () => {
    const graph = { networks: [{ id: 'igb0|0' }], switches: [{ id: 'stub0' }] };
    const planned = plannedNetworksFor(graph, [
      { toNetId: 'igb0|0', toCarrier: 'igb0', toVlanId: 0 },
      { toNetId: 'igb0|200', toCarrier: 'igb0', toVlanId: 200 },
      { toNetId: 'igb0|200', toCarrier: 'igb0', toVlanId: 200 },
      { toNetId: 'stub0|0', toCarrier: 'stub0', toVlanId: 0 },
      { toNetId: 'bridged|en0', toCarrier: 'en0', hostKind: 'vbox', toMode: 'bridged' },
      { toNetId: null, isRemove: true },
    ]);
    expect(planned.map(net => [net.id, net.kind, net.carrierKind, net.planned])).toEqual([
      ['igb0|200', 'vlan', 'phys', 1],
      ['stub0|0', 'internal', 'etherstub', 1],
      ['bridged|en0', 'bridged', 'phys', 1],
    ]);
  });
});

describe('machineUsageOf', () => {
  it('reads the per-machine adapter rates of the usage payload in either shape', () => {
    const rates = machineUsageOf({
      usage: [
        { machine_name: 'dev-1', nics: [{ adapter: 1, rx_bps: 8000000, tx_bps: '2000000' }] },
        { name: 'dev-2', network: [{ adapter: 2, rx_bps: 0, tx_bps: 0 }] },
        { machine_name: 'dev-3' },
      ],
    });
    expect(rates.get('dev-1').get('1')).toEqual({ rxMbps: 8, txMbps: 2, speedMbps: 0 });
    expect(rates.get('dev-2').get('2')).toEqual({ rxMbps: 0, txMbps: 0, speedMbps: 0 });
    expect(rates.has('dev-3')).toBe(false);
    expect(machineUsageOf(null).size).toBe(0);
    expect(
      machineUsageOf({
        machines: [{ machine: 'x', nics: [{ adapter: 1, rx_bps: 1, tx_bps: 1 }] }],
      }).has('x')
    ).toBe(true);
  });
});
