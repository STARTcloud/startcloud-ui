import { describe, expect, it } from 'vitest';

import { clockOf, formatInstant } from '../../src/utils/clock.js';

const INSTANT = '2026-09-06T12:02:00Z';

describe('clockOf', () => {
  it('names the account clock and leaves an empty member undefined', () => {
    expect(clockOf({ timezone: 'America/Chicago', locale: 'en-GB', hour_cycle: 'h23' })).toEqual({
      timeZone: 'America/Chicago',
      locale: 'en-GB',
      hourCycle: 'h23',
    });
    expect(clockOf({ timezone: null, locale: '', hour_cycle: undefined })).toEqual({
      timeZone: undefined,
      locale: undefined,
      hourCycle: undefined,
    });
    expect(clockOf(null)).toEqual({ timeZone: undefined, locale: undefined, hourCycle: undefined });
  });
});

describe('formatInstant', () => {
  it("writes the instant on the account's clock", () => {
    const clock = clockOf({ timezone: 'America/Chicago', locale: 'en-GB', hour_cycle: 'h23' });
    expect(formatInstant(INSTANT, clock, 'en')).toBe('6 Sept 2026, 07:02');
  });

  it("falls to the UI's language and the browser's zone while the account names none", () => {
    const text = formatInstant(INSTANT, clockOf(null), 'en-GB');
    expect(text).toMatch(/6 Sept 2026/);
  });

  it('drops a zone the browser does not know and keeps the rest', () => {
    const clock = clockOf({ timezone: 'Mars/Olympus', locale: 'en-GB', hour_cycle: 'h23' });
    expect(formatInstant(INSTANT, clock, 'en')).toMatch(/Sept 2026/);
  });

  it('answers empty for a value Date cannot parse', () => {
    expect(formatInstant('never', clockOf(null), 'en')).toBe('');
  });
});
