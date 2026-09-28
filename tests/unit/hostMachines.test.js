import { describe, expect, it } from 'vitest';

import {
  cloudInitSeeds,
  configurationOf,
  consolePortOf,
  detailKey,
  forwardLine,
  guestAddresses,
  guestSourceKey,
  hardwareOf,
  hasDevices,
  isUnknownMachine,
  machineCounts,
  matchesMachine,
  natForwardsOf,
  nicSummary,
  organizationsOf,
  parseTags,
  provisionerOf,
  rolesOf,
  rowActionsOf,
  sentenceKey,
  statusOf,
  statusTone,
  systemLine,
  tagsOf,
  tagsText,
  zoneFacts,
  zoneHardware,
  zoneNicSummary,
  zoneSpecs,
} from '../../src/features/hosts/utils/machines.js';

const t = (key, options = {}) => [key, ...Object.values(options)].join('|');

const goRow = {
  name: 'dev-1',
  status: 'running',
  hypervisor: 'virtualbox',
  backing: 'vagrant',
  server_id: '0042',
  tags: ['web', 'lab'],
  spec: {
    provisioner: { name: 'startcloud', version: '0.1.27' },
    roles: [
      { name: 'domino', enabled: true },
      { name: 'traveler', enabled: false },
    ],
    settings: { vcpus: 4, memory: '8G', box: 'STARTcloud/debian13-server' },
  },
};

const zoneRow = {
  name: 'web-1',
  status: 'running',
  brand: 'bhyve',
  server_id: '00001234',
  tags: null,
  configuration: {
    provisioner: {
      provisioner_name: 'startcloud',
      provisioner_version: '0.1.27',
      roles: ['nomadweb', { name: 'leap' }, {}],
    },
    settings: { vcpus: '2', memory: '4G' },
  },
};

const zoneConfiguration = {
  zonename: 'web-1',
  zonepath: '/rpool/zones/web-1',
  brand: 'bhyve',
  ram: '4G',
  vcpus: '2',
  bootrom: 'BHYVE_RELEASE_CSM',
  hostbridge: 'i440fx',
  type: 'generic',
  acpi: 'true',
  autoboot: 'false',
  xhci: 'on',
  rng: 'off',
  hostid: '00c0ffee',
  bootdisk: { path: 'rpool/zones/web-1/boot', size: '40G' },
  disk: [{ path: 'rpool/zones/web-1/data', size: '100G' }],
  cdrom: '/iso/debian-13.iso',
  net: [
    {
      physical: 'vnice3_1234_0',
      'global-nic': 'igb0',
      'allowed-address': '10.0.0.20/24',
      'mac-addr': '02:08:20:aa:bb:cc',
      'vlan-id': 11,
    },
  ],
};

const vbox = {
  capabilities: { hypervisors: ['virtualbox'], features: ['machines', 'machine-suspend'] },
};
const bhyve = { capabilities: { hypervisors: ['bhyve'], features: ['machines'] } };

describe('detailKey', () => {
  it('joins the host and the machine, so two hosts keep a machine of one name apart', () => {
    expect(detailKey('1', 'dev-1')).toBe('1|dev-1');
    expect(detailKey('self', 'web-1')).toBe('self|web-1');
    expect(detailKey('1', 'dev-1')).not.toBe(detailKey('2', 'dev-1'));
  });

  it('answers the prefix every machine of a host begins with for an empty name', () => {
    expect(detailKey('1', 'dev-1').startsWith(detailKey('1', ''))).toBe(true);
    expect(detailKey('12', 'dev-1').startsWith(detailKey('1', ''))).toBe(false);
  });
});

describe('isUnknownMachine', () => {
  const settled = { machine: null, settled: true };
  const answered = { detail: null, settled: true };
  const stats = { allmachines: ['dev-1'], runningmachines: [] };

  it('answers true once everything answered and nothing names the machine', () => {
    expect(
      isUnknownMachine({ name: 'ghost', stats, failed: false, row: settled, answer: answered })
    ).toBe(true);
  });

  it('answers false while the stats, a row or a detail names the machine', () => {
    expect(
      isUnknownMachine({ name: 'dev-1', stats, failed: false, row: settled, answer: answered })
    ).toBe(false);
    expect(
      isUnknownMachine({
        name: 'ghost',
        stats,
        failed: false,
        row: { machine: { name: 'ghost' }, settled: true },
        answer: answered,
      })
    ).toBe(false);
    expect(
      isUnknownMachine({
        name: 'ghost',
        stats,
        failed: false,
        row: settled,
        answer: { detail: { machine_info: {} }, settled: true },
      })
    ).toBe(false);
  });

  it('answers false while a read is still asked for and while the stats failed', () => {
    expect(
      isUnknownMachine({
        name: 'ghost',
        stats,
        failed: false,
        row: { machine: null, settled: false },
        answer: answered,
      })
    ).toBe(false);
    expect(
      isUnknownMachine({
        name: 'ghost',
        stats,
        failed: false,
        row: settled,
        answer: { detail: null, settled: false },
      })
    ).toBe(false);
    expect(
      isUnknownMachine({ name: 'ghost', stats: null, failed: true, row: settled, answer: answered })
    ).toBe(false);
  });
});

describe('statusOf', () => {
  it('reads the status lower-cased and unknown for a row without one', () => {
    expect(statusOf({ status: 'Running' })).toBe('running');
    expect(statusOf({})).toBe('unknown');
    expect(statusOf(null)).toBe('unknown');
  });
});

describe('statusTone', () => {
  it('maps every status to the tone it draws in', () => {
    expect(statusTone('running')).toBe('success');
    expect(statusTone('starting')).toBe('info');
    expect(statusTone('shutting_down')).toBe('info');
    expect(statusTone('suspended')).toBe('warning');
    expect(statusTone('installed')).toBe('warning');
    expect(statusTone('stopped')).toBe('danger');
    expect(statusTone('incomplete')).toBe('danger');
    expect(statusTone('STOPPED')).toBe('danger');
  });

  it('answers secondary for every other word and for none', () => {
    expect(statusTone('unknown')).toBe('secondary');
    expect(statusTone('')).toBe('secondary');
    expect(statusTone(undefined)).toBe('secondary');
  });
});

describe('sentenceKey', () => {
  it('names the sentence of a status that has one', () => {
    expect(sentenceKey('running')).toBe('hosts.machines.sentence.running');
    expect(sentenceKey('starting')).toBe('hosts.machines.sentence.transitioning');
    expect(sentenceKey('stopping')).toBe('hosts.machines.sentence.transitioning');
    expect(sentenceKey('Configured')).toBe('hosts.machines.sentence.configured');
  });

  it('answers empty for a status without a sentence', () => {
    expect(sentenceKey('installed')).toBe('');
    expect(sentenceKey('')).toBe('');
  });
});

describe('configurationOf', () => {
  it('answers the object a row carries', () => {
    expect(configurationOf({ configuration: { ram: '4G' } })).toEqual({ ram: '4G' });
  });

  it('answers an empty object for anything that is no object', () => {
    expect(configurationOf({ configuration: '{"ram":"4G"}' })).toEqual({});
    expect(configurationOf({ configuration: ['a'] })).toEqual({});
    expect(configurationOf({ configuration: null })).toEqual({});
    expect(configurationOf(null)).toEqual({});
  });
});

describe('tagsOf', () => {
  it('answers the list as strings and none for a row without a list', () => {
    expect(tagsOf({ tags: ['web', 7] })).toEqual(['web', '7']);
    expect(tagsOf({ tags: null })).toEqual([]);
    expect(tagsOf(null)).toEqual([]);
  });
});

describe('provisionerOf', () => {
  it('reads the spec of a hyperweaver-agent row', () => {
    expect(provisionerOf(goRow)).toBe('startcloud/0.1.27');
  });

  it('reads the configuration of a zoneweaver-agent row', () => {
    expect(provisionerOf(zoneRow)).toBe('startcloud/0.1.27');
    expect(
      provisionerOf({ configuration: { provisioner: { provisioner_name: 'startcloud' } } })
    ).toBe('startcloud/?');
  });

  it('answers empty for a machine without a provisioner', () => {
    expect(provisionerOf({ name: 'bare' })).toBe('');
    expect(provisionerOf(null)).toBe('');
  });
});

describe('rolesOf', () => {
  it('names the enabled roles of a hyperweaver-agent row', () => {
    expect(rolesOf(goRow)).toEqual(['domino']);
  });

  it('names the roles of a zoneweaver-agent row, names or rows that carry one', () => {
    expect(rolesOf(zoneRow)).toEqual(['nomadweb', 'leap']);
  });

  it('answers none for a row without roles', () => {
    expect(rolesOf({ name: 'bare' })).toEqual([]);
  });
});

describe('systemLine', () => {
  it('joins the parts a hyperweaver-agent row carries', () => {
    expect(systemLine(goRow, t)).toBe(
      'hosts.machines.vcpus|4 · hosts.machines.ram|8G · STARTcloud/debian13-server'
    );
  });

  it('reads the settings of a zoneweaver-agent row', () => {
    expect(systemLine(zoneRow, t)).toBe('hosts.machines.vcpus|2 · hosts.machines.ram|4G');
  });

  it('answers empty for a row that carries no part', () => {
    expect(systemLine({ name: 'bare' }, t)).toBe('');
  });
});

describe('matchesMachine', () => {
  it('matches the name, the server id, a tag, the provisioner and the hypervisor', () => {
    expect(matchesMachine(goRow, 'dev')).toBe(true);
    expect(matchesMachine(goRow, '0042')).toBe(true);
    expect(matchesMachine(goRow, 'lab')).toBe(true);
    expect(matchesMachine(goRow, 'startcloud')).toBe(true);
    expect(matchesMachine(goRow, 'virtualbox')).toBe(true);
  });

  it('matches nothing else', () => {
    expect(matchesMachine(goRow, 'bhyve')).toBe(false);
    expect(matchesMachine({}, 'dev')).toBe(false);
  });
});

describe('machineCounts', () => {
  it('counts every row, the running ones and the rest', () => {
    expect(
      machineCounts([{ status: 'running' }, { status: 'stopped' }, { status: 'installed' }])
    ).toEqual({ total: 3, running: 1, stopped: 2 });
    expect(machineCounts([])).toEqual({ total: 0, running: 0, stopped: 0 });
  });
});

describe('rowActionsOf', () => {
  it('offers a running machine its pause, suspend, shutdown and restart behind the gates', () => {
    expect(rowActionsOf({ server: vbox, machine: goRow, role: 'user' })).toEqual({
      start: false,
      pause: true,
      suspend: true,
      shutdown: true,
      resume: false,
      restart: true,
    });
  });

  it('offers a stopped machine its start alone', () => {
    expect(
      rowActionsOf({ server: vbox, machine: { ...goRow, status: 'stopped' }, role: 'admin' })
    ).toEqual({
      start: true,
      pause: false,
      suspend: false,
      shutdown: false,
      resume: false,
      restart: false,
    });
  });

  it('offers a paused machine its resume and no start', () => {
    const offered = rowActionsOf({
      server: vbox,
      machine: { ...goRow, status: 'paused' },
      role: 'user',
    });
    expect(offered.resume).toBe(true);
    expect(offered.start).toBe(false);
  });

  it('offers a zone no pause and no suspend on a host that lists neither', () => {
    const offered = rowActionsOf({ server: bhyve, machine: zoneRow, role: 'user' });
    expect(offered.pause).toBe(false);
    expect(offered.suspend).toBe(false);
    expect(offered.shutdown).toBe(true);
  });

  it('offers nothing to a person without a role', () => {
    expect(rowActionsOf({ server: vbox, machine: goRow, role: undefined })).toEqual({
      start: false,
      pause: false,
      suspend: false,
      shutdown: false,
      resume: false,
      restart: false,
    });
  });
});

describe('zoneHardware', () => {
  it('names the boot disk, the disks, the drives and the network resources of a zone', () => {
    expect(zoneHardware(zoneConfiguration)).toEqual({
      disks: [
        { name: 'bootdisk', value: 'rpool/zones/web-1/boot', size: '40G', boot: true },
        { name: 'disk0', value: 'rpool/zones/web-1/data', size: '100G', boot: false },
      ],
      cdroms: [{ name: 'cdrom0', value: '/iso/debian-13.iso' }],
      nics: [
        {
          name: 'net0',
          physical: 'vnice3_1234_0',
          allowedAddress: '10.0.0.20/24',
          mac: '02:08:20:aa:bb:cc',
          globalNic: 'igb0',
          vlanId: '11',
          address: '',
          defrouter: '',
        },
      ],
    });
  });

  it('answers null for a configuration that is no zone and for a zone without a device', () => {
    expect(zoneHardware({ memory: '4096' })).toBeNull();
    expect(zoneHardware({ zonename: 'bare' })).toBeNull();
    expect(zoneHardware(undefined)).toBeNull();
  });
});

describe('hardwareOf and hasDevices', () => {
  const detail = {
    configuration: {},
    knob_current: {
      devices: {
        controllers: [{ name: 'SATA Controller', type: 'sata' }],
        attachments: [
          {
            controller: 'SATA Controller',
            port: 0,
            device: 0,
            path: 'C:/vms/boot.vdi',
            kind: 'disk',
          },
        ],
        nics: [{ adapter: 1, mode: 'nat', mac: '00FF00FF00FF' }],
      },
    },
  };

  it('reads the devices of a hyperweaver-agent detail', () => {
    const hardware = hardwareOf(detail);
    expect(hardware.controllers).toHaveLength(1);
    expect(hardware.attachments).toHaveLength(1);
    expect(hardware.nics).toHaveLength(1);
    expect(hardware.zone).toBeNull();
    expect(hasDevices(hardware)).toBe(true);
  });

  it('reads the devices of a zone from its configuration', () => {
    const hardware = hardwareOf({ configuration: zoneConfiguration, knob_current: { nics: [] } });
    expect(hardware.controllers).toEqual([]);
    expect(hardware.zone.disks).toHaveLength(2);
    expect(hasDevices(hardware)).toBe(true);
  });

  it('names no device for a detail that carries none', () => {
    expect(hasDevices(hardwareOf({ configuration: {}, knob_current: {} }))).toBe(false);
    expect(hasDevices(hardwareOf(null))).toBe(false);
  });
});

describe('nicSummary', () => {
  it('joins the mode, the network and the MAC address', () => {
    expect(
      nicSummary({ adapter: 2, mode: 'bridged', network: 'eth0', mac: '080027AABBCC' }, t)
    ).toBe('bridged · hosts.machines.devices.onNetwork|eth0 · 080027AABBCC');
    expect(nicSummary({ adapter: 1, mode: 'nat' }, t)).toBe('nat');
  });
});

describe('zoneNicSummary', () => {
  it('joins the link, the link under it, the allowed address and the MAC address', () => {
    const [nic] = zoneHardware(zoneConfiguration).nics;
    expect(zoneNicSummary(nic, t)).toBe(
      'vnice3_1234_0 · hosts.machines.devices.overLink|igb0 · 10.0.0.20/24 · 02:08:20:aa:bb:cc'
    );
  });
});

describe('zoneFacts', () => {
  it('names the facts a zone carries and no other', () => {
    expect(zoneFacts(zoneConfiguration).map(fact => [fact.key, fact.kind, fact.value])).toEqual([
      ['zonename', 'code', 'web-1'],
      ['zonepath', 'code', '/rpool/zones/web-1'],
      ['hostid', 'badge', '00c0ffee'],
    ]);
  });

  it('answers none for a configuration that is no zone', () => {
    expect(zoneFacts({ hostid: '00c0ffee' })).toEqual([]);
    expect(zoneFacts(undefined)).toEqual([]);
  });
});

describe('zoneSpecs', () => {
  it('answers every specification, a switch on while its value reads the word that turns it on', () => {
    const specs = Object.fromEntries(zoneSpecs(zoneConfiguration).map(spec => [spec.key, spec]));
    expect(Object.keys(specs)).toHaveLength(12);
    expect(specs.ram.value).toBe('4G');
    expect(specs.acpi.on).toBe(true);
    expect(specs.autoboot.on).toBe(false);
    expect(specs.xhci.on).toBe(true);
    expect(specs.rng.on).toBe(false);
    expect(specs['cloud-init'].value).toBe('');
    expect(specs['cloud-init'].on).toBe(false);
  });

  it('answers none for a configuration that is no zone', () => {
    expect(zoneSpecs({ ram: '4G' })).toEqual([]);
  });
});

describe('consolePortOf', () => {
  it('answers the pinned port first, then the port of a session, then auto', () => {
    expect(
      consolePortOf({ knob_current: { consoleport: 6001 }, machine_info: { vnc_port: 5901 } })
    ).toEqual({ kind: 'pinned', port: '6001' });
    expect(consolePortOf({ knob_current: {}, machine_info: { vnc_port: 5901 } })).toEqual({
      kind: 'live',
      port: '5901',
    });
    expect(consolePortOf({ knob_current: {}, machine_info: { vnc_port: null } })).toEqual({
      kind: 'auto',
      port: '',
    });
    expect(consolePortOf(null)).toEqual({ kind: 'auto', port: '' });
  });
});

describe('natForwardsOf and forwardLine', () => {
  const forward = {
    name: 'ssh',
    protocol: 'tcp',
    host_ip: '',
    host_port: 2222,
    guest_ip: '10.0.2.15',
    guest_port: 22,
    adapter: 1,
  };

  it('answers the list a configuration carries and none otherwise', () => {
    expect(natForwardsOf({ configuration: { nat_forwards: [forward] } })).toEqual([forward]);
    expect(natForwardsOf({ configuration: { nat_forwards: 'ssh' } })).toEqual([]);
    expect(natForwardsOf({ configuration: {} })).toEqual([]);
    expect(natForwardsOf(null)).toEqual([]);
  });

  it('draws a forward as one line, a star for an address left open', () => {
    expect(forwardLine(forward)).toBe('ssh: *:2222 → 10.0.2.15:22');
  });
});

describe('guestAddresses', () => {
  it('answers one address a network adapter from the guest properties', () => {
    expect(
      guestAddresses([
        { name: '/VirtualBox/GuestInfo/Net/0/V4/IP', value: '10.0.2.15' },
        { name: '/VirtualBox/GuestInfo/Net/1/V4/IP', value: '192.168.1.50' },
        { name: '/VirtualBox/GuestInfo/Net/1/V4/Netmask', value: '255.255.255.0' },
        { name: '/VirtualBox/GuestInfo/OS/Product', value: 'Linux' },
        { value: 'nameless' },
      ])
    ).toEqual([
      { nic: '0', ip: '10.0.2.15' },
      { nic: '1', ip: '192.168.1.50' },
    ]);
  });
});

describe('cloudInitSeeds', () => {
  it('answers the seeded values named without the prefix', () => {
    expect(
      cloudInitSeeds([
        { name: '/Hyperweaver/CloudInit/dns_domain', value: 'example.com' },
        { name: '/VirtualBox/GuestInfo/OS/Product', value: 'Linux' },
        { value: 'nameless' },
      ])
    ).toEqual([{ name: 'dns_domain', value: 'example.com' }]);
  });
});

describe('guestSourceKey', () => {
  it('names the guest additions and the guest agent for every other source', () => {
    expect(guestSourceKey('additions')).toBe('hosts.machines.guest.sourceAdditions');
    expect(guestSourceKey('guest-agent')).toBe('hosts.machines.guest.sourceAgent');
    expect(guestSourceKey('')).toBe('hosts.machines.guest.sourceAgent');
  });
});

describe('parseTags and tagsText', () => {
  it('splits on commas, trims and drops the empty ones', () => {
    expect(parseTags(' web, lab ,, critical ')).toEqual(['web', 'lab', 'critical']);
    expect(parseTags('')).toEqual([]);
  });

  it('joins the tags with a comma and a space', () => {
    expect(tagsText(['web', 'lab'])).toBe('web, lab');
    expect(tagsText([])).toBe('');
  });
});

describe('organizationsOf', () => {
  const memberships = [{ uuid: 'a-1', name: 'Acme' }];

  it('names each organization by the membership that carries it and by uuid otherwise', () => {
    expect(organizationsOf({ org_uuids: ['a-1', 'b-2'] }, memberships)).toEqual(['Acme', 'b-2']);
    expect(organizationsOf({ org_uuids: [] }, memberships)).toEqual([]);
  });

  it('answers null for a row without the list', () => {
    expect(organizationsOf({ name: 'dev-1' }, memberships)).toBeNull();
    expect(organizationsOf(null, memberships)).toBeNull();
  });
});
