import { describe, expect, it } from 'vitest';

import {
  artifactIdsOf,
  hostFileGroupsOf,
  hostFileOf,
  hostFilesOf,
  matchesHostFile,
} from '../../src/features/hosts/utils/hostFiles.js';

const t = key => `t:${key}`;

const registryRow = {
  id: 14,
  filename: 'Domino_14.5_FP1_Linux.tar',
  file_type: 'fixpack',
  size: 734003200,
  checksum: 'c1',
  checksum_verified: null,
  expected_sha256: 'e1',
  file_exists: false,
  role: 'domino_fixpack',
  source: 'boxvault',
  version: {
    major: '14',
    minor: '5',
    patch: '0',
    fix_pack: 'FP1',
    ea_access_release: '',
    full_version: '14.5.0FP1',
  },
  storage_location_id: 'loc-installers',
  storage_location: { id: 'loc-installers', name: 'HCL installers', type: 'installer' },
  registry: {
    source_name: 'boxvault',
    organization: 'STARTcloud',
    download: 'domino',
    release: '14.5',
    patch: 'FP1',
    key: 'linux-x64',
    kind: 'fixpack',
    platform: 'linux',
    architecture: 'x64',
    language: 'any',
    variant: '',
    sha256: 'e1',
  },
};

const isoRow = {
  id: 11,
  filename: 'debian-13.1.0-amd64-netinst.iso',
  file_type: 'iso',
  size: 702545920,
  checksum: 'c2',
  checksum_verified: true,
  file_exists: true,
  role: null,
  version: null,
  storage_location: { id: 'loc-iso', name: 'ISO library', type: 'iso' },
  registry: null,
};

const roleRow = {
  ...isoRow,
  id: 13,
  filename: 'Domino_14.5_Linux_English.tar',
  file_type: 'installer',
  role: 'domino_install',
  version: '14.5',
  checksum: null,
  checksum_verified: null,
};

describe('hostFileOf', () => {
  it('draws a registry row by its registry address, the expected sha256 first, its organization only as the vendor', () => {
    const item = hostFileOf(registryRow);
    expect(item.organization).toEqual({ name: '', logo: '' });
    expect(item).toMatchObject({
      id: '14',
      name: 'Domino_14.5_FP1_Linux.tar',
      vendor: 'STARTcloud',
      product: 'domino',
      family: 'domino',
      release: '14.5',
      patch: 'FP1',
      kind: 'fixpack',
      platform: 'linux',
      architecture: 'x64',
      language: 'any',
      checksum: 'e1',
      checksumType: 'sha256',
      version: '14.5.0FP1',
      role: 'domino_fixpack',
      location: 'HCL installers',
      locationId: 'loc-installers',
      fileExists: false,
      source: 'boxvault',
      status: 'missing',
      statusTone: 'secondary',
    });
    expect(item.artifact).toBe(registryRow);
  });

  it('draws an ISO row by its own members, no product and no version', () => {
    const item = hostFileOf(isoRow);
    expect(item).toMatchObject({
      id: '11',
      organization: { name: '', logo: '' },
      vendor: '',
      product: '',
      kind: 'iso',
      checksum: 'c2',
      version: '',
      location: 'ISO library',
      locationId: 'loc-iso',
      fileExists: true,
      status: 'verified',
      statusTone: 'success',
    });
  });

  it('takes the role as the product while the row names no registry', () => {
    const item = hostFileOf(roleRow);
    expect(item.product).toBe('domino_install');
    expect(item.version).toBe('14.5');
    expect(item.checksum).toBe('');
    expect(item.checksumType).toBe('');
    expect(item.status).toBe('unhashed');
  });
});

describe('hostFilesOf', () => {
  it('drops the rows without an id and keeps the order answered', () => {
    expect(
      hostFilesOf([isoRow, { filename: 'x' }, null, registryRow]).map(item => item.id)
    ).toEqual(['11', '14']);
    expect(hostFilesOf(null)).toEqual([]);
  });
});

describe('matchesHostFile', () => {
  it('matches the name, the product, the version, the location and the vendor', () => {
    const item = hostFileOf(registryRow);
    expect(matchesHostFile(item, 'fp1_linux')).toBe(true);
    expect(matchesHostFile(item, 'domino')).toBe(true);
    expect(matchesHostFile(item, '14.5.0fp1')).toBe(true);
    expect(matchesHostFile(item, 'hcl installers')).toBe(true);
    expect(matchesHostFile(item, 'startcloud')).toBe(true);
    expect(matchesHostFile(item, 'windows')).toBe(false);
  });
});

describe('hostFileGroupsOf', () => {
  it('groups by the product in the order first carried, the rest last under Other', () => {
    const items = hostFilesOf([isoRow, registryRow, roleRow]);
    const groups = hostFileGroupsOf(items, t, 'family');
    expect(groups.map(group => group.label)).toEqual([
      'domino',
      'domino_install',
      't:pages.group.other',
    ]);
    expect(groups[2].items.map(item => item.id)).toEqual(['11']);
    expect(groups.every(group => group.key.startsWith('host-files:family:'))).toBe(true);
  });

  it('groups by the organization and draws no Other while every item carries one', () => {
    const groups = hostFileGroupsOf(hostFilesOf([registryRow]), t, 'vendor');
    expect(groups.map(group => group.label)).toEqual(['STARTcloud']);
  });
});

describe('one organization for every row', () => {
  it('carries the same empty organization on a registry row, a role row and an ISO row', () => {
    const names = hostFilesOf([isoRow, registryRow, roleRow]).map(item => item.organization.name);
    expect(new Set(names)).toEqual(new Set(['']));
  });
});

describe('artifactIdsOf', () => {
  it('answers the artifact ids of the picked names', () => {
    const items = hostFilesOf([isoRow, registryRow, roleRow]);
    expect(
      artifactIdsOf(items, ['Domino_14.5_FP1_Linux.tar', 'debian-13.1.0-amd64-netinst.iso'])
    ).toEqual([11, 14]);
    expect(artifactIdsOf(items, [])).toEqual([]);
  });
});
