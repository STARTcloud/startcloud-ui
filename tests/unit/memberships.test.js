import { describe, expect, it } from 'vitest';

import { profileMemberships } from '../../src/lib/backendSession.js';
import { accountMembership, accountMemberships } from '../../src/lib/cookieSession.js';
import { isManager, routeNameOf } from '../../src/utils/membership.js';

const ACME = '0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11';

const issuerRow = {
  uuid: ACME,
  name: 'Acme',
  roles: ['owner'],
  primary: true,
  personal: false,
  logo_url: 'https://acme.example.com/logo.png',
  email_hash: 'abc123',
};

const boxVaultRow = { name: 'acme', role: 'admin', is_primary: true };

describe('accountMembership', () => {
  it('reads the identity provider shape, the uuid as the uuid', () => {
    expect(accountMembership(issuerRow)).toEqual({
      uuid: ACME,
      name: 'Acme',
      roles: ['OWNER'],
      primary: true,
      personal: false,
      logo: 'https://acme.example.com/logo.png',
      emailHash: 'abc123',
    });
  });

  it('draws no logo that is not an https URL and no hash that is not a string', () => {
    const row = accountMembership({ ...issuerRow, logo_url: 'http://acme/logo', email_hash: 7 });
    expect(row.logo).toBe('');
    expect(row.emailHash).toBe('');
  });
});

describe('accountMemberships', () => {
  it('maps every row of the profile and answers none for no profile', () => {
    expect(accountMemberships({ organizations: [issuerRow] })).toEqual([
      accountMembership(issuerRow),
    ]);
    expect(accountMemberships(null)).toEqual([]);
    expect(accountMemberships({ organizations: 'acme' })).toEqual([]);
  });
});

describe('profileMemberships', () => {
  it('reads a row that carries a uuid as the identity provider shape', () => {
    expect(profileMemberships({ organizations: [issuerRow] })).toEqual([
      accountMembership(issuerRow),
    ]);
  });

  it('reads a row without a uuid as BoxVault answers it, the name as the uuid', () => {
    expect(profileMemberships({ organizations: [boxVaultRow] })).toEqual([
      { uuid: 'acme', name: 'acme', roles: ['ADMIN'], primary: true },
    ]);
  });

  it('answers no roles for a BoxVault row without a role and none for no profile', () => {
    expect(profileMemberships({ organizations: [{ name: 'acme' }] })).toEqual([
      { uuid: 'acme', name: 'acme', roles: [], primary: false },
    ]);
    expect(profileMemberships(undefined)).toEqual([]);
  });
});

describe('routeNameOf', () => {
  it('answers the name of the membership that carries the uuid in both shapes', () => {
    expect(routeNameOf(profileMemberships({ organizations: [issuerRow] }), ACME)).toBe('Acme');
    expect(routeNameOf(profileMemberships({ organizations: [boxVaultRow] }), 'acme')).toBe('acme');
  });

  it('answers the empty name for All organizations and for a uuid no membership carries', () => {
    const memberships = profileMemberships({ organizations: [issuerRow] });
    expect(routeNameOf(memberships, '')).toBe('');
    expect(routeNameOf(memberships, 'Acme')).toBe('');
  });

  it('lets an owner found by uuid read as a manager by name', () => {
    const memberships = profileMemberships({ organizations: [issuerRow] });
    expect(isManager(memberships, routeNameOf(memberships, ACME))).toBe(true);
    expect(isManager(memberships, ACME)).toBe(false);
  });
});
