import { describe, expect, it } from 'vitest';

import {
  SUMMARY_CHARTS,
  ioSpec,
  summarySpec,
} from '../../src/features/hosts/utils/chartDefaults.js';
import {
  DATASET_FILTERS,
  DEFAULT_STORAGE_CHART_SORT,
  DISK_FILTERS,
  DISK_IO_FILTERS,
  POOL_FILTERS,
  POOL_IO_FILTERS,
  STORAGE_CHART_SORTS,
  arcRatios,
  compressionRatioTone,
  deduplicateDisksByIdentity,
  deduplicateRecords,
  diskIoRows,
  diskKey,
  diskRows,
  extractLatestPerGroup,
  formatBytes,
  formatIoRate,
  formatPercentage,
  groupByKey,
  healthTone,
  hitRatioTone,
  hostHasStorage,
  ioRates,
  ioSeries,
  ioTone,
  matchesDisk,
  matchesDiskIo,
  matchesPool,
  parseSize,
  poolIoRows,
  poolRows,
  poolTypeTone,
  poolUsage,
  sortedChartEntries,
  temperatureTone,
  usageTone,
} from '../../src/features/hosts/utils/StorageUtils.js';

const rowOf = features => ({ capabilities: { features } });

const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);

const EARLY = '2026-09-27T11:59:00.000Z';
const LATE = '2026-09-27T12:00:00.000Z';
const MIB = 1024 ** 2;

const SAMPLES = [
  {
    device_name: 'c0d0',
    pool: 'rpool',
    read_bandwidth_bytes: String(MIB),
    write_bandwidth_bytes: String(2 * MIB),
    scan_timestamp: EARLY,
  },
  {
    device_name: 'c0d0',
    pool: 'rpool',
    read_bandwidth_bytes: String(3 * MIB),
    write_bandwidth_bytes: String(4 * MIB),
    scan_timestamp: LATE,
  },
  {
    device_name: 'c0d1',
    pool: 'tank',
    read_bandwidth_bytes: String(16 * MIB),
    write_bandwidth_bytes: String(40 * MIB),
    scan_timestamp: EARLY,
  },
  {
    device_name: 'c0d1',
    pool: 'tank',
    read_bandwidth_bytes: String(8 * MIB),
    write_bandwidth_bytes: String(32 * MIB),
    scan_timestamp: LATE,
  },
  {
    device_name: 'c0d2',
    pool: 'tank',
    read_bandwidth_bytes: '0',
    write_bandwidth_bytes: '0',
    scan_timestamp: LATE,
  },
];

describe('hostHasStorage', () => {
  it('answers true while the row lists zfs and false otherwise, monitoring alone included', () => {
    expect(hostHasStorage(rowOf(['machines', 'zfs']))).toBe(true);
    expect(hostHasStorage(rowOf(['monitoring']))).toBe(false);
    expect(hostHasStorage({ capabilities: null })).toBe(false);
    expect(hostHasStorage(null)).toBe(false);
  });
});

describe('formatBytes, formatPercentage and parseSize', () => {
  it('draws a byte count in steps of 1024 with two decimals at most', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 ** 4)).toBe('5 TB');
    expect(formatBytes('44238211481')).toBe('41.2 GB');
    expect(formatBytes('none')).toBe('0 B');
  });

  it('draws a share in percent with one decimal and nothing for nothing', () => {
    expect(formatPercentage(1, 4)).toBe('25.0%');
    expect(formatPercentage(0, 4)).toBe('0%');
    expect(formatPercentage(3, 0)).toBe('0%');
  });

  it('reads a size as ZFS prints it and leaves a number and a dash alone', () => {
    expect(parseSize('1K')).toBe(1024);
    expect(parseSize('1.5M')).toBe(1.5 * MIB);
    expect(parseSize('5.31T')).toBe(Math.floor(5.31 * 1024 ** 4));
    expect(parseSize('96K')).toBe(96 * 1024);
    expect(parseSize(2048)).toBe(2048);
    expect(parseSize('-')).toBe(0);
    expect(parseSize('none')).toBe(0);
    expect(parseSize('')).toBe(0);
    expect(parseSize('lots')).toBe(0);
  });
});

describe('the tones', () => {
  it('draws a health word in its tone', () => {
    expect(healthTone('ONLINE')).toBe('success');
    expect(healthTone('degraded')).toBe('warning');
    expect(healthTone('FAULTED')).toBe('danger');
    expect(healthTone('unknown')).toBe('info');
    expect(healthTone(undefined)).toBe('info');
  });

  it('draws a usage, a temperature, a rate and a pool type in their tones', () => {
    expect(usageTone(81)).toBe('danger');
    expect(usageTone(61)).toBe('warning');
    expect(usageTone(60)).toBe('success');
    expect(temperatureTone(61)).toBe('danger');
    expect(temperatureTone(46)).toBe('warning');
    expect(temperatureTone(45)).toBe('success');
    expect(ioTone(51)).toBe('danger');
    expect(ioTone(11)).toBe('warning');
    expect(ioTone(0.5)).toBe('success');
    expect(ioTone(0)).toBe('secondary');
    expect(poolTypeTone('raidz2')).toBe('success');
    expect(poolTypeTone('raidz1')).toBe('info');
    expect(poolTypeTone('mirror')).toBe('warning');
    expect(poolTypeTone('stripe')).toBe('dark');
  });

  it('draws the ARC ratios in their tones', () => {
    expect(hitRatioTone(96)).toBe('success');
    expect(hitRatioTone(91)).toBe('info');
    expect(hitRatioTone(81)).toBe('warning');
    expect(hitRatioTone(10)).toBe('danger');
    expect(compressionRatioTone(2.1)).toBe('success');
    expect(compressionRatioTone(1.6)).toBe('info');
    expect(compressionRatioTone(1.2)).toBe('warning');
    expect(compressionRatioTone(1)).toBe('dark');
  });
});

describe('groupByKey, extractLatestPerGroup and deduplicateRecords', () => {
  it('groups the rows by a member and keeps the newest of each group', () => {
    const groups = groupByKey(SAMPLES, 'pool');
    expect(Object.keys(groups)).toEqual(['rpool', 'tank']);
    expect(groups.tank).toHaveLength(3);
    expect(extractLatestPerGroup(groups).map(row => [row.pool, row.scan_timestamp])).toEqual([
      ['rpool', LATE],
      ['tank', LATE],
    ]);
    expect(groupByKey([{ name: 'x' }], 'pool')).toEqual({});
  });

  it('keeps one row a key, the newest of two that share it, in the order first seen', () => {
    const rows = deduplicateRecords(SAMPLES, row => row.device_name);
    expect(rows.map(row => [row.device_name, row.scan_timestamp])).toEqual([
      ['c0d0', LATE],
      ['c0d1', LATE],
      ['c0d2', LATE],
    ]);
  });

  it('tells two disks apart by device name, serial, device or name, the newest kept', () => {
    const disks = deduplicateDisksByIdentity([
      { device_name: 'c1t1d0', serial_number: 'A', scan_timestamp: EARLY, temperature: 31 },
      { device_name: 'c1t1d0', serial_number: 'A', scan_timestamp: LATE, temperature: 33 },
      { device: 'c1t2d0', scan_timestamp: LATE },
      { device_name: 'c1t3d0', serial_number: 'B', scan_timestamp: LATE },
    ]);
    expect(disks.map(disk => [diskKey(disk), disk.temperature])).toEqual([
      ['A', 33],
      ['c1t2d0', undefined],
      ['B', undefined],
    ]);
  });
});

describe('the rows of the five tables', () => {
  it('draws each pool, dataset and disk once, the newest row of each, in the order of their names', () => {
    const pools = poolRows({
      pools: [
        { pool: 'tank', scan_timestamp: EARLY, capacity: '36.50' },
        { pool: 'rpool', scan_timestamp: LATE },
        { pool: 'tank', scan_timestamp: LATE, capacity: '36.60' },
      ],
    });
    expect(pools.map(row => [row.pool, row.capacity])).toEqual([
      ['rpool', undefined],
      ['tank', '36.60'],
    ]);
    expect(poolRows(null)).toEqual([]);
    expect(
      diskRows({
        disks: [
          { device_name: 'c1t1d0', scan_timestamp: EARLY },
          { device_name: 'c0t0d0', scan_timestamp: LATE },
          { device_name: 'c1t1d0', scan_timestamp: LATE },
        ],
      }).map(row => row.device_name)
    ).toEqual(['c0t0d0', 'c1t1d0']);
    expect(diskRows({ disks: 'none' })).toEqual([]);
  });

  it('draws the newest I/O sample of each device and of each pool', () => {
    expect(diskIoRows(SAMPLES).map(row => [row.device_name, row.scan_timestamp])).toEqual([
      ['c0d0', LATE],
      ['c0d1', LATE],
      ['c0d2', LATE],
    ]);
    expect(poolIoRows(SAMPLES).map(row => row.pool)).toEqual(['rpool', 'tank']);
  });
});

describe('poolUsage, ioRates and formatIoRate', () => {
  it('reads the allocated and the free space from the human sizes and the bytes otherwise', () => {
    expect(poolUsage({ alloc: '1G', free: '3G' })).toEqual({
      alloc: 1024 ** 3,
      free: 3 * 1024 ** 3,
      total: 4 * 1024 ** 3,
      percent: 25,
    });
    expect(poolUsage({ alloc_bytes: '100', free_bytes: '300' }).percent).toBe(25);
    expect(poolUsage({})).toEqual({ alloc: 0, free: 0, total: 0, percent: 0 });
  });

  it('reads the megabytes a second of a sample and draws them', () => {
    expect(ioRates(SAMPLES[1])).toEqual({ read: 3, write: 4, total: 7 });
    expect(ioRates(null)).toEqual({ read: 0, write: 0, total: 0 });
    expect(formatIoRate(7)).toBe('7.00 MB/s');
    expect(formatIoRate(0.5)).toBe('512 KB/s');
    expect(formatIoRate(0)).toBe('0 B/s');
  });
});

describe('the matches and the filter groups', () => {
  it('finds a pool by its name and its health, a disk by its name, model, serial, type and pool, a sample by its device and pool', () => {
    expect(matchesPool({ pool: 'tank', health: 'ONLINE' }, 'online')).toBe(true);
    expect(matchesPool({ pool: 'tank' }, 'rpool')).toBe(false);
    expect(
      matchesDisk({ device_name: 'c1t1d0', model: 'ST8000', pool_assignment: 'tank' }, 'st8')
    ).toBe(true);
    expect(matchesDisk({ device_name: 'c1t1d0', pool_assignment: 'tank' }, 'tank')).toBe(true);
    expect(matchesDisk({ device_name: 'c1t1d0' }, 'tank')).toBe(false);
    expect(matchesDiskIo({ device_name: 'c1t1d0', pool: 'tank' }, 'tank')).toBe(true);
    expect(matchesDiskIo({ device_name: 'c1t1d0' }, 'tank')).toBe(false);
  });

  it('names the enumerable columns of each table', () => {
    expect(POOL_FILTERS.map(group => group.key)).toEqual(['health']);
    expect(POOL_FILTERS[0].values({ health: 'ONLINE' })).toEqual(['ONLINE']);
    expect(POOL_FILTERS[0].values({})).toEqual([]);
    expect(DATASET_FILTERS.map(group => group.key)).toEqual(['type', 'compression']);
    expect(DISK_FILTERS.map(group => group.key)).toEqual(['type', 'health', 'pool']);
    expect(DISK_FILTERS[2].values({ pool_assignment: 'tank' })).toEqual(['tank']);
    expect(DISK_IO_FILTERS.map(group => group.key)).toEqual(['pool']);
    expect(POOL_IO_FILTERS.map(group => group.key)).toEqual(['type']);
    expect(POOL_IO_FILTERS[0].values({ pool_type: 'raidz2' })).toEqual(['raidz2']);
  });
});

describe('the charts', () => {
  const entities = ioSeries(SAMPLES, row => row.device_name);

  it('draws three lines a device, megabytes a second, oldest first', () => {
    expect(Object.keys(entities)).toEqual(['c0d0', 'c0d1', 'c0d2']);
    expect(entities.c0d0.first).toEqual([
      [new Date(EARLY).getTime(), 1],
      [new Date(LATE).getTime(), 3],
    ]);
    expect(entities.c0d0.total[1]).toEqual([new Date(LATE).getTime(), 7]);
    expect(ioSeries([{ scan_timestamp: LATE }], row => row.device_name)).toEqual({});
  });

  it('lists the three summary charts and the four orders', () => {
    expect(SUMMARY_CHARTS.map(chart => [chart.key, chart.member])).toEqual([
      ['read', 'first'],
      ['write', 'second'],
      ['total', 'total'],
    ]);
    expect(STORAGE_CHART_SORTS.map(sort => sort.key)).toEqual([
      'bandwidth',
      'name',
      'read',
      'write',
    ]);
    expect(DEFAULT_STORAGE_CHART_SORT).toBe('bandwidth');
  });

  it('orders the devices by the average of their newest rates, the busiest first, or by name', () => {
    expect(sortedChartEntries(entities, 'bandwidth')).toEqual(['c0d1', 'c0d0', 'c0d2']);
    expect(sortedChartEntries(entities, 'read')).toEqual(['c0d1', 'c0d0', 'c0d2']);
    expect(sortedChartEntries(entities, 'name')).toEqual(['c0d0', 'c0d1', 'c0d2']);
    expect(sortedChartEntries(entities, 'unknown')).toEqual(['c0d0', 'c0d1', 'c0d2']);
    expect(sortedChartEntries({}, 'bandwidth')).toEqual([]);
  });

  it('draws a line a device in a summary chart and the three lines of one device with the hidden groups marked', () => {
    const summary = summarySpec('first', entities, t);
    expect(summary.axes).toEqual([
      { name: 'host.expandedChartOptions.axisBandwidthMBs', min: 0, unit: ' MB/s' },
    ]);
    expect(summary.series.map(line => [line.key, line.points.length])).toEqual([
      ['c0d0', 2],
      ['c0d1', 2],
      ['c0d2', 1],
    ]);
    const one = ioSpec(entities.c0d1, { read: true, write: false, total: true }, t);
    expect(one.series.map(line => [line.key, line.tone, line.width, line.hidden])).toEqual([
      ['first', 'blue', 2, false],
      ['second', 'orange', 2, true],
      ['total', 'green', 3, false],
    ]);
  });
});

describe('arcRatios', () => {
  it('reads the hit ratio the agent answers, or counts it, the compression ratio and the L2ARC', () => {
    expect(arcRatios({ hit_ratio: '95.64', hits: '10', misses: '10' })).toEqual({
      hitRatio: 95.6,
      compressionRatio: null,
      l2HitRatio: 0,
      l2: false,
    });
    expect(
      arcRatios({ hits: '3', misses: '1', compressed_size: '100', uncompressed_size: '250' })
    ).toEqual({
      hitRatio: 75,
      compressionRatio: 2.5,
      l2HitRatio: 0,
      l2: false,
    });
    expect(arcRatios({ l2_hits: '8', l2_misses: '2', l2_size: '1024' })).toMatchObject({
      l2HitRatio: 80,
      l2: true,
    });
    expect(arcRatios(null).hitRatio).toBe(0);
  });
});
