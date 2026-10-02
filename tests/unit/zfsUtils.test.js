import { describe, expect, it } from 'vitest';

import {
  allNodeNames,
  buildTree,
  buildVdevs,
  capacityVariant,
  flatVdevDevices,
  healthBadgeClass,
  healthTextClass,
  healthTone,
  humanSize,
  nodeMatches,
  parsePropertyLines,
  parseZfsSize,
  percentOf,
  queuedMessage,
  shortDevice,
  solidState,
  toggleIn,
  usedPercent,
  vdevKey,
} from '../../src/features/hosts/utils/zfsUtils.js';

const ROWS = [
  { name: 'tank', type: 'filesystem', used: '5T', avail: '9T' },
  { name: 'tank/zones', type: 'filesystem', used: '4T', avail: '9T' },
  { name: 'tank/zones/web-1', type: 'filesystem', used: '2T', avail: '9T' },
  { name: 'tank/zones/web-1/boot', type: 'volume', used: '60G', avail: '9T' },
  { name: 'tank/zones/web-1/boot@before', type: 'snapshot', used: '1G', avail: '-' },
  { name: 'rpool', type: 'filesystem', used: '40G', avail: '400G' },
  { name: 'orphan/child@snap', type: 'snapshot', used: '0', avail: '-' },
];

describe('parsePropertyLines', () => {
  it('reads key=value lines and drops the blank ones and the ones without an equals sign', () => {
    expect(parsePropertyLines('compression=lz4\n\natime=off\nbroken\n=nokey\nquota=10G=x')).toEqual(
      {
        compression: 'lz4',
        atime: 'off',
        quota: '10G=x',
      }
    );
    expect(parsePropertyLines('')).toEqual({});
    expect(parsePropertyLines(null)).toEqual({});
  });
});

describe('the health tones', () => {
  it('draws ONLINE success, DEGRADED warning, the down states danger and the rest secondary', () => {
    expect(healthTone('online')).toBe('success');
    expect(healthTone('DEGRADED')).toBe('warning');
    expect(healthTone('FAULTED')).toBe('danger');
    expect(healthTone('UNAVAIL')).toBe('danger');
    expect(healthTone('OFFLINE')).toBe('danger');
    expect(healthTone('REMOVED')).toBe('danger');
    expect(healthTone('SUSPENDED')).toBe('secondary');
    expect(healthTone(undefined)).toBe('secondary');
    expect(healthBadgeClass('ONLINE')).toBe('text-bg-success');
    expect(healthTextClass('OFFLINE')).toBe('text-danger');
  });
});

describe('queuedMessage, humanSize and parseZfsSize', () => {
  it('names the agent message and the task id where the answer carries them', () => {
    expect(queuedMessage({ message: 'Queued', task_id: 'abc' }, 'Fallback')).toBe(
      'Queued (task abc)'
    );
    expect(queuedMessage({ task_id: 'abc' }, 'Fallback')).toBe('Fallback (task abc)');
    expect(queuedMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('draws a raw byte count in human units and leaves a human size alone', () => {
    expect(humanSize(0)).toBe('0B');
    expect(humanSize(1536)).toBe('1.5K');
    expect(humanSize('107374182400')).toBe('100G');
    expect(humanSize(5 * 1024 ** 4)).toBe('5T');
    expect(humanSize('60G')).toBe('60G');
    expect(humanSize('-')).toBe('—');
    expect(humanSize(null)).toBe('—');
  });

  it('reads a size as ZFS prints it and answers null for a dash', () => {
    expect(parseZfsSize('1.5G')).toBe(1.5 * 1024 ** 3);
    expect(parseZfsSize('60GB')).toBe(60 * 1024 ** 3);
    expect(parseZfsSize('96K')).toBe(96 * 1024);
    expect(parseZfsSize('512')).toBe(512);
    expect(parseZfsSize('-')).toBeNull();
    expect(parseZfsSize(undefined)).toBeNull();
  });
});

describe('usedPercent, capacityVariant and percentOf', () => {
  it('answers the share used of used and available, a whole percent, null when unreadable', () => {
    expect(usedPercent('1G', '3G')).toBe(25);
    expect(usedPercent('2T', '2T')).toBe(50);
    expect(usedPercent('1G', '-')).toBeNull();
    expect(usedPercent('0', '0')).toBeNull();
  });

  it('draws a capacity danger from ninety, warning from seventy-five, success under', () => {
    expect(capacityVariant(90)).toBe('danger');
    expect(capacityVariant(75)).toBe('warning');
    expect(capacityVariant(74)).toBe('success');
  });

  it('reads a pool capacity_percent, held between 0 and 100, null for none', () => {
    expect(percentOf({ capacity_percent: '36' })).toBe(36);
    expect(percentOf({ capacity_percent: '36%' })).toBe(36);
    expect(percentOf({ capacity_percent: '140' })).toBe(100);
    expect(percentOf({ capacity_percent: '-5' })).toBe(0);
    expect(percentOf({})).toBeNull();
  });
});

describe('the vdevs', () => {
  it('flattens the devices of a parsed status and keys a group by its type and first device', () => {
    const parsed = {
      vdevs: [
        { type: 'mirror', state: 'ONLINE', devices: [{ name: 'c0d0' }, { name: 'c0d1' }] },
        { type: 'disk', state: 'ONLINE', devices: [{ name: 'c1d0' }] },
        { type: 'log', state: 'ONLINE' },
      ],
    };
    expect(flatVdevDevices(parsed).map(device => device.name)).toEqual(['c0d0', 'c0d1', 'c1d0']);
    expect(flatVdevDevices(null)).toEqual([]);
    expect(vdevKey(parsed.vdevs[0])).toBe('mirror:c0d0');
    expect(vdevKey(parsed.vdevs[2])).toBe('log:empty');
  });

  it('shortens a long device name for a chip and tells a solid state disk', () => {
    expect(shortDevice('c0t5000C500A1B2C3D4d0')).toBe('c0t5000…C3D4d0');
    expect(shortDevice('c1t1d0')).toBe('c1t1d0');
    expect(solidState('SSD')).toBe(true);
    expect(solidState('NVMe')).toBe(true);
    expect(solidState('HDD')).toBe(false);
  });

  it('builds the wire vdevs from the builder rows, a plain row as strings, a typed row as an object, an empty row left out', () => {
    expect(
      buildVdevs([
        { type: '', devices: ['c0d0', 'c0d1'] },
        { type: 'mirror', devices: ['c1d0', 'c1d1'] },
        { type: 'log', devices: [] },
      ])
    ).toEqual(['c0d0', 'c0d1', { type: 'mirror', devices: ['c1d0', 'c1d1'] }]);
  });
});

describe('the dataset tree', () => {
  const tree = buildTree(ROWS);

  it('nests filesystems and volumes by name and folds each snapshot under its dataset', () => {
    expect(tree.map(node => node.name)).toEqual(['rpool', 'tank']);
    const [, tank] = tree;
    expect(tank.children.map(node => node.label)).toEqual(['zones']);
    const [zones] = tank.children;
    const [web] = zones.children;
    const [boot] = web.children;
    expect(boot.name).toBe('tank/zones/web-1/boot');
    expect(boot.row.type).toBe('volume');
    expect(boot.snapshots.map(snap => snap.name)).toEqual(['tank/zones/web-1/boot@before']);
    expect(allNodeNames(tree)).toEqual([
      'rpool',
      'tank',
      'tank/zones',
      'tank/zones/web-1',
      'tank/zones/web-1/boot',
    ]);
  });

  it('draws a node while its type is shown and it or a snapshot or a descendant matches', () => {
    const [rpool, tank] = tree;
    const all = { filesystem: true, volume: true, snapshot: true };
    expect(nodeMatches(rpool, '', all)).toBe(true);
    expect(nodeMatches(rpool, 'web', all)).toBe(false);
    expect(nodeMatches(tank, 'web-1', all)).toBe(true);
    expect(nodeMatches(tank, 'before', all)).toBe(true);
    expect(nodeMatches(tank, 'before', { ...all, snapshot: false })).toBe(false);
    expect(nodeMatches(tank, 'boot', { ...all, volume: false, snapshot: false })).toBe(false);
  });

  it('toggles a name in and out of a set without touching the set given', () => {
    const held = new Set(['a']);
    const added = toggleIn(held, 'b');
    expect([...added]).toEqual(['a', 'b']);
    expect([...toggleIn(added, 'a')]).toEqual(['b']);
    expect([...held]).toEqual(['a']);
  });
});
