import { describe, expect, it } from 'vitest';

import {
  CREATE_STEPS,
  PROVISIONER_INSTALL_OPERATIONS,
  boxOptionsOf,
  boxDiskSizeOf,
  bridgeChoicesOf,
  buildCloudInit,
  buildDisks,
  buildSpec,
  catalogSourceBody,
  catalogSourceSeedOf,
  catalogVersionOf,
  cleanNetworks,
  compareVersions,
  createRouteOf,
  createSeedOf,
  createdOf,
  defaultDomainOf,
  defaultExternalNetwork,
  defaultUplinkOf,
  fillProvisioningNetwork,
  domainChoicesOf,
  domainConfigRouteOf,
  emptyCloudInit,
  emptyDiskConfig,
  emptySettings,
  handoffOf,
  handoffReasonKey,
  handoffRouteOf,
  handoffTitleOf,
  highestVersionOf,
  hostCreates,
  hostTakes,
  installOfferOf,
  nameParts,
  nextServerIdOf,
  packageDefaultsOf,
  parseVboxPassthrough,
  prefilledFrom,
  provisioningNetworkOf,
  roleRowsOf,
  seedBoxFor,
  seedBoxOf,
  seedFamilyOf,
  sourceFilterDefaultOf,
  stepOpen,
  stepProblemOf,
  stepsFor,
  tagListOf,
  templateSourceFor,
  templateSourceFormOf,
  withDefaultUplink,
  withProvisioningNetwork,
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
  manifestRoles: [],
  properties: {},
  downloads: {},
  syncMethod: 'rsync',
  removeTransport: '',
  fieldConfig: null,
  orgUuid: '',
  startAfterCreate: false,
  provisionAfterCreate: false,
  useProvisioner: false,
  typed: new Set(),
  fromPackage: new Set(),
  bhyve: false,
  vbox: true,
  ...more,
});

const PACKAGE_DEFAULTS = {
  settings: {
    box: 'STARTcloud/debian12-server',
    box_url: 'https://boxvault.startcloud.com',
    box_version: '2025.4.30',
    box_arch: 'amd64',
    os_type: 'Debian_64',
    firmware_type: 'UEFI',
    vcpus: 2,
    memory: '8G',
    setup_wait: 420,
    vagrant_user: 'startcloud',
  },
  disks: {
    boot: { type: 'template', volume_name: 'boot', mount: '/' },
    additional_disks: [
      {
        type: 'blank',
        size: '50G',
        sparse: true,
        volume_name: 'disk1',
        mount: '/local',
        filesystem: 'xfs',
      },
    ],
  },
  networks: [{ type: 'external', dhcp4: true }],
  tags: ['domino', 'lab'],
  guest_agent: true,
};

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
      '/hosts/1/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json'
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
      '/hosts/1/provisioning/provisioners?create=source&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json'
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

  it('opens the Registry filter on the one enabled registry, else on the registry the box URL names, else on every registry', () => {
    expect(sourceFilterDefaultOf(sources, '')).toBe('');
    expect(sourceFilterDefaultOf(sources, 'https://boxvault.example.com')).toBe('boxvault');
    expect(sourceFilterDefaultOf(sources, 'https://mirror.example.com/x')).toBe('mirror');
    expect(sourceFilterDefaultOf(sources, 'https://elsewhere.example.com')).toBe('');
    expect(sourceFilterDefaultOf(sources.slice(1), '')).toBe('boxvault');
    expect(sourceFilterDefaultOf([{ name: 'legacy', enabled: true }], '')).toBe('legacy');
    expect(sourceFilterDefaultOf([], 'https://boxvault.example.com')).toBe('');
    expect(sourceFilterDefaultOf(null, '')).toBe('');
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

  it('adds a handed catalog under its host with no credential, another catalog alike', () => {
    expect(catalogSourceBody('https://provisioner-catalog.startcloud.com/catalog.json')).toEqual({
      display_name: 'provisioner-catalog.startcloud.com',
      url: 'https://provisioner-catalog.startcloud.com/catalog.json',
    });
    expect(catalogSourceBody('https://provisioner-catalog.example.com/catalog.json')).toEqual({
      display_name: 'provisioner-catalog.example.com',
      url: 'https://provisioner-catalog.example.com/catalog.json',
    });
  });

  it('names the catalog install and the import as the task operations whose end reads the families again', () => {
    expect(PROVISIONER_INSTALL_OPERATIONS).toEqual([
      'provisioner_catalog_install',
      'provisioner_import',
    ]);
  });

  it('shapes the catalog source form from the handed URL, its host the id and the display name, the URL as given and no credential', () => {
    expect(catalogSourceSeedOf('https://provisioner-catalog.example.com/catalog.json')).toEqual({
      name: 'provisioner_catalog_example_com',
      displayName: 'provisioner-catalog.example.com',
      url: 'https://provisioner-catalog.example.com/catalog.json',
      isDefault: false,
      ca_file: '',
    });
    expect(
      catalogSourceSeedOf('https://provisioner-catalog.startcloud.com/catalog.json')
    ).not.toHaveProperty('auth');
    expect(catalogSourceSeedOf('not a url')).toBeNull();
    expect(catalogSourceSeedOf('')).toBeNull();
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
      provision_after_create: false,
    });
    expect(spec).not.toHaveProperty('zones');
    expect(spec).not.toHaveProperty('provisioner');
  });

  it('sends provision_after_create as chosen, the boot mount and the additional disk mount and filesystem where present', () => {
    const spec = buildSpec(
      formOf({
        provisionAfterCreate: true,
        diskConfig: {
          ...emptyDiskConfig(),
          bootMount: ' / ',
          additional: [
            {
              key: 'p0',
              mode: 'new',
              size: '50G',
              sparse: true,
              volume_name: 'disk1',
              mount: '/local',
              filesystem: 'xfs',
            },
            { key: 'd2', mode: 'existing', path: 'D:\\old.vdi', mount: '/data', filesystem: '' },
            { key: 'd3', mode: 'new', size: '1G', mount: '', filesystem: '' },
          ],
        },
      })
    );
    expect(spec.provision_after_create).toBe(true);
    expect(spec.disks.boot).toMatchObject({ type: 'template', mount: '/' });
    expect(spec.disks.additional_disks).toEqual([
      {
        type: 'blank',
        size: '50G',
        sparse: true,
        volume_name: 'disk1',
        mount: '/local',
        filesystem: 'xfs',
      },
      { type: 'image', path: 'D:\\old.vdi', mount: '/data' },
      { type: 'blank', size: '1G', sparse: true },
    ]);
    expect(buildSpec(formOf()).disks.boot).not.toHaveProperty('mount');
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

  it('sends the guest agent switch under the section of the hypervisor, vbox, utm or zones', () => {
    expect(buildSpec(formOf({ zones: { guest_agent: true } })).vbox).toEqual({ guest_agent: true });
    const utm = buildSpec(formOf({ machineHypervisor: 'utm', zones: { guest_agent: true } }));
    expect(utm.utm).toEqual({ guest_agent: true });
    expect(utm).not.toHaveProperty('vbox');
    const bhyveSpec = buildSpec(
      formOf({
        bhyve: true,
        vbox: false,
        zones: { guest_agent: true },
        settings: { ...emptySettings(), hostname: 'z', domain: 'd' },
      })
    );
    expect(bhyveSpec.zones).toEqual({ guest_agent: true });
    expect(bhyveSpec).not.toHaveProperty('vbox');
    expect(bhyveSpec).not.toHaveProperty('utm');
    expect(buildSpec(formOf())).not.toHaveProperty('utm');
  });

  it('names the provisioner, the transport signal and the organization only where chosen, the secret answers riding properties', () => {
    const spec = buildSpec(
      formOf({
        name: ' web-3 ',
        machineHypervisor: 'utm',
        familyName: 'startcloud',
        version: { version: '0.1.27' },
        versionKey: '0.1.27',
        removeTransport: 'true',
        properties: { USER_SAFE_ID: 'sec-safe' },
        orgUuid: 'org-1',
        vboxJson: '{"directives":{}}',
      })
    );
    expect(spec).toMatchObject({
      name: 'web-3',
      hypervisor: 'utm',
      provisioner: { name: 'startcloud', version: '0.1.27' },
      remove_transport_on_completion: true,
      properties: { USER_SAFE_ID: 'sec-safe' },
      org_uuid: 'org-1',
      vbox: { directives: {} },
    });
    expect(Object.keys(spec)).not.toContain('id_files');
    expect(Object.keys(spec)).not.toContain('safe_id_path');
    const plain = buildSpec(formOf({ removeTransport: 'true' }));
    expect(plain).not.toHaveProperty('remove_transport_on_completion');
    expect(plain).not.toHaveProperty('wait_for');
  });

  it('sends the roles in their drawn order, every role with enabled, the manifest collection and tags, the files and the vars, and wait_for while downloads are queued', () => {
    const manifestRoles = [
      { name: 'networking', collection: 'startcloud.startcloud_roles', tags: 'always' },
      { name: 'domino_install', collection: 'startcloud.hcl_roles' },
    ];
    const rows = [
      {
        _ui_id: 7,
        name: 'domino_install',
        enabled: true,
        files: { installer: 'Domino_14.0_Linux_English.tar', installer_hash: '', fixpack: '' },
        vars: { domino_user: 'domino', domino_home_dir: '' },
      },
      { _ui_id: 8, name: 'networking', enabled: false, files: {}, vars: {} },
      { _ui_id: 9, name: 'acme.extra.role', files: {}, vars: {}, tags: 'late' },
    ];
    expect(roleRowsOf(rows, manifestRoles)).toEqual([
      {
        name: 'domino_install',
        enabled: true,
        collection: 'startcloud.hcl_roles',
        files: { installer: 'Domino_14.0_Linux_English.tar' },
        vars: { domino_user: 'domino' },
      },
      {
        name: 'networking',
        enabled: false,
        collection: 'startcloud.startcloud_roles',
        tags: ['always'],
        files: {},
        vars: {},
      },
      { name: 'acme.extra.role', enabled: true, tags: ['late'], files: {}, vars: {} },
    ]);
    const spec = buildSpec(
      formOf({
        roles: rows,
        manifestRoles,
        downloads: {
          'domino_install/installer': { task_id: 'c2', artifact_id: 'art-0102' },
          'domino_install/fixpack': { task_id: 'c3', artifact_id: 'art-0103' },
        },
      })
    );
    expect(spec.roles.map(role => role.name)).toEqual([
      'domino_install',
      'networking',
      'acme.extra.role',
    ]);
    expect(spec.roles[0]).not.toHaveProperty('_ui_id');
    expect(spec.wait_for).toEqual(['c2', 'c3']);
  });

  it('sends every role tag as a list, a manifest string one tag, a manifest list its strings, a blank or other value none', () => {
    expect(tagListOf('always')).toEqual(['always']);
    expect(tagListOf(' always ')).toEqual(['always']);
    expect(tagListOf(['a', '', 7, ' b '])).toEqual(['a', 'b']);
    expect(tagListOf('')).toEqual([]);
    expect(tagListOf(null)).toEqual([]);
    expect(tagListOf({ tag: 'x' })).toEqual([]);
    const roles = roleRowsOf(
      [
        { name: 'networking', enabled: true, files: {}, vars: {} },
        { name: 'quick_start', enabled: true, files: {}, vars: {}, tags: '' },
        { name: 'ssl', enabled: true, files: {}, vars: {}, tags: ['mine'] },
      ],
      [
        { name: 'networking', collection: 'startcloud.startcloud_roles', tags: 'always' },
        { name: 'quick_start', tags: ['always', 'docs'] },
        { name: 'ssl', tags: 'always' },
      ]
    );
    expect(roles.map(role => role.tags)).toEqual([['always'], ['always', 'docs'], ['mine']]);
  });

  it('builds the exact body of a provisioned VirtualBox create, every role tag a list and every member the type the agent decodes', () => {
    const manifestRoles = [
      { name: 'setup', collection: 'startcloud.startcloud_roles', default_enabled: true },
      {
        name: 'networking',
        collection: 'startcloud.startcloud_roles',
        tags: 'always',
        default_enabled: true,
      },
      { name: 'domino_install', collection: 'startcloud.hcl_roles', default_enabled: true },
    ];
    const spec = buildSpec(
      formOf({
        familyName: 'hcl_domino_standalone_provisioner',
        version: { version: '0.6.2' },
        versionKey: '0.6.2',
        settings: {
          ...emptySettings(),
          hostname: '4848654658',
          domain: 'startcloud.com',
          server_id: '5556',
          memory: '2G',
          box: 'STARTcloud/debian12-server',
          box_version: '2026.6.17',
          box_arch: 'amd64',
          setup_wait: '420',
        },
        diskConfig: { ...emptyDiskConfig(), bootVolumeName: 'boot', bootMount: '/' },
        zones: { guest_agent: true },
        tagsInput: 'domino, standalone',
        roles: [
          { _ui_id: 1, name: 'setup', enabled: true, files: {}, vars: {} },
          { _ui_id: 2, name: 'networking', enabled: true, files: {}, vars: {} },
          {
            _ui_id: 3,
            name: 'domino_install',
            enabled: true,
            files: {
              installer: 'Domino_14.5.1_Linux_English.tar',
              installer_hash: 'abc',
              installer_version: '14.5.1',
              fixpack: '',
            },
            vars: {},
          },
        ],
        manifestRoles,
        properties: { CERT_SELFSIGNED: true, EXTRA_PACKAGES: ['htop'], MAJOR: 14 },
        downloads: { 'domino_install/installer': { task_id: 't-1', artifact_id: 'a-1' } },
      })
    );
    expect(spec).toEqual({
      provisioner: { name: 'hcl_domino_standalone_provisioner', version: '0.6.2' },
      settings: {
        hostname: '4848654658',
        domain: 'startcloud.com',
        server_id: '5556',
        vcpus: 2,
        memory: '2G',
        box: 'STARTcloud/debian12-server',
        box_version: '2026.6.17',
        box_arch: 'amd64',
        setup_wait: 420,
      },
      disks: {
        boot: {
          type: 'template',
          sparse: true,
          volume_name: 'boot',
          clone_strategy: 'copy',
          mount: '/',
        },
      },
      vbox: { guest_agent: true },
      tags: ['domino', 'standalone'],
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
      roles: [
        {
          name: 'setup',
          enabled: true,
          collection: 'startcloud.startcloud_roles',
          files: {},
          vars: {},
        },
        {
          name: 'networking',
          enabled: true,
          collection: 'startcloud.startcloud_roles',
          tags: ['always'],
          files: {},
          vars: {},
        },
        {
          name: 'domino_install',
          enabled: true,
          collection: 'startcloud.hcl_roles',
          files: {
            installer: 'Domino_14.5.1_Linux_English.tar',
            installer_hash: 'abc',
            installer_version: '14.5.1',
          },
          vars: {},
        },
      ],
      properties: { CERT_SELFSIGNED: true, EXTRA_PACKAGES: ['htop'], MAJOR: 14 },
      sync_method: 'rsync',
      wait_for: ['t-1'],
      start_after_create: false,
      provision_after_create: false,
    });
    spec.roles.forEach(role => {
      expect(typeof role.name).toBe('string');
      expect(typeof role.enabled).toBe('boolean');
      Object.values(role.files).forEach(value => expect(typeof value).toBe('string'));
      if ('tags' in role) {
        expect(Array.isArray(role.tags)).toBe(true);
      }
    });
  });
});

describe('the networks of the Network step', () => {
  const status = {
    enabled: true,
    config: {
      enabled: true,
      subnet: '10.190.190.0/24',
      host_ip: '10.190.190.1',
      netmask: '255.255.255.0',
    },
  };

  it('fills the provisioning NIC from the host provisioning network, the address a suggestion of that subnet alone', () => {
    expect(provisioningNetworkOf(status, null)).toEqual({
      type: 'host',
      address: '',
      netmask: '255.255.255.0',
      gateway: '10.190.190.1',
      dhcp4: true,
      dhcp6: false,
      provisional: true,
      is_control: true,
      mac: 'auto',
    });
    expect(
      provisioningNetworkOf(status, {
        subnet: '10.190.190.0/24',
        suggestions: ['10.190.190.13'],
      })
    ).toMatchObject({ address: '10.190.190.13', dhcp4: false });
    expect(
      provisioningNetworkOf(status, { subnet: '192.168.1.0/24', suggestions: ['192.168.1.5'] })
        .address
    ).toBe('');
    expect(provisioningNetworkOf({ enabled: false }, null)).toBeNull();
    expect(provisioningNetworkOf(null, null)).toBeNull();
  });

  it('places the row after the external network, fills a host entry the list holds and adds nothing to a package list', () => {
    const row = provisioningNetworkOf(status, null);
    const external = defaultExternalNetwork();
    expect(withProvisioningNetwork([external], row).map(network => network.type)).toEqual([
      'external',
      'host',
    ]);
    const own = { type: 'host', address: '10.190.190.20', dhcp4: false, netmask: '' };
    expect(withProvisioningNetwork([external, own], row)[1]).toMatchObject({
      address: '10.190.190.20',
      dhcp4: false,
      netmask: '255.255.255.0',
      gateway: '10.190.190.1',
      provisional: true,
    });
    expect(fillProvisioningNetwork([external], row)).toEqual([external]);
    expect(withProvisioningNetwork([external], null)).toEqual([external]);
  });

  it('opens the external network on the default-route uplink, else the first, and never a host entry', () => {
    const rows = [{ name: 'eth1' }, { name: 'eth0' }];
    expect(defaultUplinkOf({ default: 'eth0' }, rows)).toBe('eth0');
    expect(defaultUplinkOf({ default: 'wlan9' }, rows)).toBe('eth1');
    expect(defaultUplinkOf(null, [])).toBe('');
    const host = { type: 'host', bridge: '' };
    expect(withDefaultUplink([host, defaultExternalNetwork()], 'eth0')).toEqual([
      host,
      { ...defaultExternalNetwork(), bridge: 'eth0' },
    ]);
    const bridged = { ...defaultExternalNetwork(), bridge: 'igb0' };
    expect(withDefaultUplink([bridged], 'eth0')).toEqual([bridged]);
  });

  it('draws exactly the networks a package lists, a host entry filled from the provisioning row', () => {
    const filled = prefilledFrom(
      {
        ...PACKAGE_DEFAULTS,
        networks: [
          { type: 'external', dhcp4: true },
          { type: 'host', address: '10.190.190.9' },
        ],
      },
      formOf({ provisioningRow: provisioningNetworkOf(status, null) })
    );
    expect(filled.networks.map(network => network.type)).toEqual(['external', 'host']);
    expect(filled.networks[1]).toMatchObject({
      address: '10.190.190.9',
      gateway: '10.190.190.1',
      is_control: true,
    });
    const plain = prefilledFrom(
      PACKAGE_DEFAULTS,
      formOf({ provisioningRow: provisioningNetworkOf(status, null) })
    );
    expect(plain.networks.map(network => network.type)).toEqual(['external']);
  });
});

describe('the name a provisioner fills', () => {
  it('fills the hostname while the form holds none and names the package domain for the chain', () => {
    const empty = formOf({ settings: { ...emptySettings() } });
    const filled = prefilledFrom(
      { ...PACKAGE_DEFAULTS, settings: { hostname: 'domino', domain: 'pkg.example.com' } },
      empty
    );
    expect(filled.settings.hostname).toBe('domino');
    expect(filled.nameText).toBe('domino');
    expect(filled.fromPackage.has('settings.hostname')).toBe(true);
    expect(filled.packageDomain).toBe('pkg.example.com');
    const kept = prefilledFrom(
      { ...PACKAGE_DEFAULTS, settings: { hostname: 'domino' } },
      formOf({ typed: new Set(['settings.hostname']) })
    );
    expect(kept.settings.hostname).toBe('web-3');
    expect(kept).not.toHaveProperty('nameText');
  });

  it('lists the provisioner domain last in the chain and takes it only while every other source is empty', () => {
    const defaults = {
      settings: { domain: 'startcloud.com', domain_choices: [{ source: 'user', domain: 'u.x' }] },
    };
    expect(domainChoicesOf(defaults, 'pref.x', 'pkg.x')).toEqual([
      { source: 'preference', domain: 'pref.x' },
      { source: 'user', domain: 'u.x' },
      { source: 'agent', domain: 'startcloud.com' },
      { source: 'provisioner', domain: 'pkg.x' },
    ]);
    expect(defaultDomainOf({ choices: domainChoicesOf(defaults, '', 'pkg.x') })).toBe('u.x');
    expect(defaultDomainOf({ choices: domainChoicesOf({ settings: {} }, '', 'pkg.x') })).toBe(
      'pkg.x'
    );
  });
});

describe('the version a provisioner pick lands on', () => {
  it('orders versions by semantic version, numbers as numbers, a prerelease below its release', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
    expect(compareVersions('0.6.2', '0.6.2')).toBe(0);
    expect(compareVersions('0.6.2-rc.1', '0.6.2')).toBe(-1);
    expect(compareVersions('0.6.2-rc.2', '0.6.2-rc.10')).toBe(-1);
    expect(compareVersions('1.0.0-alpha', '1.0.0-1')).toBe(1);
    expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
    expect(compareVersions('v1.2.0', '1.2.0+build.7')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });

  it('answers the highest version, not the first and not the highest by text', () => {
    expect(highestVersionOf(['0.1.26', '0.1.27'])).toBe('0.1.27');
    expect(highestVersionOf(['0.9.9', '0.10.0', '0.6.2-rc.1', '0.6.2'])).toBe('0.10.0');
    expect(highestVersionOf(['2.0.0-rc.1', '1.9.0'])).toBe('2.0.0-rc.1');
    expect(highestVersionOf(['1.0.0-rc.1', '1.0.0'])).toBe('1.0.0');
    expect(highestVersionOf(['', '0.3.0'])).toBe('0.3.0');
    expect(highestVersionOf([])).toBe('');
    expect(highestVersionOf(null)).toBe('');
  });
});

describe('stepProblemOf', () => {
  it('names the sentence a step refuses on and none for a step that can be left', () => {
    expect(stepProblemOf('general', formOf({ settings: { hostname: '', domain: 'd' } }))).toBe(
      'machineEdit.machineCreateModal.hostnameDomainRequired'
    );
    expect(stepProblemOf('general', formOf())).toBe('');
    expect(stepProblemOf('os-disks', formOf({ machineHypervisor: 'utm' }))).toBe(
      'machineEdit.machineCreateModal.utmRequiresTemplateBox'
    );
    expect(
      stepProblemOf(
        'os-disks',
        formOf({ machineHypervisor: 'utm', settings: { ...emptySettings(), box: 'a/b' } })
      )
    ).toBe('');
    expect(stepProblemOf('system', formOf({ vboxJson: '{' }))).toBe(
      'machineEdit.machineCreateModal.vboxJsonInvalid'
    );
    expect(stepProblemOf('os-disks', formOf({ bootSource: 'scratch' }))).toBe(
      'machineEdit.machineCreateModal.blankBootNeedsSize'
    );
    expect(stepProblemOf('os-disks', formOf({ bootSource: 'existing' }))).toBe(
      'machineEdit.machineCreateModal.existingBootNeedsPath'
    );
    expect(stepProblemOf('provisioning', formOf({ familyName: 'startcloud' }))).toBe(
      'machineEdit.machineCreateModal.selectVersionOrNone'
    );
    CREATE_STEPS.forEach(step => expect(stepProblemOf(step, formOf())).toBe(''));
  });
});

describe('the steps drawn and the pills', () => {
  it('names the eight steps and leaves Provisioning out while Use a provisioner is off', () => {
    expect(CREATE_STEPS).toEqual([
      'general',
      'os-disks',
      'system',
      'cpu',
      'memory',
      'network',
      'provisioning',
      'confirm',
    ]);
    expect(stepsFor(formOf())).toEqual([
      'general',
      'os-disks',
      'system',
      'cpu',
      'memory',
      'network',
      'confirm',
    ]);
    expect(stepsFor(formOf({ useProvisioner: true }))).toEqual(CREATE_STEPS);
  });

  it('opens a pill while every drawn step before it is clean', () => {
    const clean = formOf({ useProvisioner: true });
    const problemOf = form => step => stepProblemOf(step, form);
    expect(stepOpen(clean, 'general', problemOf(clean))).toBe(true);
    expect(stepOpen(clean, 'confirm', problemOf(clean))).toBe(true);
    const blankName = formOf({ settings: { ...emptySettings(), hostname: '', domain: '' } });
    expect(stepOpen(blankName, 'general', problemOf(blankName))).toBe(true);
    expect(stepOpen(blankName, 'os-disks', problemOf(blankName))).toBe(false);
    expect(stepOpen(blankName, 'confirm', problemOf(blankName))).toBe(false);
    const blankBoot = formOf({ bootSource: 'scratch' });
    expect(stepOpen(blankBoot, 'os-disks', problemOf(blankBoot))).toBe(true);
    expect(stepOpen(blankBoot, 'system', problemOf(blankBoot))).toBe(false);
    expect(stepOpen(blankBoot, 'provisioning', problemOf(blankBoot))).toBe(false);
    const dslRefused = formOf({ useProvisioner: true });
    expect(
      stepOpen(dslRefused, 'confirm', step => (step === 'provisioning' ? 'fix the fields' : ''))
    ).toBe(false);
    expect(
      stepOpen(dslRefused, 'provisioning', step => (step === 'provisioning' ? 'fix' : ''))
    ).toBe(true);
  });
});

describe('the one Name', () => {
  it('splits a dotted name at its first dot, gives a bare name the default domain and empties on nothing', () => {
    expect(nameParts('web-3.example.com', 'startcloud.com')).toEqual({
      hostname: 'web-3',
      domain: 'example.com',
    });
    expect(nameParts('a.b.c', '')).toEqual({ hostname: 'a', domain: 'b.c' });
    expect(nameParts('zeus-01', 'startcloud.com')).toEqual({
      hostname: 'zeus-01',
      domain: 'startcloud.com',
    });
    expect(nameParts(' zeus-01 ', '')).toEqual({ hostname: 'zeus-01', domain: '' });
    expect(nameParts('', 'startcloud.com')).toEqual({ hostname: '', domain: '' });
  });
});

describe('the default domain', () => {
  const defaults = {
    settings: {
      domain: 'startcloud.com',
      domain_choices: [
        { source: 'agent', domain: 'startcloud.com' },
        { source: 'user', domain: 'lab.example.com' },
        { source: 'organization', domain: ' org.example.com ' },
        { source: 'user', domain: 'second.example.com' },
        { source: 'other', domain: 'x.example.com' },
        { source: 'agent', domain: '' },
        'nope',
      ],
    },
  };

  it('lists one row a source in the order of the chain, the preference first and the agent row from settings.domain while the list names none', () => {
    expect(domainChoicesOf(defaults, ' pref.example.com ')).toEqual([
      { source: 'preference', domain: 'pref.example.com' },
      { source: 'user', domain: 'lab.example.com' },
      { source: 'organization', domain: 'org.example.com' },
      { source: 'agent', domain: 'startcloud.com' },
    ]);
    expect(domainChoicesOf(defaults)).toEqual([
      { source: 'user', domain: 'lab.example.com' },
      { source: 'organization', domain: 'org.example.com' },
      { source: 'agent', domain: 'startcloud.com' },
    ]);
    expect(domainChoicesOf({ settings: { domain: 'startcloud.com' } })).toEqual([
      { source: 'agent', domain: 'startcloud.com' },
    ]);
    expect(
      domainChoicesOf({
        settings: {
          domain: 'startcloud.com',
          domain_choices: [{ source: 'agent', domain: 'a.b' }],
        },
      })
    ).toEqual([{ source: 'agent', domain: 'a.b' }]);
    expect(domainChoicesOf({ settings: { domain: '' } })).toEqual([]);
    expect(domainChoicesOf(null)).toEqual([]);
  });

  it('resolves the first non-empty of the preference, the user row, the organization row, the agent row and the agent domain', () => {
    const choices = domainChoicesOf(defaults);
    expect(defaultDomainOf({ preference: 'pref.example.com', choices })).toBe('pref.example.com');
    expect(defaultDomainOf({ choices })).toBe('lab.example.com');
    expect(defaultDomainOf({ choices: choices.filter(row => row.source !== 'user') })).toBe(
      'org.example.com'
    );
    expect(defaultDomainOf({ choices: [{ source: 'agent', domain: 'a.b' }] })).toBe('a.b');
    expect(defaultDomainOf({ choices: [], agentDomain: 'startcloud.com' })).toBe('startcloud.com');
    expect(defaultDomainOf({})).toBe('');
    expect(defaultDomainOf({ preference: '  ', choices: [], agentDomain: '' })).toBe('');
  });

  it('routes to the machines configuration where the host has one and nowhere otherwise', () => {
    const configured = { capabilities: { config: ['app', 'machines'] } };
    expect(domainConfigRouteOf({ aggregated: true, status: {}, server: configured, id: '1' })).toBe(
      '/hosts/1/agent/config/machines'
    );
    expect(domainConfigRouteOf({ aggregated: true, status: {}, server: vbox, id: '1' })).toBeNull();
    expect(domainConfigRouteOf({ aggregated: true, status: {}, server: null, id: '1' })).toBeNull();
    expect(
      domainConfigRouteOf({
        aggregated: false,
        status: { config: ['machines'] },
        server: null,
        id: 'self',
      })
    ).toBe('/admin/config/machines');
    expect(
      domainConfigRouteOf({
        aggregated: false,
        status: { config: [] },
        server: configured,
        id: 'self',
      })
    ).toBeNull();
    expect(
      domainConfigRouteOf({ aggregated: false, status: null, server: null, id: 'self' })
    ).toBeNull();
  });
});

describe('the package defaults', () => {
  it('reads metadata.defaults shape-checked and answers null without one', () => {
    expect(packageDefaultsOf({ metadata: { defaults: PACKAGE_DEFAULTS } })).toEqual(
      PACKAGE_DEFAULTS
    );
    expect(packageDefaultsOf({ metadata: { defaults: { settings: { box: 'a/b' } } } })).toEqual({
      settings: { box: 'a/b' },
      disks: {},
      networks: [],
      tags: [],
      guest_agent: false,
    });
    expect(
      packageDefaultsOf({
        metadata: {
          defaults: { networks: 'x', disks: [], tags: ['a', 7, ''], guest_agent: 'yes' },
        },
      })
    ).toEqual({
      settings: {},
      disks: {},
      networks: [],
      tags: ['a'],
      guest_agent: false,
    });
    expect(packageDefaultsOf({ metadata: { configuration: {} } })).toBeNull();
    expect(packageDefaultsOf({ metadata: { defaults: 'nope' } })).toBeNull();
    expect(packageDefaultsOf(null)).toBeNull();
  });

  it('fills the settings, the boot disk, the additional disks and the networks and names every path filled', () => {
    const filled = prefilledFrom(PACKAGE_DEFAULTS, formOf());
    expect(filled.settings).toMatchObject({
      hostname: 'web-3',
      box: 'STARTcloud/debian12-server',
      box_url: 'https://boxvault.startcloud.com',
      box_version: '2025.4.30',
      box_arch: 'amd64',
      os_type: 'Debian_64',
      firmware_type: 'UEFI',
      vcpus: 2,
      memory: '8G',
      setup_wait: '420',
      vagrant_user: 'startcloud',
    });
    expect(filled.bootSource).toBe('template');
    expect(filled.diskConfig).toMatchObject({
      bootVolumeName: 'boot',
      bootMount: '/',
      bootSize: '',
      bootSparse: true,
    });
    expect(filled.diskConfig.additional).toEqual([
      {
        key: 'package-0',
        mode: 'new',
        size: '50G',
        path: '',
        volume_name: 'disk1',
        pool: '',
        dataset: '',
        directory: '',
        sparse: true,
        mount: '/local',
        filesystem: 'xfs',
      },
    ]);
    expect(filled.networks).toEqual([
      { ...defaultExternalNetwork(), type: 'external', dhcp4: true },
    ]);
    expect(filled.tagsInput).toBe('domino, lab');
    expect(filled.zones).toEqual({ guest_agent: true });
    expect([...filled.fromPackage].sort()).toEqual(
      [
        'settings.box',
        'settings.box_url',
        'settings.box_version',
        'settings.box_arch',
        'settings.os_type',
        'settings.firmware_type',
        'settings.vcpus',
        'settings.memory',
        'settings.setup_wait',
        'settings.vagrant_user',
        'disks.boot.volume_name',
        'disks.boot.mount',
        'disks.additional.0',
        'networks.0',
        'tags',
        'zones.guest_agent',
      ].sort()
    );
  });

  it('keeps typed tags and a set guest agent switch and fills neither when the package leaves them out', () => {
    const kept = prefilledFrom(
      PACKAGE_DEFAULTS,
      formOf({ typed: new Set(['tags']), tagsInput: 'mine', zones: { guest_agent: false } })
    );
    expect(kept).not.toHaveProperty('tagsInput');
    expect(kept.fromPackage.has('tags')).toBe(false);
    expect(kept).not.toHaveProperty('zones');
    const plain = prefilledFrom({ ...PACKAGE_DEFAULTS, tags: [], guest_agent: false }, formOf());
    expect(plain).not.toHaveProperty('tagsInput');
    expect(plain).not.toHaveProperty('zones');
  });

  it('never overwrites a typed value and leaves the untyped members alone when the package says nothing', () => {
    const typed = new Set(['settings.memory', 'settings.box', 'disks.boot.mount', 'networks']);
    const own = [
      { type: 'host', bridge: 'eth1', dhcp4: false, dhcp6: false, mac: 'auto', dns: [] },
    ];
    const filled = prefilledFrom(
      PACKAGE_DEFAULTS,
      formOf({
        typed,
        settings: { ...emptySettings(), memory: '4G', box: 'acme/win' },
        networks: own,
        diskConfig: { ...emptyDiskConfig(), bootMount: '/srv' },
      })
    );
    expect(filled.settings.memory).toBe('4G');
    expect(filled.settings.box).toBe('acme/win');
    expect(filled.settings.vcpus).toBe(2);
    expect(filled.diskConfig.bootMount).toBe('/srv');
    expect(filled.diskConfig.bootVolumeName).toBe('boot');
    expect(filled).not.toHaveProperty('networks');
    expect(filled).not.toHaveProperty('bootSource');
    expect(filled.fromPackage.has('settings.memory')).toBe(false);
    expect(filled.fromPackage.has('settings.box')).toBe(false);
    expect(filled.fromPackage.has('disks.boot.mount')).toBe(false);
    expect(filled.fromPackage.has('networks.0')).toBe(false);
    expect(filled.fromPackage.has('settings.vcpus')).toBe(true);
    const sparse = prefilledFrom(
      { settings: {}, disks: {}, networks: [], tags: [], guest_agent: false },
      formOf()
    );
    expect(sparse.settings).toEqual(formOf().settings);
    expect(sparse.diskConfig).toEqual(emptyDiskConfig());
    expect(sparse.fromPackage.size).toBe(0);
    expect(sparse).not.toHaveProperty('networks');
  });
});

describe('the answers', () => {
  it('reads a queued create, the downloads it waited on, and a multi-host create', () => {
    expect(
      createdOf(
        { parent_task_id: 'p1', machine_name: 'm1', requires_download: true, waited_on: ['d1'] },
        'fallback'
      )
    ).toEqual({ machineName: 'm1', taskId: 'p1', requiresDownload: true, waitedOn: 1, names: [] });
    expect(createdOf({ task_id: 't1' }, 'fallback')).toEqual({
      machineName: 'fallback',
      taskId: 't1',
      requiresDownload: false,
      waitedOn: 0,
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
    ).toEqual({
      machineName: 'a',
      taskId: 'pa',
      requiresDownload: false,
      waitedOn: 0,
      names: ['a', 'b'],
    });
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
          disk_size: '128G',
        },
      ],
      [
        {
          organization: 'startcloud',
          box_name: 'debian13',
          version: '13.0.0',
          architecture: 'arm64',
          disk_size: '64G',
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
      disk_size: '64G',
    });
    expect(rows[1]).toMatchObject({
      local: true,
      isDefaultSource: true,
      source: '',
      disk_size: '',
    });
    expect(rows[0]).toMatchObject({ local: false, disk_size: '128G' });
  });

  it('names the disk size of the picked box, the template of its version first, any template of the box next, the catalog row last', () => {
    const remote = [
      {
        value: 'startcloud/debian13',
        versions: ['13.1.0'],
        architectures: [],
        source: 'boxvault',
        disk_size: '32G',
      },
      {
        value: 'acme/win',
        versions: ['1'],
        architectures: [],
        source: 'mirror',
        disk_size: '128G',
      },
    ];
    const templates = [
      { organization: 'startcloud', box_name: 'debian13', version: '13.1.0', disk_size: '64G' },
      { organization: 'startcloud', box_name: 'debian13', version: '13.0.0', disk_size: '48G' },
    ];
    expect(
      boxDiskSizeOf(remote, templates, { box: 'startcloud/debian13', box_version: '13.0.0' })
    ).toBe('48G');
    expect(boxDiskSizeOf(remote, templates, { box: 'startcloud/debian13', box_version: '' })).toBe(
      '64G'
    );
    expect(boxDiskSizeOf(remote, templates, { box: 'startcloud/debian13', box_version: '9' })).toBe(
      '64G'
    );
    expect(boxDiskSizeOf(remote, templates, { box: 'acme/win', box_version: '' })).toBe('128G');
    expect(boxDiskSizeOf(remote, templates, { box: 'nobody/none', box_version: '' })).toBe('');
    expect(boxDiskSizeOf(remote, templates, { box: '', box_version: '' })).toBe('');
  });
});
