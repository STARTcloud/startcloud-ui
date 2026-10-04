import { describe, expect, it } from 'vitest';

import { NETWORKING_READS, READS, readOffered } from '../../src/features/hosts/utils/monitoring.js';
import {
  AGGREGATE_FILTERS,
  CDP_FMRI,
  MANAGED_ADDRESS_FILTERS,
  MANAGEMENT_SECTIONS,
  SPACE_FILTERS,
  VLAN_FILTERS,
  VNIC_FILTERS,
  addressBody,
  addressDeleteParams,
  addressInterfacesOf,
  addressObjectOf,
  addressProblem,
  addressTypesOf,
  aggregateBody,
  aggregateLinksOf,
  aggregateProblem,
  bareAddressOf,
  bridgeBody,
  bridgeProblem,
  bridgeableLinksOf,
  canDisableAddress,
  canEnableAddress,
  cdpRunning,
  dnsBody,
  dnsFormOf,
  etherstubBody,
  etherstubProblem,
  formatLinkSpeed,
  formatLinks,
  formatMac,
  forwardLineOf,
  forwardOf,
  forwardReady,
  hostOffersAny,
  hostOnlyIfBody,
  hostOnlyIfReady,
  hostOnlyNetBody,
  hostOnlyNetReady,
  hostnameBody,
  hostnameProblem,
  hostnameValid,
  hostsBody,
  hostsRowsFrom,
  isGoAgent,
  lacpTone,
  linksArrayOf,
  managedAddressKey,
  managedAddressOf,
  matchesAggregate,
  matchesBridge,
  matchesManagedAddress,
  matchesNamed,
  matchesSpace,
  matchesVlan,
  matchesVnic,
  natNetworkBody,
  natNetworkReady,
  nextIndexedName,
  physicalLinksOf,
  policyTone,
  protectionTone,
  sectionsOffered,
  shortZoneOf,
  spaceFamiliesOf,
  spacesByType,
  suggestVnicName,
  uniqueRows,
  vlanAutoName,
  vlanBody,
  vlanProblem,
  vlanTone,
  vnicBody,
  vnicLinksOf,
  vnicProblem,
} from '../../src/features/hosts/utils/networkingManagement.js';

const rowOf = (features, more = {}) => ({ capabilities: { features, ...more } });

const ZONE = rowOf(['machines', 'monitoring', 'vnics', 'ip-addresses'], {
  hypervisors: ['bhyve'],
  platform: 'omnios',
});

const DESK = rowOf(['machines', 'monitoring', 'network-spaces', 'ip-addresses'], {
  hypervisors: ['virtualbox'],
  platform: 'windows',
});

const MAC = rowOf(['network-spaces'], { hypervisors: ['virtualbox', 'utm'], platform: 'darwin' });

describe('the management sections and their gates', () => {
  it('lists the sections in hyperweaver-ui order with their any-of tokens', () => {
    expect(MANAGEMENT_SECTIONS.map(section => section.key)).toEqual([
      'spaces',
      'addresses',
      'vnics',
      'vlans',
      'etherstubs',
      'bridges',
      'aggregates',
      'hostname',
      'dns',
      'hosts',
    ]);
    expect(MANAGEMENT_SECTIONS.find(section => section.key === 'hostname').tokens).toEqual([
      'hostname',
      'vnics',
    ]);
    expect(MANAGEMENT_SECTIONS.find(section => section.key === 'hosts').tokens).toEqual([
      'hosts-file',
    ]);
  });

  it('offers a section while the row lists any of its tokens, strictly', () => {
    expect(hostOffersAny(ZONE, ['hostname', 'vnics'])).toBe(true);
    expect(hostOffersAny(DESK, ['hostname', 'vnics'])).toBe(false);
    expect(hostOffersAny(null, ['vnics'])).toBe(false);
    expect(sectionsOffered(ZONE).map(section => section.key)).toEqual([
      'addresses',
      'vnics',
      'vlans',
      'etherstubs',
      'bridges',
      'aggregates',
      'hostname',
      'dns',
    ]);
    expect(sectionsOffered(DESK).map(section => section.key)).toEqual(['spaces', 'addresses']);
    expect(sectionsOffered(rowOf([]))).toEqual([]);
  });

  it('carries the management reads in READS with their any-of gate and their parameters', () => {
    expect(READS['network-addresses']).toEqual({
      path: 'network/addresses',
      tokens: [],
      any: ['ip-addresses', 'vnics'],
    });
    expect(READS.bridges.params).toEqual({ extended: true });
    expect(READS['services-cdp']).toEqual({
      path: 'services',
      tokens: ['vnics'],
      params: { pattern: 'cdp' },
    });
    expect(READS['machines-usage'].tokens).toEqual(['monitoring', 'network-spaces']);
    expect(readOffered(ZONE, READS['network-addresses'])).toBe(true);
    expect(readOffered(DESK, READS['network-addresses'])).toBe(true);
    expect(readOffered(rowOf(['monitoring']), READS['network-addresses'])).toBe(false);
    expect(readOffered(DESK, READS.vnics)).toBe(false);
    expect(readOffered(DESK, READS['network-spaces'])).toBe(true);
    expect(readOffered(DESK, READS['machines-usage'])).toBe(true);
    expect(readOffered(ZONE, READS['machines-usage'])).toBe(false);
    expect(NETWORKING_READS).toContain('vnics');
    expect(NETWORKING_READS).toContain('interfaces');
    expect(NETWORKING_READS).not.toContain('task-stats');
  });
});

describe('the addresses', () => {
  it('tells the agent of VirtualBox and UTM by the hypervisors', () => {
    expect(isGoAgent(DESK)).toBe(true);
    expect(isGoAgent(MAC)).toBe(true);
    expect(isGoAgent(ZONE)).toBe(false);
    expect(isGoAgent(null)).toBe(false);
  });

  it('offers DHCP and addrconf as hyperweaver-ui did', () => {
    expect(addressTypesOf(ZONE)).toEqual({ dhcp: true, addrconf: true });
    expect(addressTypesOf(DESK)).toEqual({ dhcp: true, addrconf: false });
    expect(addressTypesOf(MAC)).toEqual({ dhcp: false, addrconf: false });
  });

  it('names the address object from the interface, the version and the type', () => {
    expect(addressObjectOf({ interface: 'vnic0', type: 'static', address: '' })).toBe(
      'vnic0/v4static'
    );
    expect(addressObjectOf({ interface: 'vnic0', type: 'dhcp', address: '' })).toBe('vnic0/v4dhcp');
    expect(addressObjectOf({ interface: 'igb0', type: 'static', address: 'fe80::1' })).toBe(
      'igb0/v6static'
    );
    expect(addressObjectOf({ interface: '', type: 'static' })).toBe('');
  });

  it('says why a form cannot be sent, in hyperweaver-ui order', () => {
    const base = {
      interface: 'igb0',
      type: 'static',
      addrobj: 'igb0/v4static',
      address: '10.0.0.5',
      netmask: '24',
    };
    expect(addressProblem(base)).toBe('');
    expect(addressProblem({ ...base, interface: ' ' })).toBe(
      'host.ipAddressCreateModal.errors.interfaceRequired'
    );
    expect(addressProblem({ ...base, addrobj: '' })).toBe(
      'host.ipAddressCreateModal.errors.addrobjRequired'
    );
    expect(addressProblem({ ...base, addrobj: '9bad' })).toBe(
      'host.ipAddressCreateModal.errors.addrobjFormat'
    );
    expect(addressProblem({ ...base, address: '' })).toBe(
      'host.ipAddressCreateModal.errors.addressRequired'
    );
    expect(addressProblem({ ...base, address: '10.0.0.5/24' })).toBe(
      'host.ipAddressCreateModal.errors.noCidr'
    );
    expect(addressProblem({ ...base, address: 'not an address' })).toBe(
      'host.ipAddressCreateModal.errors.invalidIp'
    );
    expect(addressProblem({ ...base, address: '10.0.0.999' })).toBe(
      'host.ipAddressCreateModal.errors.invalidOctets'
    );
    expect(addressProblem({ ...base, netmask: '31' })).toBe(
      'host.ipAddressCreateModal.errors.netmaskRange'
    );
    expect(addressProblem({ ...base, type: 'dhcp', address: '' })).toBe('');
  });

  it('builds the body with the address and its netmask as one CIDR for a static one', () => {
    expect(
      addressBody({
        interface: ' igb0 ',
        type: 'static',
        addrobj: 'igb0/v4static',
        address: '10.0.0.5',
        netmask: '24',
        primary: true,
        wait: '30',
        temporary: false,
        down: true,
      })
    ).toEqual({
      interface: 'igb0',
      type: 'static',
      addrobj: 'igb0/v4static',
      primary: true,
      wait: 30,
      temporary: false,
      down: true,
      address: '10.0.0.5/24',
    });
    expect(
      addressBody({ interface: 'igb0', type: 'dhcp', addrobj: 'igb0/v4dhcp', wait: '45' })
    ).toEqual({
      interface: 'igb0',
      type: 'dhcp',
      addrobj: 'igb0/v4dhcp',
      primary: false,
      wait: 45,
      temporary: false,
      down: false,
    });
  });

  it('sends the bare address on a delete of one of several under one object on the Go agent alone', () => {
    const rows = [
      { addrobj: 'eth0/v4', addr: '10.0.0.5/24' },
      { addrobj: 'eth0/v4', addr: '10.0.0.6/24' },
      { addrobj: 'lo0/v4', ip_address: '127.0.0.1' },
    ];
    expect(addressDeleteParams({ rows, row: rows[0], goAgent: true })).toEqual({
      release: false,
      address: '10.0.0.5',
    });
    expect(addressDeleteParams({ rows, row: rows[2], goAgent: true })).toEqual({ release: false });
    expect(addressDeleteParams({ rows, row: rows[0], goAgent: false })).toEqual({ release: false });
    expect(bareAddressOf({ ip_address: '10.0.0.9', addr: '10.0.0.9/24' })).toBe('10.0.0.9');
    expect(bareAddressOf({ addr: '10.0.0.9/24' })).toBe('10.0.0.9');
    expect(bareAddressOf({})).toBe('');
  });

  it('draws the managed address, its key, its enable and disable and its rows once', () => {
    expect(managedAddressOf({ addr: '10.0.0.5/24' })).toBe('10.0.0.5/24');
    expect(managedAddressOf({ ip_address: '10.0.0.5', prefix_length: 24 })).toBe('10.0.0.5/24');
    expect(managedAddressOf({ ip_address: '10.0.0.5' })).toBe('10.0.0.5');
    expect(managedAddressOf({})).toBe('');
    expect(managedAddressKey({ addrobj: 'a/v4', ip_address: '1.1.1.1' })).toBe('a/v4|1.1.1.1');
    expect(managedAddressKey({ addrobj: 'a/v4', addr: '1.1.1.2/24' })).toBe('a/v4|1.1.1.2/24');
    expect(canEnableAddress({ state: 'Disabled' })).toBe(true);
    expect(canEnableAddress({ state: 'ok' })).toBe(false);
    expect(canDisableAddress({ state: 'ok' })).toBe(true);
    expect(canDisableAddress({ state: 'down' })).toBe(false);
    const rows = [
      { addrobj: 'a/v4', addr: '1.1.1.1/24' },
      { addrobj: 'a/v4', addr: '1.1.1.1/24' },
      { addrobj: 'a/v4', addr: '1.1.1.2/24' },
    ];
    expect(uniqueRows(rows, managedAddressKey)).toHaveLength(2);
    expect(uniqueRows(null, managedAddressKey)).toEqual([]);
  });

  it('lists the interfaces an address can be created on, VNICs and physical ones once each', () => {
    expect(
      addressInterfacesOf({
        vnics: [{ link: 'vnic0', over: 'igb0' }],
        interfaces: [
          { link: 'igb0', class: 'phys', state: 'up' },
          { link: 'vnic0', class: 'vnic', state: 'up' },
          { link: 'igb0', class: 'phys', state: 'up' },
          { link: 'stub0', class: 'etherstub' },
        ],
      })
    ).toEqual([
      { name: 'vnic0', type: 'VNIC', over: 'igb0' },
      { name: 'igb0', type: 'Physical', state: 'up' },
    ]);
    expect(addressInterfacesOf({})).toEqual([]);
  });

  it('finds a managed address and filters it by type, version and state', () => {
    const row = {
      interface: 'igb0',
      addrobj: 'igb0/v4static',
      addr: '10.0.0.5/24',
      type: 'static',
      state: 'ok',
    };
    expect(matchesManagedAddress(row, 'igb0/v4')).toBe(true);
    expect(matchesManagedAddress(row, 'static')).toBe(true);
    expect(matchesManagedAddress(row, 'vnic')).toBe(false);
    expect(MANAGED_ADDRESS_FILTERS.map(group => group.key)).toEqual(['type', 'version', 'state']);
    expect(MANAGED_ADDRESS_FILTERS[1].values({ ip_version: 'v6' })).toEqual(['v6']);
    expect(MANAGED_ADDRESS_FILTERS[2].values({})).toEqual([]);
  });
});

describe('the VNICs', () => {
  it('says why a VNIC form cannot be sent', () => {
    const base = { name: 'vnic_1234_0', link: 'igb0', vlan_id: '', mac_address: '' };
    expect(vnicProblem(base)).toBe('');
    expect(vnicProblem({ ...base, name: '' })).toBe('host.vnicCreateModal.vnicNameRequired');
    expect(vnicProblem({ ...base, link: '' })).toBe('host.vnicCreateModal.physicalLinkRequired');
    expect(vnicProblem({ ...base, name: '1bad' })).toBe('host.vnicCreateModal.vnicNameFormat');
    expect(vnicProblem({ ...base, vlan_id: '5000' })).toBe('host.vnicCreateModal.vlanIdRange');
    expect(vnicProblem({ ...base, mac_address: 'zz' })).toBe(
      'host.vnicCreateModal.invalidMacFormat'
    );
    expect(vnicProblem({ ...base, vlan_id: '100', mac_address: '02:08:20:aa:bb:cc' })).toBe('');
  });

  it('builds the body with the VLAN, the MAC and the properties where given', () => {
    expect(vnicBody({ name: ' v1 ', link: 'igb0', temporary: false, properties: {} })).toEqual({
      name: 'v1',
      link: 'igb0',
      temporary: false,
    });
    expect(
      vnicBody({
        name: 'v1',
        link: 'igb0',
        temporary: true,
        vlan_id: '100',
        mac_address: '02:08:20:aa:bb:cc',
        properties: { mtu: '9000' },
      })
    ).toEqual({
      name: 'v1',
      link: 'igb0',
      temporary: true,
      vlan_id: 100,
      mac_address: '02:08:20:aa:bb:cc',
      properties: { mtu: '9000' },
    });
  });

  it('suggests a VNIC name no held VNIC carries, the next sequence under the number', () => {
    expect(suggestVnicName([], () => 1234)).toBe('vnic_1234_0');
    expect(suggestVnicName([{ link: 'vnic_1234_0' }, { link: 'vnic_1234_3' }], () => 1234)).toBe(
      'vnic_1234_4'
    );
    expect(suggestVnicName([{ link: 'vnic_9999_0' }], () => 1234)).toBe('vnic_1234_0');
    expect(suggestVnicName(null, () => 4321)).toBe('vnic_4321_0');
    expect(suggestVnicName([])).toMatch(/^vnic_\d{4}_0$/u);
  });

  it('lists the links a VNIC may be over, each once', () => {
    expect(
      vnicLinksOf({
        interfaces: [{ link: 'igb0', state: 'up', speed: 1000 }, { link: 'igb0' }],
        etherstubs: [{ name: 'stub0' }],
        aggregates: [{ link: 'aggr0', state: 'up' }],
        bridges: [{ name: 'bridge0' }],
      }).map(row => [row.name, row.type, row.state, row.speed])
    ).toEqual([
      ['igb0', 'Physical', 'up', '1000'],
      ['stub0', 'Etherstub', 'up', 'unknown'],
      ['aggr0', 'Aggregate', 'up', 'unknown'],
      ['bridge0', 'Bridge', 'unknown', 'unknown'],
    ]);
    expect(vnicLinksOf({})).toEqual([]);
  });

  it('draws the MAC, the speed, the zone and the VLAN tone', () => {
    expect(formatMac('020820aabbcc')).toBe('02:08:20:aa:bb:cc');
    expect(formatMac('02:08:20:aa:bb:cc')).toBe('02:08:20:aa:bb:cc');
    expect(formatMac('')).toBe('');
    expect(formatLinkSpeed(1000)).toBe('1G');
    expect(formatLinkSpeed('100')).toBe('100M');
    expect(formatLinkSpeed(0)).toBe('');
    expect(shortZoneOf('--')).toBe('');
    expect(shortZoneOf('web-1')).toBe('web-1');
    expect(shortZoneOf('a-very-long-zone-name-indeed')).toBe('a-very-long-zone-nam...');
    expect(vlanTone(0)).toBe('primary');
    expect(vlanTone(4)).toBe('danger');
    expect(vlanTone('')).toBe('dark');
    expect(vlanTone(null)).toBe('dark');
  });

  it('finds a VNIC and filters it, the global zone no zone', () => {
    const row = { link: 'vnic0', over: 'igb0', macaddress: '02:08:20:aa:bb:cc', zone: '--' };
    expect(matchesVnic(row, 'igb')).toBe(true);
    expect(matchesVnic(row, 'bb:cc')).toBe(true);
    expect(matchesVnic(row, 'web')).toBe(false);
    expect(VNIC_FILTERS.map(group => group.key)).toEqual(['over', 'zone', 'state']);
    expect(VNIC_FILTERS[1].values(row)).toEqual([]);
    expect(VNIC_FILTERS[1].values({ zone: 'web-1' })).toEqual(['web-1']);
  });
});

describe('the VLANs, the etherstubs, the bridges and the aggregates', () => {
  it('names a VLAN as dladm does and sends the name only while it differs', () => {
    expect(vlanAutoName('igb0', 999)).toBe('igb999000');
    expect(vlanAutoName('e1000g1', '5')).toBe('');
    expect(vlanAutoName('stub', 5)).toBe('');
    expect(vlanAutoName('igb0', '')).toBe('');
    expect(
      vlanBody({ vid: '100', link: 'igb0', name: 'igb100000', force: false, temporary: false })
    ).toEqual({
      vid: 100,
      link: 'igb0',
      force: false,
      temporary: false,
    });
    expect(
      vlanBody({ vid: '100', link: 'igb0', name: 'lan100', force: true, temporary: true })
    ).toEqual({
      vid: 100,
      link: 'igb0',
      force: true,
      temporary: true,
      name: 'lan100',
    });
  });

  it('says why a VLAN form cannot be sent', () => {
    expect(vlanProblem({ vid: '', link: 'igb0', name: '' })).toBe(
      'host.vlanCreateModal.vlanIdRequired'
    );
    expect(vlanProblem({ vid: '0', link: 'igb0', name: '' })).toBe(
      'host.vlanCreateModal.vlanIdRange'
    );
    expect(vlanProblem({ vid: '10', link: '', name: '' })).toBe(
      'host.vlanCreateModal.physicalLinkRequired'
    );
    expect(vlanProblem({ vid: '10', link: 'igb0', name: '1x' })).toBe(
      'host.vlanCreateModal.vlanNameFormat'
    );
    expect(vlanProblem({ vid: '10', link: 'igb0', name: '' })).toBe('');
    expect(VLAN_FILTERS.map(group => group.key)).toEqual(['over', 'state']);
    expect(matchesVlan({ link: 'igb100000', over: 'igb0', vid: 100 }, '100')).toBe(true);
  });

  it('names the next free etherstub and aggregate', () => {
    expect(nextIndexedName([], 'stub')).toBe('stub0');
    expect(nextIndexedName([{ name: 'stub0' }, { link: 'stub1' }], 'stub')).toBe('stub2');
    expect(nextIndexedName([{ name: 'stub1' }], 'stub')).toBe('stub0');
    expect(nextIndexedName([{ name: 'aggr0' }, { name: 'stub0' }], 'aggr')).toBe('aggr1');
    expect(etherstubProblem({ name: '' })).toBe('host.etherstubCreateModal.errors.nameRequired');
    expect(etherstubProblem({ name: '0x' })).toBe('host.etherstubCreateModal.errors.nameFormat');
    expect(etherstubProblem({ name: 'stub2' })).toBe('');
    expect(etherstubBody({ name: ' stub2 ', temporary: true })).toEqual({
      name: 'stub2',
      temporary: true,
    });
    expect(matchesNamed({ name: 'stub0', over: '--', class: 'etherstub' }, 'ether')).toBe(true);
  });

  it('holds a bridge form to its ranges and builds its body', () => {
    const base = {
      name: 'bridge0',
      protection: 'stp',
      priority: '32768',
      max_age: '20',
      hello_time: '2',
      forward_delay: '15',
      force_protocol: '3',
      links: ['igb0'],
    };
    expect(bridgeProblem(base)).toBe('');
    expect(bridgeProblem({ ...base, name: '' })).toBe('host.bridgeCreateModal.errors.nameRequired');
    expect(bridgeProblem({ ...base, name: '-x' })).toBe('host.bridgeCreateModal.errors.nameFormat');
    expect(bridgeProblem({ ...base, priority: '70000' })).toBe(
      'host.bridgeCreateModal.errors.priorityRange'
    );
    expect(bridgeProblem({ ...base, max_age: '5' })).toBe(
      'host.bridgeCreateModal.errors.maxAgeRange'
    );
    expect(bridgeProblem({ ...base, hello_time: '11' })).toBe(
      'host.bridgeCreateModal.errors.helloTimeRange'
    );
    expect(bridgeProblem({ ...base, forward_delay: '3' })).toBe(
      'host.bridgeCreateModal.errors.forwardDelayRange'
    );
    expect(bridgeBody(base)).toEqual({
      name: 'bridge0',
      protection: 'stp',
      priority: 32768,
      max_age: 20,
      hello_time: 2,
      forward_delay: 15,
      force_protocol: 3,
      links: ['igb0'],
    });
    expect(
      bridgeableLinksOf([
        { link: 'igb0', class: 'phys' },
        { link: 'vnic0', class: 'vnic' },
        { link: 'stub0', class: 'etherstub' },
        { link: 'x' },
      ]).map(row => row.link)
    ).toEqual(['igb0', 'vnic0', 'x']);
    expect(matchesBridge({ name: 'bridge0', protection: 'stp', links: ['igb1'] }, 'igb1')).toBe(
      true
    );
    expect(protectionTone('rstp')).toBe('info');
    expect(protectionTone(undefined)).toBe('secondary');
  });

  it('holds an aggregate form to the CDP service and builds its body', () => {
    const base = {
      name: 'aggr0',
      links: ['igb0', 'igb1'],
      policy: 'L4',
      lacp_mode: 'active',
      lacp_timer: 'short',
      unicast_address: '',
      temporary: false,
      disableCdp: false,
    };
    expect(aggregateProblem(base, false)).toBe('');
    expect(aggregateProblem({ ...base, name: '' }, false)).toBe(
      'host.aggregateCreateModal.errors.nameRequired'
    );
    expect(aggregateProblem({ ...base, links: [] }, false)).toBe(
      'host.aggregateCreateModal.errors.linkRequired'
    );
    expect(aggregateProblem({ ...base, name: '9' }, false)).toBe(
      'host.aggregateCreateModal.errors.nameFormat'
    );
    expect(aggregateProblem({ ...base, unicast_address: 'nope' }, false)).toBe(
      'host.aggregateCreateModal.errors.macFormat'
    );
    expect(aggregateProblem(base, true)).toBe('host.aggregateCreateModal.errors.cdpRunning');
    expect(aggregateProblem({ ...base, disableCdp: true }, true)).toBe('');
    expect(aggregateBody({ ...base, unicast_address: ' 02:08:20:aa:bb:cc ' })).toEqual({
      name: 'aggr0',
      links: ['igb0', 'igb1'],
      policy: 'L4',
      lacp_mode: 'active',
      lacp_timer: 'short',
      temporary: false,
      unicast_address: '02:08:20:aa:bb:cc',
    });
    expect(aggregateBody(base)).not.toHaveProperty('unicast_address');
    expect(CDP_FMRI).toBe('svc:/network/cdp:default');
    expect(cdpRunning([{ fmri: 'svc:/network/cdp:default', state: 'online' }])).toBe(true);
    expect(cdpRunning([{ fmri: 'svc:/network/cdp:default', state: 'disabled' }])).toBe(false);
    expect(cdpRunning(null)).toBe(false);
    expect(
      aggregateLinksOf([
        { link: 'igb0', class: 'phys' },
        { link: 'vnic0', class: 'vnic' },
        { link: 'igb0', class: 'phys' },
      ]).map(row => row.link)
    ).toEqual(['igb0']);
    expect(
      physicalLinksOf([
        { link: 'igb0', class: 'phys' },
        { link: 'vnic0', class: 'vnic' },
      ]).map(row => row.link)
    ).toEqual(['igb0']);
    expect(linksArrayOf('igb0, igb1')).toEqual(['igb0', 'igb1']);
    expect(linksArrayOf(['a'])).toEqual(['a']);
    expect(linksArrayOf(undefined)).toEqual([]);
    expect(formatLinks(['a', 'b', 'c', 'd'])).toBe('a, b +2');
    expect(formatLinks(['a'])).toBe('a');
    expect(matchesAggregate({ name: 'aggr0', policy: 'L4', over: 'igb0,igb1' }, 'igb1')).toBe(true);
    expect(AGGREGATE_FILTERS.map(group => group.key)).toEqual(['state', 'policy']);
    expect(policyTone('L2L3L4')).toBe('dark');
    expect(policyTone('x')).toBe('secondary');
    expect(lacpTone('Active')).toBe('success');
    expect(lacpTone(undefined)).toBe('secondary');
  });
});

describe('the hostname, the DNS and the hosts file', () => {
  it('holds a hostname to the RFC shape and says why it cannot be sent', () => {
    expect(hostnameValid('zone-1')).toBe(true);
    expect(hostnameValid('zone-1.example.com')).toBe(true);
    expect(hostnameValid('-bad')).toBe(false);
    expect(hostnameValid('a..b')).toBe(false);
    expect(hostnameValid('')).toBe(false);
    expect(hostnameValid(`${'a'.repeat(64)}.com`)).toBe(false);
    expect(hostnameProblem('', 'zone-1')).toBe('host.hostnameSettings.errors.empty');
    expect(hostnameProblem('zone-1', 'zone-1')).toBe('host.hostnameSettings.errors.same');
    expect(hostnameProblem('bad_name', 'zone-1')).toBe('host.hostnameSettings.invalidHostname');
    expect(hostnameProblem('zone-2', 'zone-1')).toBe('');
    expect(hostnameBody(' zone-2 ', true)).toEqual({ hostname: 'zone-2', apply_immediately: true });
  });

  it('fills the DNS form from the answer and sends the raw file or the parsed members', () => {
    const form = dnsFormOf({
      nameservers: ['10.0.0.1', '1.1.1.1'],
      search_domains: ['example.com'],
      domain: '',
      options: ['ndots:2'],
      raw: 'nameserver 10.0.0.1\n',
    });
    expect(form.nameservers).toBe('10.0.0.1\n1.1.1.1');
    expect(form.searchDomains).toBe('example.com');
    expect(form.options).toBe('ndots:2');
    expect(form.raw).toBe('nameserver 10.0.0.1\n');
    expect(form.rawMode).toBe(false);
    expect(dnsFormOf(null).nameservers).toBe('');
    expect(dnsBody({ ...form, rawMode: true })).toEqual({ raw: 'nameserver 10.0.0.1\n' });
    expect(dnsBody({ ...form, nameservers: '10.0.0.1\n\n 9.9.9.9 ', domain: ' lan ' })).toEqual({
      nameservers: ['10.0.0.1', '9.9.9.9'],
      search_domains: ['example.com'],
      options: ['ndots:2'],
      domain: 'lan',
    });
  });

  it('draws the hosts file as rows and sends the raw file or the entries that carry both parts', () => {
    const rows = hostsRowsFrom([
      { ip: '127.0.0.1', hostnames: ['localhost', 'loghost'] },
      { ip: '10.0.0.5' },
    ]);
    expect(rows).toEqual([
      { key: 'row-0-127.0.0.1', ip: '127.0.0.1', hostnames: 'localhost loghost' },
      { key: 'row-1-10.0.0.5', ip: '10.0.0.5', hostnames: '' },
    ]);
    expect(hostsRowsFrom(undefined)).toEqual([]);
    expect(hostsBody({ rawMode: true, raw: 'x', rows })).toEqual({ raw: 'x' });
    expect(hostsBody({ rawMode: false, raw: '', rows })).toEqual({
      entries: [{ ip: '127.0.0.1', hostnames: ['localhost', 'loghost'] }],
    });
  });
});

describe('the network spaces', () => {
  it('draws the families the platform carries', () => {
    expect(spaceFamiliesOf(DESK)).toEqual({
      hostonly: true,
      hostonlynet: false,
      natnetwork: true,
      intnet: true,
    });
    expect(spaceFamiliesOf(MAC)).toEqual({
      hostonly: false,
      hostonlynet: true,
      natnetwork: true,
      intnet: true,
    });
    expect(spaceFamiliesOf(null)).toEqual({
      hostonly: true,
      hostonlynet: true,
      natnetwork: true,
      intnet: true,
    });
  });

  it('groups the spaces by type and finds one by its members', () => {
    const spaces = [
      { type: 'hostonly', name: 'vboxnet0', ip_address: '192.168.56.1' },
      { type: 'natnetwork', name: 'NatNetwork', cidr: '10.0.2.0/24' },
      { type: 'intnet', name: 'intnet' },
    ];
    const grouped = spacesByType(spaces);
    expect(grouped.hostonly).toHaveLength(1);
    expect(grouped.hostonlynet).toHaveLength(0);
    expect(grouped.natnetwork[0].name).toBe('NatNetwork');
    expect(grouped.intnet).toHaveLength(1);
    expect(matchesSpace(spaces[1], '10.0.2')).toBe(true);
    expect(matchesSpace(spaces[0], 'nat')).toBe(false);
    expect(SPACE_FILTERS[0].values(spaces[2])).toEqual(['intnet']);
  });

  it('builds the host-only interface body, the DHCP server on, off and removed', () => {
    const form = {
      ip: '192.168.56.1',
      netmask: '255.255.255.0',
      dhcpOn: true,
      serverIp: '192.168.56.100',
      lowerIp: '192.168.56.101',
      upperIp: '192.168.56.254',
    };
    expect(hostOnlyIfBody(form, null)).toEqual({
      ip: '192.168.56.1',
      netmask: '255.255.255.0',
      dhcp: {
        server_ip: '192.168.56.100',
        netmask: '255.255.255.0',
        lower_ip: '192.168.56.101',
        upper_ip: '192.168.56.254',
      },
    });
    expect(hostOnlyIfBody({ ...form, dhcpOn: false }, { dhcp: { exists: true } })).toEqual({
      ip: '192.168.56.1',
      netmask: '255.255.255.0',
      dhcp: null,
    });
    expect(hostOnlyIfBody({ ...form, ip: '', dhcpOn: false }, null)).toEqual({});
    expect(hostOnlyIfReady(form)).toBe(true);
    expect(hostOnlyIfReady({ ...form, upperIp: '' })).toBe(false);
    expect(hostOnlyIfReady({ ...form, dhcpOn: false, upperIp: '' })).toBe(true);
  });

  it('builds the host-only network body, named at create alone', () => {
    const form = {
      name: 'HostOnlyNet',
      netmask: '255.255.255.0',
      lowerIp: '192.168.60.10',
      upperIp: '192.168.60.200',
      enabled: true,
    };
    expect(hostOnlyNetBody(form, null)).toEqual({
      name: 'HostOnlyNet',
      netmask: '255.255.255.0',
      lower_ip: '192.168.60.10',
      upper_ip: '192.168.60.200',
      enabled: true,
    });
    expect(hostOnlyNetBody(form, { name: 'HostOnlyNet' })).not.toHaveProperty('name');
    expect(hostOnlyNetReady(form, null)).toBe(true);
    expect(hostOnlyNetReady({ ...form, name: '' }, null)).toBe(false);
    expect(hostOnlyNetReady({ ...form, name: '' }, { name: 'x' })).toBe(true);
  });

  it('builds the NAT network body with the forwards removed then added', () => {
    const form = {
      name: 'NatNetwork',
      cidr: '10.0.2.0/24',
      enabled: true,
      dhcp: true,
      ipv6: false,
      removedForwards: [{ name: 'ssh', ipv6: false }],
      addedForwards: [],
    };
    expect(natNetworkBody(form, null)).toEqual({
      name: 'NatNetwork',
      cidr: '10.0.2.0/24',
      enabled: true,
      dhcp: true,
      ipv6: false,
      remove_port_forwards: [{ name: 'ssh', ipv6: false }],
    });
    const added = forwardOf({
      ...{
        name: 'web',
        protocol: 'tcp',
        host_ip: '',
        host_port: '8080',
        guest_ip: '10.0.2.15',
        guest_port: '80',
        ipv6: false,
      },
    });
    expect(added.host_port).toBe(8080);
    expect(added.guest_port).toBe(80);
    expect(
      natNetworkBody(
        { ...form, removedForwards: [], addedForwards: [added] },
        { name: 'NatNetwork' }
      )
    ).toEqual({
      cidr: '10.0.2.0/24',
      enabled: true,
      dhcp: true,
      ipv6: false,
      add_port_forwards: [added],
    });
    expect(natNetworkReady(form, null)).toBe(true);
    expect(natNetworkReady({ ...form, cidr: '' }, null)).toBe(false);
    expect(forwardReady({ name: 'web', host_port: '8080', guest_port: '80' })).toBe(true);
    expect(forwardReady({ name: '', host_port: '8080', guest_port: '80' })).toBe(false);
    expect(forwardLineOf(added)).toBe('web: *:8080 → 10.0.2.15:80');
  });
});
