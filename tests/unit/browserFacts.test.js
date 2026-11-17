import { afterEach, describe, expect, it, vi } from 'vitest';

import { browserFactsPatch } from '../../src/utils/browserFacts.js';

const FACTS = {
  timezone: 'America/Chicago',
  language: 'en',
  locale: 'en-US',
  hour_cycle: 'h12',
  region: 'US',
  device_mode: 'light',
  device_motion: 'auto',
};

const EMPTY = {
  timezone: null,
  language: null,
  locale: null,
  hour_cycle: null,
  region: null,
  device_mode: null,
  device_motion: null,
};

const FILLED = {
  timezone: 'Europe/Berlin',
  language: 'es',
  locale: 'es-ES',
  hour_cycle: 'h23',
  region: 'DE',
  device_mode: 'light',
  device_motion: 'auto',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserFactsPatch', () => {
  it('fills every empty member and the device facts of an account that holds nothing', () => {
    expect(browserFactsPatch(EMPTY, FACTS)).toEqual(FACTS);
  });

  it('never overwrites a member the account holds, and sends no device fact that matches', () => {
    expect(browserFactsPatch(FILLED, FACTS)).toEqual({});
  });

  it('sends a device fact that differs from the account, alone', () => {
    expect(browserFactsPatch({ ...FILLED, device_mode: 'dark' }, FACTS)).toEqual({
      device_mode: 'light',
    });
    expect(browserFactsPatch({ ...FILLED, device_motion: 'reduce' }, FACTS)).toEqual({
      device_motion: 'auto',
    });
  });

  it('leaves out an unknown fact and a member the account does not carry', () => {
    expect(browserFactsPatch({ timezone: null, region: null }, { ...FACTS, region: '' })).toEqual({
      timezone: 'America/Chicago',
    });
    expect(browserFactsPatch({}, FACTS)).toEqual({});
    expect(browserFactsPatch(null, FACTS)).toEqual({});
  });
});

describe('the detected facts', () => {
  it('reads the zone, the locale and the clock from Intl, h11 as h12 and h24 as h23', async () => {
    vi.stubGlobal('Intl', {
      DateTimeFormat: class {
        constructor(...args) {
          this.options = args[1] || {};
        }
        resolvedOptions() {
          return {
            timeZone: 'America/Chicago',
            locale: 'en-US',
            hourCycle: this.options.hour ? 'h11' : undefined,
          };
        }
      },
    });
    vi.resetModules();
    const facts = await import('../../src/utils/browserFacts.js');
    expect(facts.detectedZone()).toBe('America/Chicago');
    expect(facts.detectedLocale()).toBe('en-US');
    expect(facts.detectedHourCycle()).toBe('h12');
  });

  it('reads the device mode and motion from the media queries', async () => {
    vi.stubGlobal('window', {
      matchMedia: query => ({ matches: query.includes('dark') || query.includes('reduce') }),
    });
    vi.resetModules();
    const facts = await import('../../src/utils/browserFacts.js');
    expect(facts.deviceMode()).toBe('dark');
    expect(facts.deviceMotion()).toBe('reduce');
  });

  it('answers empty and the light, full-motion defaults where the browser cannot say', async () => {
    vi.stubGlobal('Intl', {
      DateTimeFormat: class {
        constructor() {
          throw new Error('no Intl');
        }
      },
    });
    vi.stubGlobal('window', {});
    vi.resetModules();
    const facts = await import('../../src/utils/browserFacts.js');
    expect(facts.detectedZone()).toBe('');
    expect(facts.detectedLocale()).toBe('');
    expect(facts.detectedHourCycle()).toBe('');
    expect(facts.deviceMode()).toBe('light');
    expect(facts.deviceMotion()).toBe('auto');
  });
});
