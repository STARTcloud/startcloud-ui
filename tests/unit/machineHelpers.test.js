import { describe, expect, it } from 'vitest';

import {
  agentDefaultLabel,
  cdromEntry,
  filesystemEntries,
  flattenBridgedInterfaces,
  isoFilenames,
  machineStatusVariant,
  parseConfiguration,
  withAddressing,
  zfsDatasetOptions,
  zfsPoolOptions,
} from '../../src/features/hosts/utils/machineHelpers.js';

describe('withAddressing and cdromEntry', () => {
  it('adds the controller and the port a row names and reads an ISO or a path', () => {
    expect(withAddressing({ type: 'blank' }, { controller: ' SATA ', port: '2' })).toEqual({
      type: 'blank',
      controller: 'SATA',
      port: 2,
    });
    expect(withAddressing({ type: 'blank' }, { controller: '', port: '' })).toEqual({
      type: 'blank',
    });
    expect(cdromEntry({ source: 'iso', iso: ' a.iso ', path: '/x' })).toEqual({ iso: 'a.iso' });
    expect(cdromEntry({ source: 'path', iso: 'a.iso', path: ' /x ' })).toEqual({ path: '/x' });
    expect(cdromEntry({ source: 'path', iso: '', path: ' ' })).toBeFalsy();
  });
});

describe('filesystemEntries', () => {
  it('keeps the rows with a host directory and a mount point', () => {
    expect(
      filesystemEntries([
        { special: '/data', dir: '/mnt/data', type: 'lofs', options: '' },
        { special: '', dir: '/mnt/x', type: '', options: '' },
        { special: '/x', dir: '/mnt/y', type: '', options: 'ro' },
      ])
    ).toEqual([
      { special: '/data', dir: '/mnt/data', type: 'lofs' },
      { special: '/x', dir: '/mnt/y', options: 'ro' },
    ]);
    expect(filesystemEntries(undefined)).toEqual([]);
  });
});

describe('flattenBridgedInterfaces', () => {
  it('keeps the physical, aggregated and etherstub links that are not down', () => {
    expect(
      flattenBridgedInterfaces({
        interfaces: [
          { name: 'igb0', class: 'phys', status: 'UP' },
          { name: 'aggr0', class: 'aggr', provisioning: true },
          { name: 'vnic0', class: 'vnic' },
          { name: 'igb1', class: 'phys', status: 'down' },
          'eth9',
        ],
      }).map(entry => [entry.name, entry.class, entry.provisioning, entry.status])
    ).toEqual([
      ['igb0', 'phys', false, 'up'],
      ['aggr0', 'aggr', true, ''],
      ['eth9', '', false, ''],
    ]);
    expect(flattenBridgedInterfaces(null)).toEqual([]);
  });
});

describe('isoFilenames and parseConfiguration', () => {
  it('lists the cached ISOs whose file exists and parses a configuration answered as text', () => {
    expect(
      isoFilenames({
        artifacts: [{ filename: 'a.iso' }, { filename: 'b.iso', file_exists: false }],
      })
    ).toEqual(['a.iso']);
    expect(isoFilenames([{ filename: 'c.iso' }])).toEqual(['c.iso']);
    expect(parseConfiguration({ configuration: '{"ram":"4G"}' })).toEqual({ ram: '4G' });
    expect(parseConfiguration({ configuration: '{' })).toEqual({});
    expect(parseConfiguration(null)).toEqual({});
  });
});

describe('agentDefaultLabel and machineStatusVariant', () => {
  it('reads the default of a knob from the defaults document, n/a while it names none', () => {
    const doc = {
      knob_defaults: { 'zones.diskif': 'virtio', vcpus: 2 },
      settings: { memory: '2G' },
    };
    expect(agentDefaultLabel(doc, 'diskif')).toBe('virtio');
    expect(agentDefaultLabel(doc, 'memory')).toBe('2G');
    expect(agentDefaultLabel(doc, 'rng')).toBe('n/a');
    expect(agentDefaultLabel(null, 'rng')).toBe('n/a');
    expect(machineStatusVariant('Running')).toBe('success');
    expect(machineStatusVariant('odd')).toBe('secondary');
  });
});

describe('zfs options', () => {
  it('labels a pool with its free space and a health other than online', () => {
    expect(
      zfsPoolOptions([
        { name: 'rpool', free: '1073741824', health: 'ONLINE' },
        { name: 'tank', free: '', health: 'DEGRADED' },
      ]).map(option => option.label)
    ).toEqual(['rpool — 1G free', 'tank · DEGRADED']);
    expect(zfsDatasetOptions([{ name: 'rpool/zones' }, { name: 'tank/a' }], 'rpool')).toEqual([
      { value: 'zones', label: 'zones' },
    ]);
  });
});
