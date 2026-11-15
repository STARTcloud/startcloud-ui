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

const { signInNoticesOf, signInNoticesPatch } =
  await import('../../src/features/profile/components/PreferencesTab.jsx');

describe('signInNoticesOf', () => {
  it('answers null for a record that carries no sign_in_notices', () => {
    expect(signInNoticesOf(undefined)).toBeNull();
    expect(signInNoticesOf({ language: 'en' })).toBeNull();
    expect(signInNoticesOf({ sign_in_notices: null })).toBeNull();
  });

  it('answers when, the channels in the drawn order and following from `default`', () => {
    const held = { sign_in_notices: { when: 'new', channels: ['inbox', 'email'], default: true } };
    expect(signInNoticesOf(held)).toEqual({
      when: 'new',
      channels: ['email', 'inbox'],
      following: true,
    });
    expect(signInNoticesOf({ sign_in_notices: { when: 'all', channels: ['push'] } })).toEqual({
      when: 'all',
      channels: ['push'],
      following: false,
    });
  });
});

describe('signInNoticesPatch', () => {
  const stored = { when: 'new', channels: ['email', 'inbox'] };

  it('sends `when` alone when only it differs from the record', () => {
    expect(signInNoticesPatch({ when: 'all', channels: ['email', 'inbox'] }, stored)).toEqual({
      sign_in_notices: { when: 'all' },
    });
  });

  it('sends `channels` alone, in the drawn order, when only they differ', () => {
    expect(signInNoticesPatch({ when: 'new', channels: ['push', 'email'] }, stored)).toEqual({
      sign_in_notices: { channels: ['email', 'push'] },
    });
  });

  it('sends both when both differ', () => {
    expect(signInNoticesPatch({ when: 'off', channels: [] }, stored)).toEqual({
      sign_in_notices: { when: 'off', channels: [] },
    });
  });

  it('answers null when neither differs, whatever the order of the channels', () => {
    expect(signInNoticesPatch({ when: 'new', channels: ['inbox', 'email'] }, stored)).toBeNull();
  });

  it('never sends `default`', () => {
    const patch = signInNoticesPatch({ when: 'all', channels: ['push'], default: true }, stored);
    expect(patch.sign_in_notices).not.toHaveProperty('default');
  });
});
