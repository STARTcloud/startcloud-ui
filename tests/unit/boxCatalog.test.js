import { describe, expect, it } from 'vitest';

import { flattenBoxCatalog, pickDefaultSource } from '../../src/features/hosts/utils/boxCatalog.js';

const box = {
  name: 'debian13',
  user: { username: 'mark', primaryOrganization: { name: 'startcloud' } },
  versions: [
    {
      versionNumber: '13.1.0',
      providers: [{ name: 'virtualbox', architectures: [{ name: 'amd64' }, { name: 'arm64' }] }],
    },
    {
      versionNumber: '13.0.0',
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

  it('reads versions spelled as strings, versionNumber, version or name', () => {
    const rows = flattenBoxCatalog([
      { name: 'a', versions: ['1', { version: '2' }, { name: '3' }, { versionNumber: '4' }, {}] },
    ]);
    expect(rows[0].versions).toEqual(['1', '2', '3', '4']);
    expect(rows[0].architectures).toEqual([]);
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
