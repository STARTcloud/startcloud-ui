import { describe, expect, it } from 'vitest';

import { resolveActiveOrg } from '../../src/hooks/useSession.jsx';

const acme = { uuid: 'acme', name: 'Acme', primary: true };
const beta = { uuid: 'beta', name: 'Beta', primary: false };
const gamma = { uuid: 'gamma', name: 'Gamma', primary: false };

const suspended = org => ({ ...org, suspended: true });
const seatSuspended = org => ({ ...org, membershipSuspended: true });

describe('resolveActiveOrg', () => {
  it('keeps the stored uuid while it names a live membership', () => {
    expect(resolveActiveOrg([acme, beta], 'beta', false)).toBe('beta');
  });

  it('falls to the primary, then the first, for a stored uuid no membership carries', () => {
    expect(resolveActiveOrg([beta, acme], 'gone', false)).toBe('acme');
    expect(resolveActiveOrg([beta, gamma], null, false)).toBe('beta');
    expect(resolveActiveOrg([], 'gone', false)).toBe('');
  });

  it('never keeps a stored uuid whose organization or seat is suspended', () => {
    expect(resolveActiveOrg([acme, suspended(beta)], 'beta', false)).toBe('acme');
    expect(resolveActiveOrg([acme, seatSuspended(beta)], 'beta', false)).toBe('acme');
  });

  it('skips a suspended primary for the first live membership, and answers empty when none is live', () => {
    expect(resolveActiveOrg([suspended(acme), beta, gamma], null, false)).toBe('beta');
    expect(resolveActiveOrg([seatSuspended(acme), suspended(beta), gamma], 'acme', false)).toBe(
      'gamma'
    );
    expect(resolveActiveOrg([suspended(acme), seatSuspended(beta)], 'acme', false)).toBe('');
  });

  it('answers the empty uuid under All organizations unless the stored uuid names a live membership', () => {
    expect(resolveActiveOrg([acme, beta], null, true)).toBe('');
    expect(resolveActiveOrg([acme, beta], 'beta', true)).toBe('beta');
    expect(resolveActiveOrg([acme, suspended(beta)], 'beta', true)).toBe('');
  });
});
