import { describe, expect, it } from 'vitest';

import { chartOf } from '../../src/features/hosts/charts/registry.js';
import { READS } from '../../src/features/hosts/utils/monitoring.js';
import {
  ADDRESS_FILTERS,
  CHART_SORTS,
  DEFAULT_CHART_SORT,
  INTERFACE_FILTERS,
  NETWORKING_TOKENS,
  ROUTE_FILTERS,
  addressKey,
  addressOf,
  addressRows,
  addressTone,
  bandwidthOf,
  bandwidthTone,
  carries,
  classTone,
  formatBandwidth,
  formatSpeed,
  hostHasNetworking,
  interfaceSpec,
  intervalOf,
  matchesAddress,
  matchesInterface,
  matchesRoute,
  matchesUsage,
  packetsOf,
  prefixOf,
  routeKey,
  routeRows,
  sortedInterfaces,
  summarySpec,
  usageRows,
} from '../../src/features/hosts/utils/networking.js';
import { networkSeries } from '../../src/features/hosts/utils/series.js';

const rowOf = features => ({ capabilities: { features } });

const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);

const EARLY = '2026-09-27T11:59:00.000Z';
const LATE = '2026-09-27T12:00:00.000Z';

const SAMPLES = [
  { link: 'igb0', rx_mbps: '1.5', tx_mbps: '0.5', scan_timestamp: EARLY },
  { link: 'igb0', rx_mbps: '4', tx_mbps: '1', scan_timestamp: LATE },
  { link: 'vnic0', rx_mbps: '0.25', tx_mbps: '9', scan_timestamp: EARLY },
  { link: 'vnic0', rx_mbps: '0.5', tx_mbps: '8', scan_timestamp: LATE },
  { link: 'aggr0', rx_mbps: 0, tx_mbps: 0, scan_timestamp: LATE },
];

describe('hostHasNetworking', () => {
  it('names the two tokens of the page', () => {
    expect(NETWORKING_TOKENS).toEqual(['vnics', 'network-spaces']);
  });

  it('answers true while the row lists vnics or network-spaces', () => {
    expect(hostHasNetworking(rowOf(['machines', 'vnics']))).toBe(true);
    expect(hostHasNetworking(rowOf(['network-spaces']))).toBe(true);
  });

  it('answers false for a row that lists neither, monitoring alone included', () => {
    expect(hostHasNetworking(rowOf(['machines', 'monitoring', 'ip-addresses']))).toBe(false);
    expect(hostHasNetworking(rowOf([]))).toBe(false);
    expect(hostHasNetworking({ capabilities: null })).toBe(false);
    expect(hostHasNetworking(null)).toBe(false);
  });
});

describe('the reads of the networking page', () => {
  it('puts the addresses behind monitoring and the routes behind monitoring and vnics', () => {
    expect(READS['ip-addresses']).toEqual({
      path: 'monitoring/network/ipaddresses',
      tokens: ['monitoring'],
    });
    expect(READS.routes).toEqual({
      path: 'monitoring/network/routes',
      tokens: ['monitoring', 'vnics'],
    });
  });
});

describe('addressOf, prefixOf, addressKey and routeKey', () => {
  it('reads the address a row carries, its ip_address or the part of its addr before the slash', () => {
    expect(addressOf({ ip_address: '10.0.0.31', addr: '10.0.0.31/24' })).toBe('10.0.0.31');
    expect(addressOf({ addr: '10.0.0.11/24' })).toBe('10.0.0.11');
    expect(addressOf({ addr: 'fe80::a00:27ff:fe4f:1a01/64' })).toBe('fe80::a00:27ff:fe4f:1a01');
    expect(addressOf({ addr: '192.168.1.4' })).toBe('192.168.1.4');
    expect(addressOf({ ip_address: '', addr: '10.0.0.9/8' })).toBe('10.0.0.9');
    expect(addressOf({ interface: 'en0' })).toBe('');
    expect(addressOf(null)).toBe('');
  });

  it('reads the prefix a row carries, its prefix_length or the part of its addr after the slash', () => {
    expect(prefixOf({ prefix_length: 24 })).toBe('/24');
    expect(prefixOf({ prefix_length: '64' })).toBe('/64');
    expect(prefixOf({ prefix_length: 0 })).toBe('/0');
    expect(prefixOf({ prefix_length: 8, addr: '127.0.0.1/16' })).toBe('/8');
    expect(prefixOf({ addr: '10.0.0.5/24' })).toBe('/24');
    expect(prefixOf({ prefix_length: null, addr: '10.0.0.5/16' })).toBe('/16');
    expect(prefixOf({ addr: '10.0.0.5' })).toBe('');
    expect(prefixOf({ prefix_length: null })).toBe('');
    expect(prefixOf(null)).toBe('');
  });

  it('tells two addresses of one address object apart by their addr', () => {
    const first = { addrobj: 'en0/v4', addr: '10.0.0.5/24' };
    const second = { addrobj: 'en0/v4', addr: '10.0.0.6/24' };
    expect(addressKey(first)).toBe('en0/v4|10.0.0.5/24');
    expect(addressKey(first)).not.toBe(addressKey(second));
  });

  it('tells one route from another by destination, gateway, interface and version', () => {
    const route = { destination: 'default', gateway: '10.0.0.1', interface: 'igb0' };
    expect(routeKey({ ...route, ip_version: 'v4' })).toBe('default|10.0.0.1|igb0|v4');
    expect(routeKey({ ...route, ip_version: 'v4' })).not.toBe(
      routeKey({ ...route, ip_version: 'v6' })
    );
  });
});

describe('addressRows and routeRows', () => {
  it('keeps every live row as it is, two of one address object included', () => {
    const answer = {
      addresses: [
        { addrobj: 'en0/v4', interface: 'en0', addr: '10.0.0.5/24', ip_version: 'v4' },
        { addrobj: 'en0/v4', interface: 'en0', addr: '10.0.0.6/24', ip_version: 'v4' },
      ],
    };
    expect(addressRows(answer).map(row => row.addr)).toEqual(['10.0.0.5/24', '10.0.0.6/24']);
  });

  it('keeps the newest row of each address object of an agent that keeps a history', () => {
    const answer = {
      addresses: [
        { addrobj: 'igb0/v4', ip_address: '10.0.0.9', state: 'ok', scan_timestamp: LATE },
        { addrobj: 'igb0/v4', ip_address: '10.0.0.8', state: 'ok', scan_timestamp: EARLY },
        { addrobj: 'lo0/v4', ip_address: '127.0.0.1', state: 'ok', scan_timestamp: EARLY },
      ],
    };
    expect(addressRows(answer).map(row => row.ip_address)).toEqual(['10.0.0.9', '127.0.0.1']);
  });

  it('answers no row for an answer without the member', () => {
    expect(addressRows(null)).toEqual([]);
    expect(addressRows({})).toEqual([]);
    expect(addressRows({ addresses: 'none' })).toEqual([]);
    expect(routeRows(null)).toEqual([]);
    expect(routeRows({ routes: null })).toEqual([]);
  });

  it('keeps the newest row of each route', () => {
    const route = { destination: 'default', gateway: '10.0.0.1', interface: 'igb0' };
    const answer = {
      routes: [
        { ...route, ip_version: 'v4', flags: 'UG', scan_timestamp: EARLY },
        { ...route, ip_version: 'v4', flags: 'UGS', scan_timestamp: LATE },
        { ...route, ip_version: 'v6', flags: 'UG', scan_timestamp: EARLY },
      ],
    };
    expect(routeRows(answer).map(row => [row.ip_version, row.flags])).toEqual([
      ['v4', 'UGS'],
      ['v6', 'UG'],
    ]);
  });
});

describe('usageRows and bandwidthOf', () => {
  it('keeps the newest sample of each interface in the order of their names', () => {
    expect(usageRows(SAMPLES).map(row => [row.link, row.rx_mbps])).toEqual([
      ['aggr0', 0],
      ['igb0', '4'],
      ['vnic0', '0.5'],
    ]);
    expect(usageRows([])).toEqual([]);
  });

  it('reads the rates an agent answers as text and adds them', () => {
    expect(bandwidthOf({ rx_mbps: '1.5', tx_mbps: '0.25' })).toEqual({
      rx: 1.5,
      tx: 0.25,
      total: 1.75,
    });
    expect(bandwidthOf({})).toEqual({ rx: 0, tx: 0, total: 0 });
  });
});

describe('formatBandwidth and bandwidthTone', () => {
  it('draws gigabits, megabits, kilobits and nothing', () => {
    expect(formatBandwidth(2500)).toBe('2.50 Gbps');
    expect(formatBandwidth(1000)).toBe('1.00 Gbps');
    expect(formatBandwidth(12.345)).toBe('12.35 Mbps');
    expect(formatBandwidth(1)).toBe('1.00 Mbps');
    expect(formatBandwidth(0.25)).toBe('250 Kbps');
    expect(formatBandwidth(0)).toBe('0 bps');
    expect(formatBandwidth(undefined)).toBe('0 bps');
    expect(formatBandwidth('3')).toBe('3.00 Mbps');
  });

  it('draws the tone of a rate by its size', () => {
    expect(bandwidthTone(150)).toBe('danger');
    expect(bandwidthTone(100)).toBe('warning');
    expect(bandwidthTone(51)).toBe('warning');
    expect(bandwidthTone(50)).toBe('success');
    expect(bandwidthTone(1)).toBe('info');
    expect(bandwidthTone(0.5)).toBe('info');
    expect(bandwidthTone(0)).toBe('dark');
  });
});

describe('formatSpeed, classTone, addressTone', () => {
  it('draws a speed in megabits or gigabits and nothing for none', () => {
    expect(formatSpeed(1000)).toBe('1 Gbps');
    expect(formatSpeed('10000')).toBe('10 Gbps');
    expect(formatSpeed(100)).toBe('100 Mbps');
    expect(formatSpeed(0)).toBe('');
    expect(formatSpeed(undefined)).toBe('');
    expect(formatSpeed('fast')).toBe('');
  });

  it('draws a physical class primary, a virtual one info and every other dark', () => {
    expect(classTone('phys')).toBe('primary');
    expect(classTone('vnic')).toBe('info');
    expect(classTone('etherstub')).toBe('dark');
    expect(classTone(undefined)).toBe('dark');
  });

  it('draws an address that is ok or up success and every other warning', () => {
    expect(addressTone('ok')).toBe('success');
    expect(addressTone('up')).toBe('success');
    expect(addressTone('down')).toBe('warning');
    expect(addressTone(undefined)).toBe('warning');
  });
});

describe('packetsOf, intervalOf and carries', () => {
  it('reads a count as a whole number and zero for a member not carried', () => {
    expect(packetsOf({ ipackets_delta: '1200' }, 'ipackets_delta')).toBe(1200);
    expect(packetsOf({ ipackets_delta: 12.9 }, 'ipackets_delta')).toBe(12);
    expect(packetsOf({}, 'ipackets_delta')).toBe(0);
    expect(packetsOf(null, 'ipackets_delta')).toBe(0);
  });

  it('reads the seconds a sample spans', () => {
    expect(intervalOf({ time_delta_seconds: '10.04' })).toBe(10.04);
    expect(intervalOf({})).toBe(0);
  });

  it('counts a zero as carried and an absent member as not', () => {
    const when = carries('ipackets_delta');
    expect(when([{ link: 'igb0', ipackets_delta: 0 }])).toBe(true);
    expect(when([{ link: 'en0' }, { link: 'en1', ipackets_delta: null }])).toBe(false);
    expect(when([])).toBe(false);
  });
});

describe('the matches of the four tables', () => {
  it('finds an address by its interface, its address and its address object', () => {
    const row = { interface: 'igb0', ip_address: '10.0.0.9', addrobj: 'igb0/v4' };
    expect(matchesAddress(row, 'igb')).toBe(true);
    expect(matchesAddress(row, '10.0.0')).toBe(true);
    expect(matchesAddress(row, '/v4')).toBe(true);
    expect(matchesAddress(row, 'vnic')).toBe(false);
    expect(matchesAddress({ interface: 'en0' }, 'en0')).toBe(true);
  });

  it('finds the address of a row that carries addr alone', () => {
    const row = { interface: 'Ethernet', addr: '10.0.0.11/24', addrobj: 'Ethernet/v4' };
    expect(matchesAddress(row, '10.0.0.11')).toBe(true);
    expect(matchesAddress(row, '/24')).toBe(true);
    expect(matchesAddress(row, '10.0.0.12')).toBe(false);
  });

  it('finds a route by its interface, its destination, its gateway, its mask and its flags', () => {
    const row = {
      interface: 'igb0',
      destination: 'default',
      gateway: '10.0.0.1',
      destination_mask: '255.255.255.0',
      flags: 'UG',
    };
    expect(matchesRoute(row, 'default')).toBe(true);
    expect(matchesRoute(row, '10.0.0.1')).toBe(true);
    expect(matchesRoute(row, '255.255')).toBe(true);
    expect(matchesRoute(row, 'ug')).toBe(true);
    expect(matchesRoute(row, '192.168')).toBe(false);
    expect(matchesRoute({ interface: 'igb0', destination_mask: null }, 'null')).toBe(false);
  });

  it('finds an interface by its link, its class, its MAC address and its zone', () => {
    const row = { link: 'VNIC0', class: 'vnic', macaddress: '2:8:20:aa:bb:cc', zone: 'web01' };
    expect(matchesInterface(row, 'vnic0')).toBe(true);
    expect(matchesInterface(row, 'aa:bb')).toBe(true);
    expect(matchesInterface(row, 'web')).toBe(true);
    expect(matchesInterface({ link: 'igb0', zone: '--' }, '--')).toBe(false);
  });

  it('finds a sample by its link', () => {
    expect(matchesUsage({ link: 'igb0' }, 'igb')).toBe(true);
    expect(matchesUsage({ link: 'igb0' }, 'vnic')).toBe(false);
  });
});

describe('the filter groups', () => {
  it('names the version and the state of an address', () => {
    expect(ADDRESS_FILTERS.map(group => group.key)).toEqual(['version', 'state']);
    const [version, state] = ADDRESS_FILTERS;
    expect(version.values({ ip_version: 'v4' })).toEqual(['v4']);
    expect(version.values({})).toEqual([]);
    expect(state.values({ state: 'ok' })).toEqual(['ok']);
    expect(state.labelFor('ok')).toBe('ok');
  });

  it('names the version and the flags of a route', () => {
    expect(ROUTE_FILTERS.map(group => group.key)).toEqual(['version', 'flags']);
    expect(ROUTE_FILTERS[0].values({ ip_version: 'v6' })).toEqual(['v6']);
    expect(ROUTE_FILTERS[1].values({ flags: 'UG' })).toEqual(['UG']);
    expect(ROUTE_FILTERS[1].values({})).toEqual([]);
  });

  it('names the class and the state of an interface', () => {
    expect(INTERFACE_FILTERS.map(group => group.key)).toEqual(['class', 'state']);
    expect(INTERFACE_FILTERS[0].values({ class: 'phys' })).toEqual(['phys']);
    expect(INTERFACE_FILTERS[1].values({})).toEqual([]);
  });
});

describe('the charts', () => {
  const entities = networkSeries(SAMPLES);

  it('lists the three summary charts and the four orders', () => {
    const { charts } = chartOf('network-summary');
    expect(charts.map(chart => [chart.key, chart.member])).toEqual([
      ['rx', 'first'],
      ['tx', 'second'],
      ['total', 'total'],
    ]);
    expect(CHART_SORTS.map(sort => sort.key)).toEqual(['bandwidth', 'name', 'rx', 'tx']);
    expect(DEFAULT_CHART_SORT).toBe('bandwidth');
  });

  it('draws a line an interface in a summary chart, megabits a second', () => {
    const spec = summarySpec('first', entities, t);
    expect(spec.axes).toEqual([{ name: 'hosts.charts.network.axis', min: 0, unit: ' Mbps' }]);
    expect(spec.series.map(line => [line.key, line.name, line.points.length])).toEqual([
      ['igb0', 'igb0', 2],
      ['vnic0', 'vnic0', 2],
      ['aggr0', 'aggr0', 1],
    ]);
    expect(spec.series[0].points).toEqual([
      [new Date(EARLY).getTime(), 1.5],
      [new Date(LATE).getTime(), 4],
    ]);
    expect(new Set(spec.series.map(line => line.tone)).size).toBe(3);
    expect(summarySpec('total', {}, t).series).toEqual([]);
  });

  it('draws received, sent and both of one interface, the total heavy', () => {
    const spec = interfaceSpec(entities.igb0, t);
    expect(spec.series.map(line => [line.key, line.name, line.tone, line.width])).toEqual([
      ['first', 'hosts.charts.network.rx', 'blue', 2],
      ['second', 'hosts.charts.network.tx', 'orange', 2],
      ['total', 'hosts.charts.network.total', 'green', 3],
    ]);
    expect(spec.series[2].points[1]).toEqual([new Date(LATE).getTime(), 5]);
  });

  it('orders the interfaces by the newest rate, the busiest first, or by name', () => {
    expect(sortedInterfaces(entities, 'bandwidth')).toEqual(['vnic0', 'igb0', 'aggr0']);
    expect(sortedInterfaces(entities, 'rx')).toEqual(['igb0', 'vnic0', 'aggr0']);
    expect(sortedInterfaces(entities, 'tx')).toEqual(['vnic0', 'igb0', 'aggr0']);
    expect(sortedInterfaces(entities, 'name')).toEqual(['aggr0', 'igb0', 'vnic0']);
    expect(sortedInterfaces(entities, 'unknown')).toEqual(['aggr0', 'igb0', 'vnic0']);
    expect(sortedInterfaces({}, 'bandwidth')).toEqual([]);
  });
});
