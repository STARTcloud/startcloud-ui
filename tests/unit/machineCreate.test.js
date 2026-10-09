import { describe, expect, it } from 'vitest';

import {
  CREATE_STEPS,
  boxOptionsOf,
  bridgeChoicesOf,
  buildCloudInit,
  buildDisks,
  buildSpec,
  catalogSourceBody,
  catalogVersionOf,
  cleanNetworks,
  createRouteOf,
  createSeedOf,
  createdOf,
  defaultExternalNetwork,
  emptyCloudInit,
  emptyDiskConfig,
  emptySettings,
  handoffOf,
  handoffReasonKey,
  handoffRouteOf,
  handoffTitleOf,
  hostCreates,
  hostTakes,
  installOfferOf,
  nextServerIdOf,
  parseVboxPassthrough,
  seedBoxFor,
  seedBoxOf,
  seedFamilyOf,
  stepProblemOf,
  templateSourceFor,
  templateSourceFormOf,
  withoutCreateSeed,
} from '../../src/features/hosts/utils/machineCreate.js';

const VBOX_BOX =
  'STARTcloud/debian13@13.1.0@amd64@https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox';
const ZONE_BOX =
  'STARTcloud/debian13@13.1.0@amd64@https://boxvault.example.com/STARTcloud/debian13/13.1.0/zone';

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
      provisioner_catalog: '',
    });
    expect(
      createSeedOf(
        new URLSearchParams(
          'create=machine&provisioner=startcloud&provisioner_version=0.1.27&provisioner_url=https://c/p.tar.gz&provisioner_catalog=https://c/catalog.json'
        )
      )
    ).toMatchObject({
      box: '',
      provisioner: 'startcloud',
      provisioner_version: '0.1.27',
      provisioner_url: 'https://c/p.tar.gz',
      provisioner_catalog: 'https://c/catalog.json',
    });
    expect(createSeedOf(new URLSearchParams('create=zone'))).toBeNull();
    expect(createSeedOf(new URLSearchParams(''))).toBeNull();
  });

  it('takes the deep link out of the query and leaves the rest', () => {
    const params = new URLSearchParams(
      'tab=x&create=machine&box=a&box_version=1&provisioner=p&provisioner_version=2&provisioner_url=u&provisioner_catalog=c&box_virtualbox=v&box_zone=z'
    );
    expect(withoutCreateSeed(params).toString()).toBe('tab=x');
  });

  it('reads the box_<provider> members of the catalog beside the fixed ones and no other box_ key', () => {
    const seed = createSeedOf(
      new URLSearchParams(
        `create=machine&provisioner=STARTcloud%2Fstartcloud&box_zone=${encodeURIComponent(ZONE_BOX)}&box_virtualbox=${encodeURIComponent(VBOX_BOX)}&box_Virtual=x&box_utm=`
      )
    );
    expect(seed).toMatchObject({
      box: '',
      provisioner: 'STARTcloud/startcloud',
      box_virtualbox: VBOX_BOX,
      box_zone: ZONE_BOX,
    });
    expect(seed).not.toHaveProperty('box_Virtual');
    expect(seed).not.toHaveProperty('box_utm');
    expect(Object.keys(seed)).toEqual([
      'box',
      'box_version',
      'box_arch',
      'box_url',
      'provisioner',
      'provisioner_version',
      'provisioner_url',
      'provisioner_catalog',
      'box_virtualbox',
      'box_zone',
    ]);
  });

  it('routes the box_<provider> members after the fixed ones, sorted by key', () => {
    expect(
      createRouteOf('self', {
        box_zone: 'z',
        provisioner: 'a/b',
        box_virtualbox: 'v',
        box_utm: '',
        box_version: '',
      })
    ).toBe('/hosts/self?create=machine&provisioner=a%2Fb&box_virtualbox=v&box_zone=z');
  });

  it('names the host family by the part of the handed provisioner after its slash', () => {
    expect(seedFamilyOf('STARTcloud/hcl_domino_additional_provisioner')).toBe(
      'hcl_domino_additional_provisioner'
    );
    expect(seedFamilyOf('startcloud')).toBe('startcloud');
    expect(seedFamilyOf('')).toBe('');
    expect(seedFamilyOf(undefined)).toBe('');
  });

  it('routes a door to the host page with the query and the seed', () => {
    expect(createRouteOf('1')).toBe('/hosts/1?create=machine');
    expect(createRouteOf('self', { box: 'a/b', box_version: '', box_arch: 'amd64' })).toBe(
      '/hosts/self?create=machine&box=a%2Fb&box_arch=amd64'
    );
    expect(
      createRouteOf('self', { provisioner: 'startcloud', provisioner_version: '0.1.27' })
    ).toBe('/hosts/self?create=machine&provisioner=startcloud&provisioner_version=0.1.27');
    expect(
      createRouteOf('self', { provisioner: 'a/b', provisioner_catalog: 'https://c/catalog.json' })
    ).toBe(
      '/hosts/self?create=machine&provisioner=a%2Fb&provisioner_catalog=https%3A%2F%2Fc%2Fcatalog.json'
    );
  });
});

describe('the words of the hand-off', () => {
  const registry = hostOf(['virtualbox'], ['machines', 'provisioner-registry']);
  const templated = hostOf(['bhyve'], ['templates']);
  const catalogUrl = 'https://provisioner-catalog.startcloud.com/catalog.json';
  const boxUrl = 'https://boxvault.example.com';

  it('reads each word with its own keys and no other, and refuses a word outside the four', () => {
    expect(
      handoffOf(
        new URLSearchParams(
          'create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&box=a%2Fb&box_virtualbox=x'
        )
      )
    ).toEqual({
      word: 'provisioner',
      seed: {
        provisioner: 'STARTcloud/startcloud',
        provisioner_version: '0.1.28',
        provisioner_url: '',
        provisioner_catalog: '',
      },
    });
    expect(
      handoffOf(new URLSearchParams('create=template&box=startcloud%2Fdebian13&box_version=13.1.0'))
    ).toEqual({
      word: 'template',
      seed: { box: 'startcloud/debian13', box_version: '13.1.0', box_arch: '', box_url: '' },
    });
    expect(handoffOf(new URLSearchParams('create=machine&box=a%2Fb&box_zone=z'))).toMatchObject({
      word: 'machine',
      seed: { box: 'a/b', box_zone: 'z' },
    });
    expect(handoffOf(new URLSearchParams('create=zone'))).toBeNull();
    expect(handoffOf(new URLSearchParams(''))).toBeNull();
  });

  it('reads a source with exactly one URL and refuses neither or both', () => {
    expect(
      handoffOf(new URLSearchParams(`create=source&provisioner_catalog=${catalogUrl}`))
    ).toEqual({
      word: 'source',
      seed: { provisioner_catalog: catalogUrl, box_url: '' },
    });
    expect(handoffOf(new URLSearchParams(`create=source&box_url=${boxUrl}`)).seed).toEqual({
      provisioner_catalog: '',
      box_url: boxUrl,
    });
    expect(handoffOf(new URLSearchParams('create=source'))).toBeNull();
    expect(
      handoffOf(
        new URLSearchParams(`create=source&provisioner_catalog=${catalogUrl}&box_url=${boxUrl}`)
      )
    ).toBeNull();
  });

  it('lands each word on its page with the word and its seed kept', () => {
    expect(
      handoffRouteOf('1', 'provisioner', {
        provisioner: 'STARTcloud/startcloud',
        provisioner_version: '0.1.28',
        provisioner_url: '',
        provisioner_catalog: catalogUrl,
      })
    ).toBe(
      '/hosts/1/provisioning/catalog?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json'
    );
    expect(
      handoffRouteOf('self', 'template', {
        box: 'startcloud/debian13',
        box_version: '13.1.0',
        box_arch: 'amd64',
        box_url: boxUrl,
      })
    ).toBe(
      '/hosts/self/provisioning/templates?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com'
    );
    expect(handoffRouteOf('1', 'source', { provisioner_catalog: catalogUrl, box_url: '' })).toBe(
      '/hosts/1/provisioning/catalog?create=source&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json'
    );
    expect(handoffRouteOf('1', 'source', { provisioner_catalog: '', box_url: boxUrl })).toBe(
      '/hosts/1/provisioning/templates?create=source&box_url=https%3A%2F%2Fboxvault.example.com'
    );
    expect(handoffRouteOf('1', 'machine', { box: 'a/b' })).toBe(createRouteOf('1', { box: 'a/b' }));
  });

  it('counts the hosts that can take each word by the token of its landing page and the role', () => {
    expect(hostTakes(vbox, 'machine', {}, 'admin')).toBe(true);
    expect(hostTakes(registry, 'machine', {}, 'admin')).toBe(false);
    expect(hostTakes(registry, 'provisioner', {}, 'admin')).toBe(true);
    expect(hostTakes(registry, 'provisioner', {}, 'user')).toBe(false);
    expect(hostTakes(vbox, 'provisioner', {}, 'admin')).toBe(false);
    expect(hostTakes(templated, 'template', {}, 'admin')).toBe(true);
    expect(hostTakes(registry, 'template', {}, 'admin')).toBe(false);
    expect(hostTakes(registry, 'source', { provisioner_catalog: catalogUrl }, 'admin')).toBe(true);
    expect(hostTakes(templated, 'source', { provisioner_catalog: catalogUrl }, 'admin')).toBe(
      false
    );
    expect(hostTakes(templated, 'source', { box_url: boxUrl }, 'admin')).toBe(true);
    expect(hostTakes(null, 'template', {}, 'admin')).toBe(false);
  });

  it('names the one reason a host cannot take a word', () => {
    expect(handoffReasonKey('machine', {})).toBe('hosts.deploy.reason.noCreate');
    expect(handoffReasonKey('provisioner', {})).toBe('hosts.deploy.reason.noRegistry');
    expect(handoffReasonKey('template', {})).toBe('hosts.deploy.reason.noTemplates');
    expect(handoffReasonKey('source', { provisioner_catalog: catalogUrl })).toBe(
      'hosts.deploy.reason.noRegistry'
    );
    expect(handoffReasonKey('source', { box_url: boxUrl })).toBe('hosts.deploy.reason.noTemplates');
  });

  it('names the banner by the thing handed, the URL host for a source', () => {
    expect(
      handoffTitleOf('provisioner', { provisioner: 'STARTcloud/x', provisioner_version: '1' })
    ).toEqual({ name: 'STARTcloud/x', version: '1' });
    expect(handoffTitleOf('template', { box: 'a/b', box_version: '2' })).toEqual({
      name: 'a/b',
      version: '2',
    });
    expect(handoffTitleOf('machine', { box: 'a/b', box_version: '2', provisioner: '' })).toEqual({
      name: 'a/b',
      version: '2',
    });
    expect(
      handoffTitleOf('machine', { box: '', provisioner: 'o/p', provisioner_version: '3' })
    ).toEqual({ name: 'o/p', version: '3' });
    expect(handoffTitleOf('source', { provisioner_catalog: catalogUrl })).toEqual({
      name: 'provisioner-catalog.startcloud.com',
      version: '',
    });
    expect(handoffTitleOf('source', { box_url: 'not a url' })).toEqual({
      name: 'not a url',
      version: '',
    });
  });

  it('takes every word out of the query', () => {
    expect(
      withoutCreateSeed(
        new URLSearchParams(`tab=x&create=source&provisioner_catalog=${catalogUrl}`)
      ).toString()
    ).toBe('tab=x');
    expect(
      withoutCreateSeed(new URLSearchParams('create=template&box=a&box_url=u&page=2')).toString()
    ).toBe('page=2');
  });
});

describe('the box of the host', () => {
  const seed = { box: '', box_virtualbox: VBOX_BOX, box_zone: ZONE_BOX };

  it('picks the member of the host hypervisor, box_virtualbox on VirtualBox and box_zone then box_bhyve on bhyve', () => {
    expect(seedBoxFor(seed, ['virtualbox'])).toEqual({
      box: 'STARTcloud/debian13',
      box_version: '13.1.0',
      box_arch: 'amd64',
      box_url: 'https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox',
    });
    expect(seedBoxFor(seed, ['bhyve']).box_url).toBe(
      'https://boxvault.example.com/STARTcloud/debian13/13.1.0/zone'
    );
    expect(seedBoxFor({ box_bhyve: 'a/b@1@arm64@https://x' }, ['bhyve'])).toEqual({
      box: 'a/b',
      box_version: '1',
      box_arch: 'arm64',
      box_url: 'https://x',
    });
  });

  it('picks box_utm then box_virtualbox on UTM, in the order of the host hypervisors', () => {
    expect(
      seedBoxFor({ box_utm: 'a/b@1@arm64@u', box_virtualbox: VBOX_BOX }, ['utm']).box_url
    ).toBe('u');
    expect(seedBoxFor({ box_virtualbox: VBOX_BOX }, ['utm']).box_arch).toBe('amd64');
    expect(seedBoxFor(seed, ['bhyve', 'virtualbox']).box_url).toContain('/zone');
  });

  it('answers null while no member fits the host, the host names no hypervisor or the member names no box', () => {
    expect(seedBoxFor(seed, ['xen'])).toBeNull();
    expect(seedBoxFor(seed, [])).toBeNull();
    expect(seedBoxFor(seed, undefined)).toBeNull();
    expect(seedBoxFor(null, ['virtualbox'])).toBeNull();
    expect(seedBoxFor({ box_virtualbox: '@1@amd64@u' }, ['virtualbox'])).toBeNull();
    expect(seedBoxFor({ box_virtualbox: 'a/b' }, ['virtualbox'])).toEqual({
      box: 'a/b',
      box_version: '',
      box_arch: '',
      box_url: '',
    });
  });

  it('lets a plain box seed win over the box_<provider> members', () => {
    expect(
      seedBoxOf({ ...seed, box: 'startcloud/debian13', box_version: '13.0.0' }, ['virtualbox'])
    ).toEqual({ box: 'startcloud/debian13', box_version: '13.0.0', box_arch: '', box_url: '' });
    expect(seedBoxOf(seed, ['virtualbox']).box).toBe('STARTcloud/debian13');
    expect(seedBoxOf(null, ['virtualbox'])).toBeNull();
  });
});

describe('the registry of a handed box', () => {
  const sources = [
    {
      id: 'mirror',
      name: 'Mirror',
      url: 'https://mirror.example.com',
      enabled: true,
      default: false,
    },
    {
      id: 'boxvault',
      name: 'BoxVault',
      url: 'https://boxvault.example.com',
      enabled: true,
      default: true,
    },
    { id: 'old', name: 'Old', url: 'https://old.example.com', enabled: false, default: false },
  ];

  it('finds the enabled source the box URL starts with, the default one for no URL, none otherwise', () => {
    expect(templateSourceFor(sources, 'https://boxvault.example.com/STARTcloud/debian13').id).toBe(
      'boxvault'
    );
    expect(templateSourceFor(sources, '').id).toBe('boxvault');
    expect(templateSourceFor(sources, 'https://old.example.com/x')).toBeNull();
    expect(templateSourceFor(sources, 'https://elsewhere.example.com/x')).toBeNull();
    expect(templateSourceFor([], 'https://boxvault.example.com/x')).toBeNull();
    expect(templateSourceFor(null, '')).toBeNull();
  });

  it('shapes the registry form from the box URL, its host the id and the display name and its origin the URL', () => {
    expect(
      templateSourceFormOf('https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox')
    ).toEqual({
      name: 'boxvault_example_com',
      displayName: 'boxvault.example.com',
      url: 'https://boxvault.example.com',
      isDefault: false,
      auth_token: '',
      ca_file: '',
    });
    expect(templateSourceFormOf('http://127.0.0.1:4173/x').name).toBe('127_0_0_1_4173');
    expect(templateSourceFormOf('not a url')).toBeNull();
    expect(templateSourceFormOf('')).toBeNull();
  });
});

const catalogOf = (name, versions) => ({
  provisioners: [{ name, versions: versions.map(version => ({ version })) }],
});

describe('the install of a handed family', () => {
  it('reads the named version of a family from a catalog, the first while none is named', () => {
    const catalog = catalogOf('hcl', ['0.3.0', '0.2.0']);
    expect(catalogVersionOf(catalog, 'hcl', '0.2.0')).toBe('0.2.0');
    expect(catalogVersionOf(catalog, 'hcl', '')).toBe('0.3.0');
    expect(catalogVersionOf(catalog, 'hcl', '9.9.9')).toBeNull();
    expect(catalogVersionOf(catalog, 'other', '')).toBeNull();
    expect(catalogVersionOf(null, 'hcl', '')).toBeNull();
  });

  it('offers the install from the first source that lists the family and the version', () => {
    const sources = [
      { id: 'staging', url: 'https://s/catalog.json' },
      { id: 'main', url: 'https://m/catalog.json' },
    ];
    const catalogs = { staging: catalogOf('hcl', ['0.2.0']), main: catalogOf('hcl', ['0.3.0']) };
    expect(
      installOfferOf({ sources, catalogs, name: 'hcl', version: '0.3.0', catalogUrl: '' })
    ).toEqual({ kind: 'install', source: 'main', version: '0.3.0' });
  });

  it('offers the source add while no source lists it and the handed catalog is no source', () => {
    const sources = [{ id: 'main', url: 'https://m/catalog.json' }];
    const catalogs = { main: catalogOf('other', ['1.0.0']) };
    expect(
      installOfferOf({
        sources,
        catalogs,
        name: 'hcl',
        version: '0.3.0',
        catalogUrl: 'https://c/catalog.json',
      })
    ).toEqual({ kind: 'add', source: '', version: '0.3.0' });
    expect(
      installOfferOf({
        sources,
        catalogs,
        name: 'hcl',
        version: '0.3.0',
        catalogUrl: 'https://m/catalog.json',
      }).kind
    ).toBe('missing');
    expect(
      installOfferOf({ sources: [], catalogs: {}, name: 'hcl', version: '', catalogUrl: '' }).kind
    ).toBe('missing');
  });

  it('adds a handed catalog under its host, oidc for an organization private catalog', () => {
    expect(catalogSourceBody('https://provisioner-catalog.startcloud.com/catalog.json')).toEqual({
      display_name: 'provisioner-catalog.startcloud.com',
      url: 'https://provisioner-catalog.startcloud.com/catalog.json',
      auth: 'none',
    });
    expect(
      catalogSourceBody(
        'https://provisioner-catalog.startcloud.com/api/private/0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11/catalog'
      ).auth
    ).toBe('oidc');
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
