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

const { deployChoiceOf, deployChoicesOf, localeChoicesOf } =
  await import('../../src/features/profile/components/PreferencesTab.jsx');

const ORIGIN = 'https://hw.example.com';

describe('deployChoiceOf', () => {
  it('answers local while the answer carries no target', () => {
    expect(deployChoiceOf(undefined)).toBe('local');
    expect(deployChoiceOf(null)).toBe('local');
    expect(deployChoiceOf({})).toBe('local');
    expect(deployChoiceOf({ deploy_target: '' })).toBe('local');
    expect(deployChoiceOf({ deploy_target: 7 })).toBe('local');
  });

  it('answers the target the answer carries', () => {
    expect(deployChoiceOf({ deploy_target: 'local' })).toBe('local');
    expect(deployChoiceOf({ deploy_target: ORIGIN })).toBe(ORIGIN);
  });
});

describe('deployChoicesOf', () => {
  it('offers local and this server, in that order', () => {
    expect(deployChoicesOf('local', ORIGIN)).toEqual(['local', ORIGIN]);
    expect(deployChoicesOf(ORIGIN, ORIGIN)).toEqual(['local', ORIGIN]);
  });

  it('keeps a stored target that is neither as a third choice', () => {
    expect(deployChoicesOf('https://other.example.com', ORIGIN)).toEqual([
      'local',
      ORIGIN,
      'https://other.example.com',
    ]);
  });
});

describe('localeChoicesOf', () => {
  it('offers the chosen, the detected and the UI languages once each, empties dropped', () => {
    expect(localeChoicesOf('en-GB', 'en-US', ['en', 'es'])).toEqual(['en-GB', 'en-US', 'en', 'es']);
    expect(localeChoicesOf('en', 'en', ['en', 'es'])).toEqual(['en', 'es']);
    expect(localeChoicesOf('', '', ['en'])).toEqual(['en']);
  });
});
