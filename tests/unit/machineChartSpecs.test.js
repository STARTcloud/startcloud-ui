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
import { diskDevices } from '../../src/features/hosts/utils/machineSeries.js';

const FIRST = '2026-09-27T12:00:00.000Z';
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

const t = key => key;

const at = text => new Date(text).getTime();

const drawn = spec => spec.series.map(line => [line.key, line.name, line.tone]);

describe('the charts of a zone', () => {
  const rows = [{ scan_timestamp: FIRST, cpu_pct: 4.5, rss_bytes: 2 * GIB, swap_bytes: GIB }];

  it('draw the share of the processors as one green line in percent', () => {
    const spec = zoneCpuSpec({ rows, t });
    expect(spec.axes).toEqual([{ name: '%', min: 0, unit: '%' }]);
    expect(drawn(spec)).toEqual([['cpu', 'machine.machineResourceCharts.cpuSeries', 'green']]);
    expect(spec.series[0].points).toEqual([[at(FIRST), 4.5]]);
  });

  it('draw the resident memory and the swap in gigabytes', () => {
    const spec = zoneMemorySpec({ rows, t });
    expect(spec.axes[0].unit).toBe(' GB');
    expect(drawn(spec)).toEqual([
      ['resident', 'machine.machineResourceCharts.residentSeries', 'blue'],
      ['swap', 'machine.machineResourceCharts.swapSeries', 'orange'],
    ]);
    expect(spec.series.map(line => line.points)).toEqual([[[at(FIRST), 2]], [[at(FIRST), 1]]]);
  });

  it('draw the megabytes a second read and written of one volume', () => {
    const [device] = diskDevices([
      {
        scan_timestamp: FIRST,
        dataset: 'rpool/zones/web-1/boot',
        pool: null,
        device: null,
        read_bps: MIB,
        write_bps: 2 * MIB,
      },
    ]);
    const spec = diskSpec({ device, t });
    expect(spec.axes[0].unit).toBe(' MB/s');
    expect(drawn(spec)).toEqual([
      ['read', 'machine.machineResourceCharts.readSeries', 'blue'],
      ['write', 'machine.machineResourceCharts.writeSeries', 'orange'],
    ]);
    expect(spec.series.map(line => line.points)).toEqual([[[at(FIRST), 1]], [[at(FIRST), 2]]]);
  });

  it('draw the megabits a second of one link, sent as text by the agent', () => {
    const spec = linkSpec({
      rows: [{ scan_timestamp: FIRST, link: 'vnice3_0001_0', rx_mbps: '1.50', tx_mbps: '0.25' }],
      t,
    });
    expect(spec.axes[0].unit).toBe(' Mbps');
    expect(drawn(spec)).toEqual([
      ['rx', 'machine.machineResourceCharts.rxSeries', 'blue'],
      ['tx', 'machine.machineResourceCharts.txSeries', 'orange'],
    ]);
    expect(spec.series.map(line => line.points)).toEqual([[[at(FIRST), 1.5]], [[at(FIRST), 0.25]]]);
  });
});

describe('the charts of a VirtualBox machine', () => {
  const rows = [
    {
      scan_timestamp: FIRST,
      cpu_guest_pct: 12,
      cpu_vmm_pct: 1.5,
      rss_bytes: 3 * GIB,
      net_rx_bps: MIB,
      net_tx_bps: null,
      disk_read_bps: 2 * MIB,
      disk_write_bps: 4 * MIB,
    },
  ];

  it("draw the guest's share in green and the monitor's in purple", () => {
    const spec = machineCpuSpec({ rows, t });
    expect(spec.axes[0].unit).toBe('%');
    expect(drawn(spec)).toEqual([
      ['guest', 'machine.vboxResourceCharts.guestSeries', 'green'],
      ['vmm', 'machine.vboxResourceCharts.vmmSeries', 'purple'],
    ]);
    expect(spec.series.map(line => line.points)).toEqual([[[at(FIRST), 12]], [[at(FIRST), 1.5]]]);
  });

  it('draw the memory used in gigabytes', () => {
    const spec = machineMemorySpec({ rows, t });
    expect(spec.axes[0].unit).toBe(' GB');
    expect(drawn(spec)).toEqual([['used', 'machine.vboxResourceCharts.usedSeries', 'blue']]);
    expect(spec.series[0].points).toEqual([[at(FIRST), 3]]);
  });

  it('draw no point for a rate the sample carries as null', () => {
    const spec = machineNetworkSpec({ rows, t });
    expect(spec.axes[0].unit).toBe(' MB/s');
    expect(spec.series.map(line => [line.key, line.name, line.points])).toEqual([
      ['rx', 'machine.vboxResourceCharts.rxSeries', [[at(FIRST), 1]]],
      ['tx', 'machine.vboxResourceCharts.txSeries', []],
    ]);
  });

  it('draw the megabytes a second read and written over every disk', () => {
    const spec = machineDiskSpec({ rows, t });
    expect(spec.series.map(line => [line.key, line.name, line.points])).toEqual([
      ['read', 'machine.vboxResourceCharts.readSeries', [[at(FIRST), 2]]],
      ['write', 'machine.vboxResourceCharts.writeSeries', [[at(FIRST), 4]]],
    ]);
  });
});
