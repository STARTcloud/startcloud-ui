import { describe, expect, it } from 'vitest';

import {
  DETACHED,
  linkedRecord,
  newerThan,
  ownMembersOf,
  patchOfVerbs,
  recordOf,
  rowNotAfter,
  rowOf,
} from '../../src/features/certs/utils/sync.js';

const record = {
  id: 'rec-1',
  kind: 'certificate',
  name: 'Leaf',
  organization: '',
  published: true,
  is_public: false,
  guest_access: true,
  public_der_b64: 'AQ==',
  private_der_b64: 'Ag==',
};

describe('rowOf', () => {
  it('carries the organization, the kind, the name, the profile, the three words and the record', () => {
    expect(rowOf(record, 'acme')).toEqual({
      organization: 'acme',
      kind: 'certificate',
      name: 'Leaf',
      profile: '',
      published: true,
      is_public: false,
      guest_access: true,
      record: { ...record, secret: null },
    });
  });

  it('carries a secret record whole while private and drops its secret while public', () => {
    const secret = {
      ...record,
      kind: 'api_key',
      profile: 'github',
      public_der_b64: null,
      private_der_b64: null,
      secret: { key: 'ghp', url: 'https://github.com' },
      extra: { scope: 'repo' },
    };
    expect(rowOf(secret, 'acme')).toMatchObject({
      kind: 'api_key',
      profile: 'github',
      record: { secret: { key: 'ghp', url: 'https://github.com' }, extra: { scope: 'repo' } },
    });
    expect(rowOf({ ...secret, is_public: true }, 'acme').record.secret).toBeNull();
  });

  it("keeps the record's own organization over the one given", () => {
    expect(rowOf({ ...record, organization: 'prominic' }, 'acme').organization).toBe('prominic');
  });

  it('drops the private half while the row is public and reads missing words as false', () => {
    const row = rowOf({ ...record, is_public: true, published: undefined }, 'acme');
    expect(row.record.private_der_b64).toBeNull();
    expect(row.record.public_der_b64).toBe('AQ==');
    expect(row.published).toBe(false);
  });
});

describe('recordOf', () => {
  const row = {
    id: 'row-1',
    organization: 'acme',
    kind: 'authority',
    name: 'Root',
    published: true,
    is_public: true,
    guest_access: false,
    created_by: 'system',
    updated_at: '2026-10-11T09:00:00.000Z',
    record: { id: 'rec-9', kind: 'certificate', name: 'Held', notes: 'kept', tags: ['a'] },
  };

  it("lays the row's members over its record, shared and keyed by the row's id", () => {
    expect(recordOf(row)).toMatchObject({
      id: 'rec-9',
      kind: 'authority',
      name: 'Root',
      profile: '',
      notes: 'kept',
      tags: ['a'],
      updated_at: row.updated_at,
      origin: 'shared',
      remote_id: 'row-1',
      organization: 'acme',
      created_by: 'system',
      synced_at: row.updated_at,
      published: true,
      is_public: true,
      guest_access: false,
    });
  });

  it('makes a record of its kind with no facts for a row that carries none', () => {
    const made = recordOf({ id: 'row-2', kind: 'key', name: 'K', organization: 'acme' });
    expect(made).toMatchObject({
      kind: 'key',
      name: 'K',
      facts: null,
      origin: 'shared',
      remote_id: 'row-2',
      synced_at: '',
      published: false,
    });
    expect(typeof made.id).toBe('string');
    expect(made.id).not.toBe('');
    expect(recordOf({ id: 'row-3', record: 'text' }).kind).toBe('certificate');
  });

  it("keeps a secret row's profile and secret on the record", () => {
    const made = recordOf({
      id: 'row-4',
      kind: 'api_key',
      name: 'Portal',
      profile: 'hcl_portal',
      record: { kind: 'api_key', secret: { key: 'k' }, extra: { a: '1' } },
    });
    expect(made).toMatchObject({
      kind: 'api_key',
      profile: 'hcl_portal',
      secret: { key: 'k' },
      extra: { a: '1' },
      remote_id: 'row-4',
    });
  });
});

describe('DETACHED and newerThan', () => {
  it('clears every member of the row and reads the record as local again', () => {
    expect({ ...record, remote_id: 'row-1', organization: 'acme', ...DETACHED }).toMatchObject({
      origin: 'local',
      remote_id: null,
      organization: '',
      created_by: '',
      synced_at: null,
      published: false,
      is_public: false,
      guest_access: false,
    });
  });

  it('answers true while nothing is held or the row moved after the record', () => {
    expect(newerThan({ updated_at: '2026-01-02T00:00:00Z' }, null)).toBe(true);
    expect(
      newerThan({ updated_at: '2026-01-02T00:00:00Z' }, { updated_at: '2026-01-01T00:00:00Z' })
    ).toBe(true);
    expect(
      newerThan({ updated_at: '2026-01-01T00:00:00Z' }, { updated_at: '2026-01-01T00:00:00Z' })
    ).toBe(false);
    expect(newerThan({}, { updated_at: '2026-01-01T00:00:00Z' })).toBe(false);
    expect(newerThan({ updated_at: '2026-01-01T00:00:00Z' }, {})).toBe(true);
  });
});

describe('linkedRecord and ownMembersOf', () => {
  it('links the record to the answered row, keeping its own members where the answer omits one', () => {
    expect(
      linkedRecord({ ...record, created_by: 'mark' }, { id: 'row-5', updated_at: 'u' }, 'acme')
    ).toMatchObject({
      remote_id: 'row-5',
      organization: 'acme',
      created_by: 'mark',
      synced_at: 'u',
    });
  });

  it("reads every member of the backend's row, an absent one as detached", () => {
    expect(ownMembersOf({ remote_id: 'row-1', organization: 'acme' })).toEqual({
      ...DETACHED,
      remote_id: 'row-1',
      organization: 'acme',
    });
  });
});

describe('rowNotAfter', () => {
  it("reads the row's own end first, then the record's", () => {
    expect(rowNotAfter({ not_after: 'a', record: { facts: { not_after: 'b' } } })).toBe('a');
    expect(rowNotAfter({ not_after: '', record: { facts: { not_after: 'b' } } })).toBe('b');
    expect(
      rowNotAfter({ record: { history: [{ not_after: 'c', current: true }], facts: null } })
    ).toBe('c');
    expect(rowNotAfter({})).toBe('');
  });
});

describe('patchOfVerbs', () => {
  it('folds the verbs in order into the words a PUT carries', () => {
    expect(patchOfVerbs(['make_private', 'deny_guests'])).toEqual({
      is_public: false,
      guest_access: false,
    });
    expect(patchOfVerbs(['make_private', 'allow_guests'])).toEqual({
      is_public: false,
      guest_access: true,
    });
    expect(patchOfVerbs(['deny_guests', 'make_public'])).toEqual({
      guest_access: false,
      is_public: true,
    });
    expect(patchOfVerbs(['publish'])).toEqual({ published: true });
    expect(patchOfVerbs(['unpublish'])).toEqual({ published: false });
    expect(patchOfVerbs(['deprecate'])).toEqual({});
    expect(patchOfVerbs([])).toEqual({});
  });
});
