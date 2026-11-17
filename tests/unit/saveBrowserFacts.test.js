import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));

const apiOf = (preferences, geo = { country_code: 'us' }) => ({
  read: vi.fn(() => Promise.resolve(preferences)),
  save: vi.fn(() => Promise.resolve({})),
  geo: vi.fn(() => Promise.resolve(geo)),
});

beforeEach(() => {
  vi.stubGlobal('Intl', {
    DateTimeFormat: class {
      constructor(...args) {
        this.options = args[1] || {};
      }
      resolvedOptions() {
        return {
          timeZone: 'America/Chicago',
          locale: 'en-US',
          hourCycle: this.options.hour ? 'h12' : undefined,
        };
      }
    },
  });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const load = () => import('../../src/hooks/useBrowserFacts.js');

describe('saveBrowserFacts', () => {
  it('reads the preferences, asks the country while region is null and sends one patch of the empty members', async () => {
    const { saveBrowserFacts } = await load();
    const api = apiOf({
      timezone: null,
      language: null,
      locale: null,
      hour_cycle: null,
      region: null,
      device_mode: 'light',
      device_motion: 'auto',
    });
    const patch = await saveBrowserFacts(api, 'en');
    expect(api.read).toHaveBeenCalledTimes(1);
    expect(api.geo).toHaveBeenCalledTimes(1);
    expect(patch).toEqual({
      timezone: 'America/Chicago',
      language: 'en',
      locale: 'en-US',
      hour_cycle: 'h12',
      region: 'US',
    });
    expect(api.save).toHaveBeenCalledWith(patch);
    expect(api.save).toHaveBeenCalledTimes(1);
  });

  it('asks no country while region is held, and sends nothing while nothing is yielded', async () => {
    const { saveBrowserFacts } = await load();
    const api = apiOf({
      timezone: 'Europe/Berlin',
      language: 'es',
      locale: 'es-ES',
      hour_cycle: 'h23',
      region: 'DE',
      device_mode: 'light',
      device_motion: 'auto',
    });
    expect(await saveBrowserFacts(api, 'en')).toBeNull();
    expect(api.geo).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it('sends the device facts that differ and leaves region out while the country cannot be read', async () => {
    const { saveBrowserFacts } = await load();
    const api = apiOf(
      {
        timezone: 'Europe/Berlin',
        language: 'es',
        locale: 'es-ES',
        hour_cycle: 'h23',
        region: null,
        device_mode: 'dark',
        device_motion: 'reduce',
      },
      null
    );
    api.geo = vi.fn(() => Promise.reject(new Error('down')));
    expect(await saveBrowserFacts(api, 'en')).toEqual({
      device_mode: 'light',
      device_motion: 'auto',
    });
  });
});
