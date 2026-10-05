import { describe, expect, it } from 'vitest';

import {
  diskSpec,
  linkSpec,
  machineCpuSpec,
  machineDiskSpec,
  machineMemorySpec,
  machineNetworkSpec,
  zoneCpuSpec,
  zoneMemorySpec,
} from '../../src/features/hosts/utils/machineChartSpecs.js';
import {
  MACHINE_SERIES,
  diskDevices,
  linkMetric,
  linkOf,
  linkSeries,
  machineSeriesOf,
  machineSeriesParams,
  machineUsageLatest,
  machineUsageSeries,
  zoneLinks,
  zoneUsageLatest,
  zoneUsageSeries,
} from '../../src/features/hosts/utils/machineSeries.js';

const FIRST = '2026-09-27T12:00:00.000Z';
const SECOND = '2026-09-27T12:00:05.000Z';
const NOW = new Date('2026-09-27T12:15:00.000Z').getTime();
const HELD = new Date('2026-09-27T12:10:00.000Z').getTime();
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

const t = key => key;

const at = text => new Date(text).getTime();

describe('the series of a machine', () => {
  it('names the link of a link series and none of every other', () => {
    expect(linkMetric('vnic0')).toBe('link:vnic0');
    expect(linkOf('link:vnic0')).toBe('vnic0');
    expect(linkOf('zone-usage')).toBe('');
    expect(machineSeriesOf('link:vnic0')).toBe(MACHINE_SERIES.link);
    expect(machineSeriesOf('zone-diskio')).toBe(MACHINE_SERIES['zone-diskio']);
  });

  it("asks for the host's window of a zone by its name, since the newest held sample", () => {
    const query = { window: '15min', interval: 5, newest: 0, now: NOW };
    expect(machineSeriesParams({ metric: 'zone-usage', name: 'web-1', ...query })).toEqual({
      zone: 'web-1',
      since: FIRST,
      limit: 180,
    });
    expect(
      machineSeriesParams({ metric: 'zone-diskio', name: 'web-1', ...query, newest: HELD })
    ).toEqual({
      zone: 'web-1',
      since: '2026-09-27T12:10:00.000Z',
      limit: 180,
    });
  });

  it('asks for a link by the link and for a VirtualBox machine its one sample', () => {
    const query = { window: '1hour', interval: 60, newest: 0, now: NOW };
    expect(machineSeriesParams({ metric: 'link:vnic0', name: 'web-1', ...query })).toEqual({
      link: 'vnic0',
      since: '2026-09-27T11:15:00.000Z',
      limit: 60,
    });
    expect(machineSeriesParams({ metric: 'machine-usage', name: 'dev-1', ...query })).toEqual({
      machine_name: 'dev-1',
      limit: 1,
    });
  });

  it('reads the links of a zone from its network resources', () => {
    expect(
      zoneLinks({ nics: [{ physical: 'vnic0' }, { physical: '' }, { physical: 'vnic1' }] })
    ).toEqual(['vnic0', 'vnic1']);
    expect(zoneLinks(null)).toEqual([]);
  });
});

describe('zoneUsageSeries', () => {
  const rows = [
    { scan_timestamp: FIRST, cpu_pct: 1.5, rss_bytes: 2 * GIB, swap_bytes: GIB },
    { scan_timestamp: SECOND, cpu_pct: 2.25, rss_bytes: null, swap_bytes: null },
  ];

  it('draws the share of the processors and the memory of the samples that carry it', () => {
    expect(zoneUsageSeries(rows)).toEqual({
      cpu: [
        [at(FIRST), 1.5],
        [at(SECOND), 2.25],
      ],
      resident: [[at(FIRST), 2]],
      swap: [[at(FIRST), 1]],
    });
  });

  it('reads the newest values for the badges', () => {
    expect(zoneUsageLatest(rows)).toEqual({ cpu: 2.25, resident: 2 });
    expect(zoneUsageLatest([])).toEqual({ cpu: null, resident: null });
  });
});

describe('diskDevices', () => {
  const rows = [
    {
      scan_timestamp: FIRST,
      dataset: 'tank/zones/web-1/data',
      pool: 'tank',
      device: 'data',
      read_bps: MIB,
      write_bps: 2 * MIB,
      read_iops: 10.4,
      write_iops: 20.6,
    },
    {
      scan_timestamp: FIRST,
      dataset: 'rpool/zones/web-1/boot',
      pool: null,
      device: null,
      read_bps: 0,
      write_bps: MIB / 2,
      read_iops: 0,
      write_iops: 3,
    },
    {
      scan_timestamp: SECOND,
      dataset: 'tank/zones/web-1/data',
      pool: 'tank',
      device: 'data',
      read_bps: 3 * MIB,
      write_bps: null,
      read_iops: 31,
      write_iops: null,
    },
  ];

  it('answers one entry a volume, never summed, ordered by pool and device', () => {
    const devices = diskDevices(rows);
    expect(devices.map(device => [device.pool, device.device, device.dataset])).toEqual([
      ['', 'boot', 'rpool/zones/web-1/boot'],
      ['tank', 'data', 'tank/zones/web-1/data'],
    ]);
    expect(devices[1].read).toEqual([
      [at(FIRST), 1],
      [at(SECOND), 3],
    ]);
    expect(devices[1].write).toEqual([[at(FIRST), 2]]);
  });

  it('adds no point for a rate the agent answers null and draws a rate of zero', () => {
    const [boot, data] = diskDevices(rows);
    expect(data.write).toHaveLength(1);
    expect(boot.read).toEqual([[at(FIRST), 0]]);
    expect(diskDevices([{ ...rows[0], read_bps: null, write_bps: null }])[0]).toMatchObject({
      read: [],
      write: [],
    });
  });

  it('carries the operations a second of the newest sample that names them', () => {
    const [boot, data] = diskDevices(rows);
    expect([boot.readIops, boot.writeIops]).toEqual([0, 3]);
    expect([data.readIops, data.writeIops]).toEqual([31, 21]);
    const [silent] = diskDevices([{ ...rows[0], read_iops: null, write_iops: null }]);
    expect([silent.readIops, silent.writeIops]).toEqual([null, null]);
  });

  it('draws the megabytes a second read and written of a volume', () => {
    const [, data] = diskDevices(rows);
    const spec = diskSpec({ device: data, t });
    expect(spec.axes).toEqual([{ name: 'MB/s', min: 0, unit: ' MB/s' }]);
    expect(spec.series.map(line => [line.key, line.tone])).toEqual([
      ['read', 'blue'],
      ['write', 'orange'],
    ]);
    expect(spec.series[0].points).toEqual(data.read);
  });
});

describe('linkSeries', () => {
  it('reads the megabits a second the agent answers as decimal text', () => {
    const rows = [{ scan_timestamp: FIRST, link: 'vnic0', rx_mbps: '8.39', tx_mbps: '4.19' }];
    expect(linkSeries(rows)).toEqual({ rx: [[at(FIRST), 8.39]], tx: [[at(FIRST), 4.19]] });
    const spec = linkSpec({ rows, t });
    expect(spec.axes[0].unit).toBe(' Mbps');
    expect(spec.series.map(line => line.key)).toEqual(['rx', 'tx']);
  });
});

describe('the usage of a zone as charts', () => {
  const rows = [{ scan_timestamp: FIRST, cpu_pct: 1.5, rss_bytes: 2 * GIB, swap_bytes: GIB }];

  it('draws the processors in percent and the memory in gigabytes', () => {
    const cpu = zoneCpuSpec({ rows, t });
    expect(cpu.axes).toEqual([{ name: '%', min: 0, unit: '%' }]);
    expect(cpu.series.map(line => [line.key, line.tone, line.name])).toEqual([
      ['cpu', 'green', 'machine.machineResourceCharts.cpuSeries'],
    ]);
    const memory = zoneMemorySpec({ rows, t });
    expect(memory.axes[0].unit).toBe(' GB');
    expect(memory.series.map(line => [line.key, line.points])).toEqual([
      ['resident', [[at(FIRST), 2]]],
      ['swap', [[at(FIRST), 1]]],
    ]);
  });
});

describe('machineUsageSeries', () => {
  const first = {
    scan_timestamp: FIRST,
    cpu_guest_pct: 3.5,
    cpu_vmm_pct: 0.5,
    cpu_pct: 4,
    rss_bytes: 2 * GIB,
    ram_total_bytes: 8 * GIB,
    guest_additions: true,
    net_rx_bps: null,
    net_tx_bps: null,
    disk_read_bps: null,
    disk_write_bps: null,
  };
  const second = {
    ...first,
    scan_timestamp: SECOND,
    net_rx_bps: MIB,
    net_tx_bps: 2 * MIB,
    disk_read_bps: MIB / 2,
    disk_write_bps: 0,
  };

  it('draws a rate only of the samples that carry it, none on the first observation', () => {
    const series = machineUsageSeries([first, second]);
    expect(series.cpuGuest).toHaveLength(2);
    expect(series.netRx).toEqual([[at(SECOND), 1]]);
    expect(series.netTx).toEqual([[at(SECOND), 2]]);
    expect(series.diskRead).toEqual([[at(SECOND), 0.5]]);
    expect(series.diskWrite).toEqual([[at(SECOND), 0]]);
    expect(series.memory).toEqual([
      [at(FIRST), 2],
      [at(SECOND), 2],
    ]);
  });

  it('reads the newest values for the badges', () => {
    expect(machineUsageLatest([first, second])).toEqual({
      cpu: 4,
      memoryTotal: 8,
      netRx: 1,
      netTx: 2,
      additions: true,
    });
    expect(machineUsageLatest([first]).netRx).toBeNull();
  });

  it('says the guest additions are missing only where the sample says so', () => {
    expect(machineUsageLatest([{ ...first, guest_additions: false }]).additions).toBe(false);
    expect(machineUsageLatest([]).additions).toBe(true);
  });

  it('draws the four charts of a VirtualBox machine', () => {
    const rows = [first, second];
    expect(machineCpuSpec({ rows, t }).series.map(line => [line.key, line.tone])).toEqual([
      ['guest', 'green'],
      ['vmm', 'purple'],
    ]);
    expect(machineMemorySpec({ rows, t }).series.map(line => line.key)).toEqual(['used']);
    expect(machineNetworkSpec({ rows, t }).axes[0].unit).toBe(' MB/s');
    expect(machineDiskSpec({ rows, t }).series.map(line => line.key)).toEqual(['read', 'write']);
  });
});
