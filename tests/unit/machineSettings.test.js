import { describe, expect, it } from 'vitest';

import {
  FIELDS,
  TABS,
  asFormString,
  buildDeviceChanges,
  buildScalarChanges,
  buildSeed,
  buildUtmSection,
  buildZoneChanges,
  changedNicEntries,
  cpuChangesOf,
  editableFields,
  immediateOnlyChanges,
  messageBase,
  pendingCount,
  visibleTabs,
  warningsSuffix,
  zoneBootDevicesOf,
  zoneNicUpdateEntry,
} from '../../src/features/hosts/utils/machineSettings.js';

const t = (key, options) => (options ? `${key}:${JSON.stringify(options)}` : key);

const vbox = { capabilities: { hypervisors: ['virtualbox'], features: [] } };
const bhyve = { capabilities: { hypervisors: ['bhyve'], features: [] } };

const knobCurrent = {
  ram: 8192,
  vcpus: 4,
  bootrom: 'bios',
  autoboot: true,
  guest_agent: false,
  boot_priority: 95,
  consoleport: 6001,
  boot_order: ['disk', 'dvd'],
  cpu_topology: null,
  nics: [
    { adapter: 1, cable_connected: 'on', nic_type: '82540EM', provisional: true },
    { adapter: 2, cable_connected: true, nic_type: '82540EM' },
  ],
  vbox: {
    cpu: { hotplug: 'off', execution_cap: 100 },
    serial: [{ port: 1, io_base: '0x3F8', irq: 4, mode: 'disconnected' }],
  },
  credentials: { vagrant_user: 'vagrant' },
};

describe('asFormString', () => {
  it('answers a list joined, an object by its enabled and nothing as the empty string', () => {
    expect(asFormString(['a', 'b'])).toBe('a,b');
    expect(asFormString({ enabled: true })).toBe('true');
    expect(asFormString({})).toBe('');
    expect(asFormString(null)).toBe('');
    expect(asFormString(4)).toBe('4');
  });
});

describe('buildSeed', () => {
  const seed = buildSeed({ type: 'generic', ram: '4G' }, knobCurrent);

  it('reads the knobs from knob_current over the configuration, os_type from type', () => {
    expect(seed.values.ram).toBe('8192');
    expect(seed.values.vcpus).toBe('4');
    expect(seed.values.bootrom).toBe('bios');
    expect(buildSeed({ type: 'generic', ram: '4G' }, null).values.os_type).toBe('generic');
    expect(buildSeed({ type: 'generic', ram: '4G' }, null).values.ram).toBe('4G');
  });

  it('seeds the autoboot, the guest agent, the ports and the credentials', () => {
    expect(seed.autoboot).toBe('true');
    expect(seed.guestAgent).toBe(false);
    expect(seed.bootPriority).toBe('95');
    expect(seed.consolePort).toBe('6001');
    expect(seed.bootOrder).toEqual(['disk', 'dvd']);
    expect(seed.hardware).toEqual({ cpu: { hotplug: 'off', execution_cap: '100' } });
    expect(seed.serialRows).toEqual([
      {
        key: 'seed-serial-1',
        port: '1',
        io_base: '0x3F8',
        irq: '4',
        mode: 'disconnected',
        type: '',
      },
    ]);
    expect(seed.nicRows[1].cable_connected).toBe('on');
    expect(seed.creds.vagrant_user).toBe('vagrant');
    expect(buildSeed({}, {}).guestAgent).toBeNull();
  });
});

describe('buildScalarChanges', () => {
  const seed = buildSeed({}, knobCurrent);
  const base = {
    values: { ...seed.values },
    initial: seed.values,
    seed,
    isUtm: false,
    utmSection: null,
    autoboot: seed.autoboot,
    guestAgent: seed.guestAgent,
    bootOrder: seed.bootOrder,
    bootPriority: seed.bootPriority,
    consolePort: seed.consolePort,
    consoleHost: seed.consoleHost,
    credsTouched: [],
    creds: seed.creds,
  };

  it('sends nothing while nothing differs from the seed', () => {
    expect(buildScalarChanges(base)).toEqual({});
  });

  it('sends the knobs that changed, the autoboot as a boolean and the priority as a number', () => {
    expect(
      buildScalarChanges({
        ...base,
        values: { ...base.values, vcpus: '8', ram: '' },
        autoboot: 'false',
        bootPriority: '50',
        consolePort: 'dynamic',
        consoleHost: ' 0.0.0.0 ',
      })
    ).toEqual({
      vcpus: '8',
      autoboot: false,
      boot_priority: 50,
      consoleport: null,
      consolehost: '0.0.0.0',
    });
  });

  it('sends every touched credential as typed and only ram and vcpus of a UTM machine', () => {
    expect(
      buildScalarChanges({
        ...base,
        credsTouched: ['vagrant_user_pass'],
        creds: { ...seed.creds, vagrant_user_pass: '' },
      })
    ).toEqual({ vagrant_user_pass: '' });
    expect(
      buildScalarChanges({
        ...base,
        isUtm: true,
        utmSection: { notes: 'n' },
        values: { ...base.values, vcpus: '2', bootrom: 'efi' },
      })
    ).toEqual({ vcpus: '2', utm: { notes: 'n' } });
  });
});

describe('cpuChangesOf', () => {
  it('sends the simple word, the complex topology as numbers, and refuses a blank field', () => {
    expect(cpuChangesOf('simple', {}).changes).toEqual({ cpu_configuration: 'simple' });
    expect(cpuChangesOf('', {}).changes).toEqual({});
    expect(cpuChangesOf('complex', { sockets: '1', cores: '4', threads: '2' }).changes).toEqual({
      cpu_configuration: 'complex',
      complex_cpu_conf: [{ sockets: 1, cores: 4, threads: 2 }],
    });
    expect(cpuChangesOf('complex', { sockets: '1', cores: '', threads: '2' }).problemKey).toBe(
      'machineEdit.machineSettings.complexCpuTopologyRequired'
    );
  });
});

describe('buildDeviceChanges', () => {
  it('sends each family only while the tab holds something', () => {
    const changes = buildDeviceChanges({
      addNics: [
        { key: 1, bridge: ' eth0 ', mac: '', cable_connected: 'off' },
        { key: 2, bridge: '', mac: '' },
      ],
      addDisks: [
        { key: 1, mode: 'new', size: ' 20G ', path: '', controller: 'SATA', port: '2' },
        { key: 2, mode: 'existing', size: '', path: '', controller: '' },
      ],
      addCdroms: [{ key: 1, source: 'iso', iso: 'debian.iso', path: '', controller: '' }],
      addControllers: [{ key: 1, name: ' ', type: 'nvme' }],
      removeControllerNames: ['IDE'],
      removeAttachments: [
        { controller: 'SATA', port: 1, device: 0, kind: 'cdrom' },
        { controller: 'SATA', port: 2, device: 0, kind: 'disk' },
      ],
      removeNicAdapters: [2],
    });
    expect(changes).toEqual({
      add_nics: [{ global_nic: 'eth0', cable_connected: false }],
      add_disks: [{ type: 'blank', size: '20G', controller: 'SATA', port: 2 }],
      add_cdroms: [{ iso: 'debian.iso' }],
      add_controllers: [{ type: 'nvme' }],
      remove_controllers: ['IDE'],
      remove_disks: [{ controller: 'SATA', port: 2, device: 0 }],
      remove_cdroms: [{ controller: 'SATA', port: 1, device: 0 }],
      remove_nics: [2],
    });
  });
});

describe('changedNicEntries', () => {
  it('sends the tuning that differs from the seed, never of a removed adapter', () => {
    const seeded = [{ adapter: '1', cable_connected: 'on', speed: '' }];
    const rows = [
      { adapter: '1', cable_connected: 'off', speed: '1000', promisc: '' },
      { adapter: '2', cable_connected: 'off' },
    ];
    expect(changedNicEntries(rows, seeded, [2])).toEqual([
      { adapter: 1, cable_connected: false, speed: 1000 },
    ]);
  });
});

describe('zone changes', () => {
  it('sends the update of a NIC only with something beside its selector', () => {
    expect(zoneNicUpdateEntry('vnic0', {})).toBeNull();
    expect(
      zoneNicUpdateEntry('vnic0', {
        global_nic: 'igb0',
        vlan_id: '11',
        props: { mtu: '9000', promiscphys: '' },
        remove_on_completion: 'true',
      })
    ).toEqual({
      physical: 'vnic0',
      global_nic: 'igb0',
      vlan_id: 11,
      props: { mtu: '9000' },
      remove_on_completion: true,
    });
  });

  it('sends the zvol-shaped disks, the removals, the updates and the cloud-init object', () => {
    expect(
      buildZoneChanges({
        addZoneDisks: [
          { mode: 'new', size: '50G', sparse: true, volume_name: '', pool: 'tank', dataset: '' },
          { mode: 'existing', existing_dataset: 'rpool/vols/data' },
        ],
        removeZoneDisks: ['disk0'],
        removeZoneCdroms: [],
        removeZoneNics: ['vnic1'],
        zoneNicEdits: { vnic0: { vlan_id: '5' }, vnic1: { vlan_id: '6' } },
        cloudInit: { enabled: 'on', password: ' ' },
      })
    ).toEqual({
      add_disks: [
        { type: 'blank', sparse: true, size: '50G', pool: 'tank' },
        { type: 'image', path: 'rpool/vols/data' },
      ],
      remove_disks: ['disk0'],
      remove_nics: ['vnic1'],
      update_nics: [{ physical: 'vnic0', vlan_id: 5 }],
      cloud_init: { enabled: 'on' },
    });
  });

  it('names the boot tokens of a zone', () => {
    expect(
      zoneBootDevicesOf({
        zone: {
          disks: [{ name: 'bootdisk' }],
          cdroms: [{ name: 'cdrom0' }],
          nics: [{ name: 'net0' }],
        },
      })
    ).toEqual(['bootdisk', 'cdrom0', 'net0']);
    expect(zoneBootDevicesOf({ zone: null })).toEqual([]);
  });
});

describe('buildUtmSection', () => {
  it('answers the notes and the arguments that changed, null while neither did', () => {
    const knobs = { utm: { notes: 'n', qemu_args: ['-a', '-b'] } };
    expect(
      buildUtmSection({ knobCurrent: knobs, utmNotes: 'n', utmQemuArgs: '-a\n-b' })
    ).toBeNull();
    expect(
      buildUtmSection({ knobCurrent: knobs, utmNotes: 'new', utmQemuArgs: ' -a \n\n-c' })
    ).toEqual({ notes: 'new', qemu_args: ['-a', '-c'] });
  });
});

describe('immediateOnlyChanges', () => {
  it('is true for the keys an agent keeps at once and flag-only NIC entries', () => {
    expect(immediateOnlyChanges({ boot_priority: 50, vagrant_user: 'x' })).toBe(true);
    expect(immediateOnlyChanges({ nics: [{ adapter: 1, remove_on_completion: true }] })).toBe(true);
    expect(immediateOnlyChanges({ nics: [{ adapter: 1, speed: 100 }] })).toBe(false);
    expect(immediateOnlyChanges({ vcpus: '8' })).toBe(false);
  });
});

describe('visibleTabs and editableFields', () => {
  it('draws the VirtualBox tabs on a virtualbox host and the bhyve tabs on a bhyve host', () => {
    const vboxKeys = visibleTabs(false, vbox).map(tab => tab.id);
    expect(vboxKeys).toContain('usb');
    expect(vboxKeys).toContain('ports');
    expect(vboxKeys).toContain('advanced');
    expect(vboxKeys).not.toContain('filesystems');
    const bhyveKeys = visibleTabs(false, bhyve).map(tab => tab.id);
    expect(bhyveKeys).toContain('filesystems');
    expect(bhyveKeys).toContain('resources');
    expect(bhyveKeys).not.toContain('usb');
    expect(visibleTabs(true, vbox).map(tab => tab.id)).toEqual([
      'general',
      'credentials',
      'nics',
      'utm',
    ]);
    expect(TABS.length).toBeGreaterThan(FIELDS.length - FIELDS.length);
  });

  it('offers ram and vcpus alone on UTM and the bhyve-only knobs on a bhyve host', () => {
    expect(editableFields(true, vbox, t).map(field => field.key)).toEqual(['ram', 'vcpus']);
    const vboxKeys = editableFields(false, vbox, t).map(field => field.key);
    expect(vboxKeys).not.toContain('uefivars');
    const bhyveFields = editableFields(false, bhyve, t);
    expect(bhyveFields.map(field => field.key)).toContain('bootnext');
    expect(bhyveFields.find(field => field.key === 'diskif').hint).toBe(
      'machineEdit.machineSettings.fieldHint.diskif'
    );
  });
});

describe('the notice words', () => {
  it('suffixes the warnings, drops the trailing period and counts the pending groups', () => {
    expect(warningsSuffix({}, t)).toBe('');
    expect(warningsSuffix({ resource_warnings: [{ message: 'a' }, 'b'] }, t)).toBe(
      'machineEdit.machineSettings.warningsSuffix:{"list":"a; b"}'
    );
    expect(messageBase({ message: 'Done..' }, 'dev-1', t)).toBe('Done');
    expect(messageBase({}, 'dev-1', t)).toBe(
      'machineEdit.machineSettings.changesAppliedTo:{"machineName":"dev-1"}'
    );
    expect(pendingCount({ pending_changes: { a: 1, b: 2 } })).toBe(2);
    expect(pendingCount({})).toBe(0);
  });
});
