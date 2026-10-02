import { describe, expect, it } from 'vitest';

import { hasNotificationsScope } from '../../src/features/notifications/api/inbox.js';

describe('hasNotificationsScope', () => {
  it('finds the read scope in a space-separated string', () => {
    expect(hasNotificationsScope({ scope: 'openid profile notifications:read' })).toBe(true);
  });

  it('finds the read scope in an array', () => {
    expect(hasNotificationsScope({ scope: ['openid', 'notifications:read'] })).toBe(true);
  });

  it('refuses the bare word and the write scope', () => {
    expect(hasNotificationsScope({ scope: 'openid notifications' })).toBe(false);
    expect(hasNotificationsScope({ scope: 'openid notifications:write' })).toBe(false);
  });

  it('refuses no claims and no scope', () => {
    expect(hasNotificationsScope(null)).toBe(false);
    expect(hasNotificationsScope({})).toBe(false);
  });
});
