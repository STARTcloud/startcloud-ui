import { describe, expect, it } from 'vitest';

import {
  CREATE_STEPS,
  boxOptionsOf,
  bridgeChoicesOf,
  buildCloudInit,
  buildDisks,
  buildSpec,
  cleanNetworks,
  createRouteOf,
  createSeedOf,
  createdOf,
  defaultExternalNetwork,
  emptyCloudInit,
  emptyDiskConfig,
  emptySettings,
  hostCreates,
  nextServerIdOf,
  parseVboxPassthrough,
  stepProblemOf,
  withoutCreateSeed,
} from '../../src/features/hosts/utils/machineCreate.js';

const hostOf = (hypervisors, features) => ({ capabilities: { hypervisors, features } });

const vbox = hostOf(['virtualbox'], ['machines', 'machine-create']);
const zone = hostOf(['bhyve'], ['machines', 'machine-create', 'zfs']);
const bare = hostOf(['virtualbox'], ['machines']);

const formOf = (more = {}) => ({
  name: '',
  machineHypervisor: '',
  familyName: '',
  version: null,
  versionKey: '',
  settings: { ...emptySettings(), hostname: 'web-3', domain: 'example.com', server_id: '1042' },
  bootSource: 'template',
  diskConfig: emptyDiskConfig(),
  bootOrder: [],
  zones: {},
  cloudInit: emptyCloudInit(),
  hardwarePayload: {},
  vboxJson: '',
  tagsInput: '',
  notes: '',
  networks: [defaultExternalNetwork()],
  roles: [],
  properties: {},
  syncMethod: 'rsync',
  removeTransport: '',
  needsSafeId: false,
  safeIdPath: '',
  orgUuid: '',
  startAfterCreate: false,
  bhyve: false,
  vbox: true,
  ...more,
});

describe('hostCreates', () => {
  it('draws New machine for a person who may create on a host that lists machines and machine-create', () => {
    expect(hostCreates(vbox, 'admin')).toBe(true);
    expect(hostCreates(zone, 'super-admin')).toBe(true);
    expect(hostCreates(vbox, 'user')).toBe(false);
    expect(hostCreates(bare, 'admin')).toBe(false);
    expect(hostCreates(hostOf(['virtualbox'], ['machine-create']), 'admin')).toBe(false);
    expect(hostCreates(null, 'admin')).toBe(false);
  });
});

describe('the deep link', () => {
  it('reads the box seed and the provisioner seed of ?create=machine and nothing of any other query', () => {
    const params = new URLSearchParams(
      'create=machine&box=startcloud/debian13&box_version=13.1.0&box_url=https://b/x'
    );
    expect(createSeedOf(params)).toEqual({
      box: 'startcloud/debian13',
      box_version: '13.1.0',
      box_arch: '',
      box_url: 'https://b/x',
      provisioner: '',
      provisioner_version: '',
      provisioner_url: '',
    });
    expect(
      createSeedOf(
        new URLSearchParams(
          'create=machine&provisioner=startcloud&provisioner_version=0.1.27&provisioner_url=https://c/p.tar.gz'
        )
      )
    ).toMatchObject({
      box: '',
      provisioner: 'startcloud',
      provisioner_version: '0.1.27',
      provisioner_url: 'https://c/p.tar.gz',
    });
    expect(createSeedOf(new URLSearchParams('create=zone'))).toBeNull();
    expect(createSeedOf(new URLSearchParams(''))).toBeNull();
  });

  it('takes the deep link out of the query and leaves the rest', () => {
    const params = new URLSearchParams(
      'tab=x&create=machine&box=a&box_version=1&provisioner=p&provisioner_version=2&provisioner_url=u'
    );
    expect(withoutCreateSeed(params).toString()).toBe('tab=x');
  });

  it('routes a door to the host page with the query and the seed', () => {
    expect(createRouteOf('1')).toBe('/hosts/1?create=machine');
    expect(createRouteOf('self', { box: 'a/b', box_version: '', box_arch: 'amd64' })).toBe(
      '/hosts/self?create=machine&box=a%2Fb&box_arch=amd64'
    );
    expect(
      createRouteOf('self', { provisioner: 'startcloud', provisioner_version: '0.1.27' })
    ).toBe('/hosts/self?create=machine&provisioner=startcloud&provisioner_version=0.1.27');
  });
});

describe('buildDisks', () => {
  it('declares the boot type and that type keys alone', () => {
    const template = buildDisks(
      formOf({ diskConfig: { ...emptyDiskConfig(), bootSize: '32G', bootDirectory: 'D:\\vms' } })
    );
    expect(template.boot).toEqual({
      type: 'template',
      size: '32G',
      sparse: true,
      clone_strategy: 'copy',
      directory: 'D:\\vms',
    });
    const existing = buildDisks(
      formOf({
        bootSource: 'existing',
        diskConfig: { ...emptyDiskConfig(), bootPath: 'D:\\a.vdi', bootSize: '9G' },
      })
    );
    expect(existing.boot).toEqual({ type: 'image', path: 'D:\\a.vdi' });
    expect(buildDisks(formOf({ bootSource: 'none' })).boot).toEqual({ type: 'none' });
  });

  it('places a bhyve boot on its pool and dataset and never a directory or a controller', () => {
    const disks = buildDisks(
      formOf({
        bhyve: true,
        vbox: false,
        diskConfig: {
          ...emptyDiskConfig(),
          bootPool: ' tank ',
          bootDataset: 'zones/a',
          bootController: 'SATA',
          bootDirectory: '/x',
          bootCloneStrategy: 'localize',
        },
      })
    );
    expect(disks.boot).toEqual({
      type: 'template',
      sparse: true,
      pool: 'tank',
      dataset: 'zones/a',
      clone_strategy: 'localize',
    });
  });

  it('carries the controllers, the additional disks, each typed, and the cdroms with their addressing', () => {
    const disks = buildDisks(
      formOf({
        bootSource: 'none',
        diskConfig: {
          ...emptyDiskConfig(),
          controllers: [
            { key: 'c1', name: ' NVMe ', type: 'nvme', ports: '4', bootable: true },
            { key: 'c2', name: '', type: '', ports: '', bootable: false },
          ],
          additional: [
            {
              key: 'd1',
              mode: 'new',
              size: '20G',
              sparse: false,
              volume_name: 'data',
              controller: 'NVMe',
              port: '1',
            },
            { key: 'd2', mode: 'existing', path: 'D:\\old.vdi', port: '' },
            { key: 'd3', mode: 'existing', path: '' },
            { key: 'd4', mode: 'new', size: '' },
          ],
          cdroms: [
            { key: 'i1', source: 'iso', iso: 'debian.iso', controller: 'IDE', port: '0' },
            { key: 'i2', source: 'path', path: ' /isos/w.iso ' },
            { key: 'i3', source: 'iso', iso: '' },
          ],
        },
      })
    );
    expect(disks).toEqual({
      controllers: [{ name: 'NVMe', type: 'nvme', ports: 4, bootable: true }],
      boot: { type: 'none' },
      additional_disks: [
        {
          type: 'blank',
          size: '20G',
          sparse: false,
          volume_name: 'data',
          controller: 'NVMe',
          port: 1,
        },
        { type: 'image', path: 'D:\\old.vdi' },
      ],
      cdroms: [{ iso: 'debian.iso', controller: 'IDE', port: 0 }, { path: '/isos/w.iso' }],
    });
  });
});

describe('buildCloudInit and the vbox passthrough', () => {
  it('sends cloud-init only while enabled and only what is said', () => {
    expect(buildCloudInit(emptyCloudInit())).toBeNull();
    expect(
      buildCloudInit({
        enabled: true,
        dns_domain: '',
        password: 'pw',
        resolvers: '1.1.1.1, ,8.8.8.8',
        sshkey: '',
      })
    ).toEqual({ enabled: true, password: 'pw', resolvers: ['1.1.1.1', '8.8.8.8'] });
  });

  it('parses the raw vbox JSON and answers null for empty or broken text', () => {
    expect(parseVboxPassthrough('{"directives":{"a":1}}')).toEqual({ directives: { a: 1 } });
    expect(parseVboxPassthrough('  ')).toBeNull();
    expect(parseVboxPassthrough('{oops')).toBeNull();
  });
});

describe('cleanNetworks', () => {
  it('drops a blank DNS and the blank adapter knobs and types the numbers and the cable', () => {
    expect(
      cleanNetworks([
        {
          type: 'external',
          bridge: 'eth0',
          dns: ['', '8.8.8.8'],
          promisc: '',
          nic_type: 'virtio',
          speed: '1000',
          boot_prio: '',
          cable_connected: 'off',
          route: undefined,
        },
        { type: 'internal', dns: [] },
      ])
    ).toEqual([
      {
        type: 'external',
        bridge: 'eth0',
        dns: ['8.8.8.8'],
        nic_type: 'virtio',
        speed: 1000,
        cable_connected: false,
      },
      { type: 'internal' },
    ]);
  });
});

describe('buildSpec', () => {
  it('sends the settings the wizard edited, typed, the box fields on a template boot alone, and the sections the platform reads', () => {
    const spec = buildSpec(
      formOf({
        settings: {
          ...emptySettings(),
          hostname: 'web-3',
          domain: 'example.com',
          box: 'startcloud/debian13',
          box_version: '13.1.0',
          boot_priority: '80',
          setup_wait: '30',
          show_console: 'true',
          vagrant_ssh_insert_key: 'false',
        },
        bootOrder: ['dvd', 'disk'],
        tagsInput: 'dev, lab,,',
        notes: ' first ',
        zones: { diskif: 'sata', guest_agent: true },
        hardwarePayload: { audio: { controller: 'hda' } },
        startAfterCreate: true,
      })
    );
    expect(spec).toEqual({
      settings: {
        hostname: 'web-3',
        domain: 'example.com',
        vcpus: 2,
        memory: '2G',
        boot_priority: 80,
        box: 'startcloud/debian13',
        box_version: '13.1.0',
        setup_wait: 30,
        show_console: true,
        vagrant_ssh_insert_key: false,
        boot_order: ['dvd', 'disk'],
      },
      disks: { boot: { type: 'template', sparse: true, clone_strategy: 'copy' } },
      vbox: { audio: { controller: 'hda' }, guest_agent: true },
      tags: ['dev', 'lab'],
      notes: 'first',
      networks: [
        {
          type: 'external',
          bridge: '',
          dhcp4: true,
          dhcp6: false,
          mac: 'auto',
          dns: ['1.1.1.1', '8.8.8.8'],
        },
      ],
      roles: [],
      properties: {},
      sync_method: 'rsync',
      start_after_create: true,
    });
    expect(spec).not.toHaveProperty('zones');
    expect(spec).not.toHaveProperty('provisioner');
  });

  it('leaves the box fields off a blank boot and sends the zone fields of a bhyve host', () => {
    const spec = buildSpec(
      formOf({
        bhyve: true,
        vbox: false,
        bootSource: 'scratch',
        settings: { ...emptySettings(), hostname: 'z', domain: 'd', box: 'a/b' },
        zones: { netif: 'e1000', bootrom: '', diskif: undefined },
        diskConfig: {
          ...emptyDiskConfig(),
          bootSize: '10G',
          filesystems: [
            { key: 'f', special: '/srv', dir: '/mnt', type: '', options: 'ro' },
            { key: 'g', special: '', dir: '/x', type: '', options: '' },
          ],
        },
      })
    );
    expect(spec.settings).not.toHaveProperty('box');
    expect(spec.zones).toEqual({ netif: 'e1000' });
    expect(spec.filesystems).toEqual([{ special: '/srv', dir: '/mnt', options: 'ro' }]);
    expect(spec.disks.boot).toEqual({ type: 'blank', size: '10G', sparse: true });
    expect(spec).not.toHaveProperty('vbox');
  });

  it('names the provisioner, the transport signal, the safe id and the organization only where chosen', () => {
    const spec = buildSpec(
      formOf({
        name: ' web-3 ',
        machineHypervisor: 'utm',
        familyName: 'startcloud',
        version: { version: '0.1.27' },
        versionKey: '0.1.27',
        removeTransport: 'true',
        needsSafeId: true,
        safeIdPath: '/ids/safe.id',
        orgUuid: 'org-1',
        vboxJson: '{"directives":{}}',
      })
    );
    expect(spec).toMatchObject({
      name: 'web-3',
      hypervisor: 'utm',
      provisioner: { name: 'startcloud', version: '0.1.27' },
      remove_transport_on_completion: true,
      safe_id_path: '/ids/safe.id',
      org_uuid: 'org-1',
      vbox: { directives: {} },
    });
    const plain = buildSpec(
      formOf({ removeTransport: 'true', safeIdPath: '/x', needsSafeId: false })
    );
    expect(plain).not.toHaveProperty('remove_transport_on_completion');
    expect(plain).not.toHaveProperty('safe_id_path');
  });
});

describe('stepProblemOf', () => {
  it('names the sentence a step refuses on and none for a step that can be left', () => {
    expect(stepProblemOf('general', formOf({ settings: { hostname: '', domain: 'd' } }))).toBe(
      'machineEdit.machineCreateModal.hostnameDomainRequired'
    );
    expect(stepProblemOf('general', formOf())).toBe('');
    expect(stepProblemOf('box', formOf({ machineHypervisor: 'utm' }))).toBe(
      'machineEdit.machineCreateModal.utmRequiresTemplateBox'
    );
    expect(
      stepProblemOf(
        'box',
        formOf({ machineHypervisor: 'utm', settings: { ...emptySettings(), box: 'a/b' } })
      )
    ).toBe('');
    expect(stepProblemOf('system', formOf({ vboxJson: '{' }))).toBe(
      'machineEdit.machineCreateModal.vboxJsonInvalid'
    );
    expect(stepProblemOf('disks', formOf({ bootSource: 'scratch' }))).toBe(
      'machineEdit.machineCreateModal.blankBootNeedsSize'
    );
    expect(stepProblemOf('disks', formOf({ bootSource: 'existing' }))).toBe(
      'machineEdit.machineCreateModal.existingBootNeedsPath'
    );
    expect(stepProblemOf('provisioning', formOf({ familyName: 'startcloud' }))).toBe(
      'machineEdit.machineCreateModal.selectVersionOrNone'
    );
    CREATE_STEPS.forEach(step => expect(stepProblemOf(step, formOf())).toBe(''));
  });
});

describe('the answers', () => {
  it('reads a queued create and a multi-host create', () => {
    expect(
      createdOf({ parent_task_id: 'p1', machine_name: 'm1', requires_download: true }, 'fallback')
    ).toEqual({ machineName: 'm1', taskId: 'p1', requiresDownload: true, names: [] });
    expect(createdOf({ task_id: 't1' }, 'fallback')).toEqual({
      machineName: 'fallback',
      taskId: 't1',
      requiresDownload: false,
      names: [],
    });
    expect(
      createdOf(
        {
          multi_host: true,
          machines: [
            { machine_name: 'a', parent_task_id: 'pa' },
            { machine_name: 'b', parent_task_id: 'pb' },
          ],
        },
        'fallback'
      )
    ).toEqual({ machineName: 'a', taskId: 'pa', requiresDownload: false, names: ['a', 'b'] });
    expect(createdOf(null, 'f').machineName).toBe('f');
  });

  it('reads the next server id under whichever member names it', () => {
    expect(nextServerIdOf({ server_id: 1042 })).toBe('1042');
    expect(nextServerIdOf({ next_server_id: '7' })).toBe('7');
    expect(nextServerIdOf({ next: 3 })).toBe('3');
    expect(nextServerIdOf({})).toBe('');
    expect(nextServerIdOf(null)).toBe('');
  });
});

describe('the picker rows', () => {
  it('labels the uplinks by their class and traits', () => {
    expect(
      bridgeChoicesOf([
        { name: 'eth0', class: 'phys', provisioning: false, wireless: false },
        { name: 'aggr0', class: 'aggr', provisioning: true, wireless: false },
        { name: 'wlan0', class: '', provisioning: false, wireless: true },
      ])
    ).toEqual([
      { value: 'eth0', label: 'eth0 (phys)', provisioning: false },
      { value: 'aggr0', label: 'aggr0 (aggr · provisioning)', provisioning: true },
      { value: 'wlan0', label: 'wlan0 (wifi)', provisioning: false },
    ]);
  });

  it('merges the registries and the local templates into one image list', () => {
    const rows = boxOptionsOf(
      [
        {
          value: 'startcloud/debian13',
          versions: ['13.1.0'],
          architectures: ['amd64'],
          source: 'boxvault',
          sourceUrl: 'https://b',
          isDefaultSource: true,
        },
        {
          value: 'acme/win',
          versions: ['1'],
          architectures: [],
          source: 'mirror',
          sourceUrl: 'https://m',
          isDefaultSource: false,
        },
      ],
      [
        {
          organization: 'startcloud',
          box_name: 'debian13',
          version: '13.0.0',
          architecture: 'arm64',
        },
        { organization: 'local', box_name: 'only', version: '1', architecture: 'amd64' },
      ]
    );
    expect(rows.map(row => row.key)).toEqual([
      'acme/win@mirror',
      'local/only@local',
      'startcloud/debian13@boxvault',
    ]);
    expect(rows[2]).toMatchObject({
      versions: ['13.1.0', '13.0.0'],
      architectures: ['amd64', 'arm64'],
      local: true,
      isDefaultSource: true,
    });
    expect(rows[1]).toMatchObject({ local: true, isDefaultSource: true, source: '' });
    expect(rows[0].local).toBe(false);
  });
});
