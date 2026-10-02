import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUERY,
  MAX_POINTS,
  READS,
  RESOLUTIONS,
  SERIES,
  WINDOWS,
  historyParams,
  hostOffers,
} from '../../src/features/hosts/utils/monitoring.js';

const NOON = Date.UTC(2026, 8, 27, 12, 0, 0);

const agent = { capabilities: { features: ['machines', 'tasks', 'monitoring', 'swap'] } };
const zones = { capabilities: { features: ['machines', 'monitoring', 'zfs'] } };

describe('hostOffers', () => {
  it('answers true only when the row lists every token', () => {
    expect(hostOffers(agent, ['monitoring'])).toBe(true);
    expect(hostOffers(agent, ['monitoring', 'zfs'])).toBe(false);
    expect(hostOffers(zones, ['monitoring', 'zfs'])).toBe(true);
    expect(hostOffers(zones, ['swap'])).toBe(false);
  });

  it('answers false for a row that has not answered', () => {
    expect(hostOffers(null, ['monitoring'])).toBe(false);
    expect(hostOffers({ capabilities: null }, ['monitoring'])).toBe(false);
  });
});

describe('READS and SERIES', () => {
  it('put the ZFS reads behind monitoring and zfs both', () => {
    expect(READS.pools.tokens).toEqual(['monitoring', 'zfs']);
    expect(READS.datasets.tokens).toEqual(['monitoring', 'zfs']);
    expect(SERIES['pool-io'].tokens).toEqual(['monitoring', 'zfs']);
    expect(SERIES.arc.tokens).toEqual(['monitoring', 'zfs']);
    expect(SERIES['disk-io'].tokens).toEqual(['monitoring', 'zfs']);
  });

  it('put the disk inventory behind monitoring alone', () => {
    expect(READS.disks).toEqual({ path: 'monitoring/storage/disks', tokens: ['monitoring'] });
  });

  it('put every other read behind the one token of its surface', () => {
    expect(READS['monitoring-status'].tokens).toEqual(['monitoring']);
    expect(READS.interfaces.tokens).toEqual(['monitoring']);
    expect(READS['task-stats'].tokens).toEqual(['tasks']);
    expect(READS.swap.tokens).toEqual(['swap']);
    expect(READS.provisioning.tokens).toEqual(['provisioning']);
    expect(SERIES.cpu.tokens).toEqual(['monitoring']);
  });

  it('name the member and the event of every series', () => {
    const named = Object.entries(SERIES).map(([key, entry]) => [key, entry.member, entry.event]);
    expect(named).toEqual([
      ['cpu', 'cpu', 'cpu-sample'],
      ['memory', 'memory', 'memory-sample'],
      ['network', 'usage', 'network-sample'],
      ['pool-io', 'poolio', 'pool-io-sample'],
      ['arc', 'arc', 'arc-sample'],
      ['disk-io', 'diskio', 'disk-io-sample'],
    ]);
  });

  it('tell the rows of one interface, pool or device from another by its name', () => {
    expect(SERIES.network.entity).toBe('link');
    expect(SERIES['pool-io'].entity).toBe('pool');
    expect(SERIES['disk-io'].entity).toBe('device_name');
    expect(SERIES['disk-io'].params).toEqual({ per_device: true });
    expect(SERIES.cpu.entity).toBe('');
  });
});

describe('WINDOWS and RESOLUTIONS', () => {
  it('list the ten windows and the four resolutions', () => {
    const minutes = WINDOWS.map(entry => entry.minutes);
    expect(minutes).toEqual([1, 5, 10, 15, 30, 60, 180, 360, 720, 1440]);
    expect(RESOLUTIONS.map(entry => [entry.key, entry.limit])).toEqual([
      ['realtime', 125],
      ['high', 38],
      ['medium', 13],
      ['low', 5],
    ]);
    expect(DEFAULT_QUERY).toEqual({ window: '15min', resolution: 'high' });
    expect(MAX_POINTS).toBe(180);
  });
});

describe('historyParams', () => {
  it('reaches back the window from now and asks for the samples of the resolution', () => {
    expect(historyParams(DEFAULT_QUERY, NOON)).toEqual({
      since: '2026-09-27T11:45:00.000Z',
      limit: 38,
    });
    expect(historyParams({ window: '24hour', resolution: 'low' }, NOON)).toEqual({
      since: '2026-09-26T12:00:00.000Z',
      limit: 5,
    });
  });

  it('reads fifteen minutes and 38 samples for a query it does not know', () => {
    expect(historyParams({ window: 'week', resolution: 'fine' }, NOON)).toEqual({
      since: '2026-09-27T11:45:00.000Z',
      limit: 38,
    });
  });
});
