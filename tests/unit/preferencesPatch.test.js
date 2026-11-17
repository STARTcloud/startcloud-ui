import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/runtime.js', () => ({
  client: {},
  hubClient: {},
  rules: null,
  applyTheme: vi.fn(),
}));

vi.mock('../../src/features/integrations/index.js', () => ({
  HyperweaverServiceCard: () => null,
  hyperweaverServiceOf: () => null,
  integrationsShape: () => null,
}));

const { channelsPatchOf, noticesPatchOf, preferencesPatch, themeSwatchOf } =
  await import('../../src/features/profile/components/PreferencesTab.jsx');

const following = { when: 'new', channels: ['email', 'in_app'], following: true };
const chosen = { when: 'all', channels: ['email', 'push'], following: false };

describe('noticesPatchOf', () => {
  it('sends null for Site default over a chosen record and nothing over a following one', () => {
    expect(noticesPatchOf({ when: 'default', channels: [] }, chosen)).toEqual({
      sign_in_notices: null,
    });
    expect(noticesPatchOf({ when: 'default', channels: [] }, following)).toBeNull();
  });

  it('sends when and channels whole over a following record', () => {
    expect(noticesPatchOf({ when: 'new', channels: ['in_app', 'email'] }, following)).toEqual({
      sign_in_notices: { when: 'new', channels: ['email', 'in_app'] },
    });
  });

  it('sends what differs over a chosen record', () => {
    expect(noticesPatchOf({ when: 'off', channels: ['email', 'push'] }, chosen)).toEqual({
      sign_in_notices: { when: 'off' },
    });
    expect(noticesPatchOf({ when: 'all', channels: ['push', 'email'] }, chosen)).toBeNull();
  });
});

describe('channelsPatchOf', () => {
  it('answers the set in the drawn order while it differs, null while equal', () => {
    expect(channelsPatchOf(['email', 'in_app'], ['in_app'])).toEqual({
      ciba_channels: ['in_app', 'email'],
    });
    expect(channelsPatchOf(['email', 'in_app'], ['in_app', 'email'])).toBeNull();
  });
});

describe('preferencesPatch', () => {
  const preferences = {
    timezone: 'America/Chicago',
    locale: 'en-GB',
    hour_cycle: 'h23',
    region: 'US',
    ciba_channels: ['in_app'],
    ciba_user_code_set: false,
    sign_in_notices: { when: 'new', channels: ['email', 'in_app'], default: true },
  };
  const settings = {
    language: 'en',
    mode: 'dark',
    theme: '',
    motion: 'auto',
    timezone: 'America/Chicago',
    locale: 'en-GB',
    hour_cycle: 'h23',
    region: 'US',
    ciba_channels: ['in_app'],
    notices: { when: 'default', channels: ['email', 'in_app'] },
  };

  it('is empty while nothing differs on the person\'s own record', () => {
    expect(
      preferencesPatch({ settings, preferences, pin: '', clearPin: false, own: true })
    ).toEqual({});
  });

  it('carries each member that differs and the PIN while typed or cleared', () => {
    const changed = {
      ...settings,
      hour_cycle: 'h12',
      region: '',
      ciba_channels: ['in_app', 'email'],
      notices: { when: 'all', channels: ['email', 'in_app'] },
    };
    expect(
      preferencesPatch({ settings: changed, preferences, pin: '1234', clearPin: false, own: true })
    ).toEqual({
      hour_cycle: 'h12',
      region: null,
      ciba_channels: ['in_app', 'email'],
      sign_in_notices: { when: 'all', channels: ['email', 'in_app'] },
      ciba_user_code: '1234',
    });
    expect(
      preferencesPatch({ settings, preferences, pin: '', clearPin: true, own: true }).ciba_user_code
    ).toBeNull();
  });

  it('carries the language, mode, theme and motion of another person\'s record and no PIN', () => {
    expect(
      preferencesPatch({ settings, preferences, pin: '1234', clearPin: false, own: false })
    ).toEqual({ language: 'en', mode: 'dark', theme: null, motion: null });
  });

  it('leaves the channels and the notices out while the record carries neither', () => {
    const bare = { timezone: 'America/Chicago' };
    expect(
      preferencesPatch({
        settings: { ...settings, notices: null },
        preferences: bare,
        pin: '',
        clearPin: false,
        own: true,
      })
    ).toEqual({ locale: 'en-GB', hour_cycle: 'h23', region: 'US' });
  });
});

describe('themeSwatchOf', () => {
  const theme = {
    name: 'lcars',
    primary: '#4d80f0',
    surfaces: {
      dark: {
        'body-bg': '#000000',
        'tertiary-bg': '#111111',
        'border-color': '#2c2c33',
        'secondary-color': '#8f97b0',
      },
    },
  };

  it('answers the custom properties of the mode in force', () => {
    expect(themeSwatchOf(theme, 'dark')).toEqual({
      '--pref-accent': '#4d80f0',
      '--pref-page': '#000000',
      '--pref-bar': '#111111',
      '--pref-line': '#2c2c33',
      '--pref-text': '#8f97b0',
    });
  });

  it('answers null while the row lacks the accent or the mode\'s surfaces', () => {
    expect(themeSwatchOf(theme, 'light')).toBeNull();
    expect(themeSwatchOf({ name: 'shi' }, 'dark')).toBeNull();
  });
});
