import { describe, expect, it } from 'vitest';

import { canManageRecord } from '../../src/utils/permissions.js';

const ACME = '0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11';

const membership = roles => ({ uuid: ACME, name: 'acme', roles, primary: true });

const personOf = (username, roles, organizations) => ({ id: 1, username, roles, organizations });

const own = { created_by: 'dana' };
const other = { created_by: 'system' };

describe('canManageRecord', () => {
  it('lets the person who created the record change it', () => {
    const member = personOf('dana', ['ROLE_USER'], [membership(['MEMBER'])]);
    expect(canManageRecord(member, 'acme', own)).toBe(true);
    expect(canManageRecord(member, 'acme', other)).toBe(false);
  });

  it('lets an owner or admin of the organization change any record of it', () => {
    expect(canManageRecord(personOf('x', [], [membership(['ADMIN'])]), 'acme', other)).toBe(true);
    expect(canManageRecord(personOf('x', [], [membership(['OWNER'])]), 'acme', other)).toBe(true);
    expect(canManageRecord(personOf('x', [], [membership(['owner'])]), 'acme', other)).toBe(true);
    expect(canManageRecord(personOf('x', [], [membership(['ADMIN'])]), 'prominic', other)).toBe(
      false
    );
  });

  it('never lets a guest change a record, not even their own', () => {
    const guest = personOf('dana', ['ROLE_USER'], [membership(['GUEST'])]);
    expect(canManageRecord(guest, 'acme', own)).toBe(false);
    expect(canManageRecord(guest, 'acme', other)).toBe(false);
  });

  it('never lets a global admin change a record by that role alone', () => {
    const admin = personOf('root', ['ROLE_ADMIN'], []);
    expect(canManageRecord(admin, 'acme', other)).toBe(false);
    expect(canManageRecord(admin, 'acme', own)).toBe(false);
    const adminMember = personOf('root', ['ROLE_ADMIN'], [membership(['MEMBER'])]);
    expect(canManageRecord(adminMember, 'acme', other)).toBe(false);
    expect(canManageRecord({ ...admin, authorities: ['ROLE_ADMIN'] }, 'acme', other)).toBe(false);
  });

  it('answers false for no person, no record and a record that names no creator', () => {
    const member = personOf('dana', [], [membership(['MEMBER'])]);
    expect(canManageRecord(null, 'acme', own)).toBe(false);
    expect(canManageRecord(member, 'acme', null)).toBe(false);
    expect(canManageRecord(member, 'acme', { created_by: '' })).toBe(false);
    expect(canManageRecord(personOf('x', [], [membership(['ADMIN'])]), 'acme', null)).toBe(true);
  });
});
