import { describe, expect, it } from 'vitest';

import {
  firstArchitectureOf,
  flattenBoxCatalog,
  pickDefaultSource,
  remoteBoxItemsOf,
  sourceDisplayNameOf,
  sourceKeyOf,
  sourceLabelOf,
} from '../../src/features/hosts/utils/boxCatalog.js';

const box = {
  name: 'debian13',
  organization: {
    id: 1,
    name: 'startcloud',
    email_hash: 'abc',
    logo: '/brand/startcloud/mark.svg',
  },
  versions: [
    {
      version_number: '13.1.0',
      created_at: '2026-09-20T09:00:00.000Z',
      providers: [{ name: 'virtualbox', architectures: [{ name: 'amd64' }, { name: 'arm64' }] }],
    },
    {
      version_number: '13.0.0',
      created_at: '2026-08-01T09:00:00.000Z',
      providers: [{ name: 'virtualbox', architectures: [{ name: 'amd64' }] }],
    },
  ],
};

describe('flattenBoxCatalog', () => {
  it('reads the bare array BoxVault answers into picker rows', () => {
    expect(flattenBoxCatalog([box])).toEqual([
      {
        value: 'startcloud/debian13',
        organization: 'startcloud',
        boxName: 'debian13',
        versions: ['13.1.0', '13.0.0'],
        architectures: ['amd64', 'arm64'],
      },
    ]);
  });

  it('reads the list under boxes or data and skips an entry without a name', () => {
    expect(flattenBoxCatalog({ boxes: [box, { versions: [] }] })).toHaveLength(1);
    expect(flattenBoxCatalog({ data: [box] })).toHaveLength(1);
    expect(flattenBoxCatalog({ data: 'nothing' })).toEqual([]);
    expect(flattenBoxCatalog(null)).toEqual([]);
  });

  it('reads the organization from whichever member names it', () => {
    expect(flattenBoxCatalog([{ name: 'a', organization: { name: 'acme' } }])[0].value).toBe(
      'acme/a'
    );
    expect(flattenBoxCatalog([{ name: 'a', organization: 'acme' }])[0].value).toBe('acme/a');
    expect(flattenBoxCatalog([{ name: 'a', user: { username: 'mark' } }])[0].value).toBe('mark/a');
    expect(flattenBoxCatalog([{ name: 'a' }])[0]).toMatchObject({ value: 'a', organization: '' });
  });

  it('reads versions spelled as BoxVault answers them, version_number, and as strings, versionNumber, version or name', () => {
    const rows = flattenBoxCatalog([
      {
        name: 'a',
        versions: [
          '1',
          { version: '2' },
          { name: '3' },
          { versionNumber: '4' },
          { version_number: '5' },
          {},
        ],
      },
    ]);
    expect(rows[0].versions).toEqual(['1', '2', '3', '4', '5']);
    expect(rows[0].architectures).toEqual([]);
  });
});

describe('remoteBoxItemsOf', () => {
  it('reads a relayed box into the item shape with its versions by version_number, their providers and architectures, and its organization with the logo resolved against the registry', () => {
    const [item] = remoteBoxItemsOf(
      [{ ...box, description: 'Debian 13', is_public: true }],
      'https://boxvault.example.com'
    );
    expect(item).toMatchObject({
      id: 'startcloud/debian13',
      organization: {
        name: 'startcloud',
        logo: 'https://boxvault.example.com/brand/startcloud/mark.svg',
        emailHash: 'abc',
      },
      name: 'debian13',
      label: 'debian13',
      description: 'Debian 13',
      isPublic: true,
      published: null,
      downloads: null,
      os: null,
      latestReleaseAt: '2026-09-20T09:00:00.000Z',
    });
    expect(item.versions.map(version => version.version)).toEqual(['13.1.0', '13.0.0']);
    expect(item.versions[0].createdAt).toBe('2026-09-20T09:00:00.000Z');
    expect(item.versions[0].providers[0].architectures.map(entry => entry.name)).toEqual([
      'amd64',
      'arm64',
    ]);
    expect(firstArchitectureOf(item, '13.1.0')).toBe('amd64');
    expect(firstArchitectureOf(item, '9')).toBe('');
  });

  it('keeps an absolute logo, answers none for a box without one and a box without a version with no versions', () => {
    const absolute = { ...box, organization: { name: 'acme', logo: 'https://cdn.example/a.png' } };
    expect(remoteBoxItemsOf([absolute])[0].organization).toEqual({
      name: 'acme',
      logo: 'https://cdn.example/a.png',
      emailHash: '',
    });
    expect(remoteBoxItemsOf([{ name: 'a', organization: 'acme' }])[0].organization).toEqual({
      name: 'acme',
      logo: '',
      emailHash: '',
    });
    expect(remoteBoxItemsOf([{ ...box, versions: [] }])[0].versions).toEqual([]);
  });

  it('skips an entry without a name and reads the list under boxes or data', () => {
    expect(remoteBoxItemsOf({ boxes: [box, { versions: [] }] })).toHaveLength(1);
    expect(remoteBoxItemsOf({ data: [box] })).toHaveLength(1);
    expect(remoteBoxItemsOf(null)).toEqual([]);
    expect(remoteBoxItemsOf([{ name: 'a' }])[0].isPublic).toBeNull();
  });
});

describe('pickDefaultSource', () => {
  it('answers the source marked default, else the first, else null', () => {
    expect(pickDefaultSource([{ name: 'a' }, { name: 'b', default: true }])).toEqual({
      name: 'b',
      default: true,
    });
    expect(pickDefaultSource([{ name: 'a' }, { name: 'b' }])).toEqual({ name: 'a' });
    expect(pickDefaultSource([])).toBeNull();
    expect(pickDefaultSource(undefined)).toBeNull();
  });
});

describe('a template source row', () => {
  const agent = { id: 'boxvault', name: 'BoxVault', url: 'https://b', default: true };
  const zone = { name: 'boxvault', url: 'https://b', default: true };

  it('is keyed by the id hyperweaver-agent answers and drawn by its name', () => {
    expect(sourceKeyOf(agent)).toBe('boxvault');
    expect(sourceLabelOf(agent)).toBe('BoxVault');
    expect(sourceDisplayNameOf(agent)).toBe('BoxVault');
    expect(sourceLabelOf({ id: 'bare' })).toBe('bare');
  });

  it('is keyed by its own name on an agent whose rows carry no id', () => {
    expect(sourceKeyOf(zone)).toBe('boxvault');
    expect(sourceLabelOf(zone)).toBe('boxvault');
    expect(sourceLabelOf({ ...zone, display_name: 'Box Vault' })).toBe('Box Vault');
    expect(sourceDisplayNameOf(zone)).toBe('');
    expect(sourceKeyOf(null)).toBe('');
    expect(sourceKeyOf(pickDefaultSource([]))).toBe('');
  });
});
