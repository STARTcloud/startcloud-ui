import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUERY,
  READS,
  SERIES,
  WIDEST_MINUTES,
  WINDOWS,
  HISTORY_MODES,
  historyParams,
  historySpans,
  hostOffers,
  spanSamples,
  windowMinutes,
  windowMs,
} from '../../src/features/hosts/utils/monitoring.js';

const NOON = Date.UTC(2026, 8, 27, 12, 0, 0);
const HELD = Date.UTC(2026, 8, 27, 11, 58, 30);
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

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

describe('WINDOWS', () => {
  it('list the ten windows, the widest the span the ring keeps', () => {
    const minutes = WINDOWS.map(entry => entry.minutes);
    expect(minutes).toEqual([1, 5, 10, 15, 30, 60, 180, 360, 720, 1440]);
    expect(DEFAULT_QUERY).toEqual({ window: '15min' });
    expect(WIDEST_MINUTES).toBe(1440);
    expect(windowMinutes('1hour')).toBe(60);
    expect(windowMinutes('week')).toBe(15);
    expect(windowMs('1hour')).toBe(3600000);
    expect(windowMs('week')).toBe(900000);
  });
});

describe('spanSamples', () => {
  it('answers every sample the span holds at the interval, one at least', () => {
    expect(spanSamples(NOON - 15 * MINUTE, NOON, 60)).toBe(15);
    expect(spanSamples(NOON - 15 * MINUTE, NOON, 7)).toBe(129);
    expect(spanSamples(NOON - DAY, NOON, 60)).toBe(1440);
    expect(spanSamples(NOON - DAY, NOON, 5)).toBe(17280);
    expect(spanSamples(NOON, NOON, 5)).toBe(1);
  });
});

describe('historySpans', () => {
  const start = NOON - 15 * MINUTE;
  const { open, refresh, rewindow } = HISTORY_MODES;
  const short = { oldest: start + MINUTE, newest: HELD, start, now: NOON };
  const covered = { oldest: start - MINUTE, newest: HELD, start, now: NOON };

  it('asks for the whole window while nothing is held, on every occasion', () => {
    const none = { oldest: null, newest: null, start, now: NOON };
    [open, refresh, rewindow].forEach(mode => {
      expect(historySpans({ ...none, mode })).toEqual([{ since: start, until: NOON }]);
    });
  });

  it('asks both ways on open when the store does not reach the window start', () => {
    expect(historySpans({ ...short, mode: open })).toEqual([
      { since: start, until: start + MINUTE },
      { since: HELD, until: NOON },
    ]);
  });

  it('asks forward alone on open when the store reaches the window start', () => {
    expect(historySpans({ ...covered, mode: open })).toEqual([{ since: HELD, until: NOON }]);
    expect(historySpans({ ...covered, oldest: start, mode: open })).toEqual([
      { since: HELD, until: NOON },
    ]);
  });

  it('asks forward alone on refresh, whatever the store reaches', () => {
    expect(historySpans({ ...short, mode: refresh })).toEqual([{ since: HELD, until: NOON }]);
    expect(historySpans({ ...covered, mode: refresh })).toEqual([{ since: HELD, until: NOON }]);
  });

  it('asks backward alone on rewindow when the store does not reach the window start', () => {
    expect(historySpans({ ...short, mode: rewindow })).toEqual([
      { since: start, until: start + MINUTE },
    ]);
  });

  it('asks for nothing on rewindow when the store reaches the window start', () => {
    expect(historySpans({ ...covered, mode: rewindow })).toEqual([]);
    expect(historySpans({ ...covered, oldest: start, mode: rewindow })).toEqual([]);
  });
});

describe('historyParams', () => {
  const UNTIL = '2026-09-27T12:00:00.000Z';

  it('sends the span as RFC 3339 with the samples it holds at the interval', () => {
    expect(historyParams({ since: NOON - 15 * MINUTE, until: NOON, interval: 60 })).toEqual({
      since: '2026-09-27T11:45:00.000Z',
      until: UNTIL,
      limit: 15,
    });
    expect(historyParams({ since: NOON - DAY, until: NOON, interval: 60 })).toEqual({
      since: '2026-09-26T12:00:00.000Z',
      until: UNTIL,
      limit: 1440,
    });
    expect(historyParams({ since: HELD, until: NOON, interval: 30 })).toEqual({
      since: '2026-09-27T11:58:30.000Z',
      until: UNTIL,
      limit: 3,
    });
  });

  it('sends no limit while the interval is unknown', () => {
    expect(historyParams({ since: NOON - DAY, until: NOON, interval: 0 })).toEqual({
      since: '2026-09-26T12:00:00.000Z',
      until: UNTIL,
    });
  });
});
