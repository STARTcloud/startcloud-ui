import { describe, expect, it, vi } from 'vitest';

import {
  BACKEND_DESTINATION,
  IDP_DESTINATION,
} from '../../src/features/certs/utils/destinations.js';
import {
  VAULT,
  contentOf,
  copyOf,
  pendingWrites,
  presenceOf,
  stableIdOf,
  syncMapOf,
  syncsRow,
  unionOf,
} from '../../src/features/certs/utils/stores.js';

vi.mock('../../src/lib/runtime.js', () => ({ client: {}, hubClient: {} }));

const record = {
  id: 'rec-1',
  kind: 'password',
  name: 'admin',
  profile: '',
  secret: { password: 'one' },
  extra: {},
  tags: [],
  notes: '',
  public_der_b64: null,
  private_der_b64: null,
  organization: '',
  updated_at: '2026-10-10T09:00:00.000Z',
};

const wireOf = (id, held, members = {}) => ({
  id,
  organization: '',
  kind: held.kind,
  name: held.name,
  profile: held.profile,
  subject: '',
  not_after: '',
  published: true,
  is_public: false,
  guest_access: false,
  created_by: 'mark',
  updated_at: held.updated_at,
  record: held,
  ...members,
});

describe('stableIdOf', () => {
  it("reads the record's id first and the row's own id without one", () => {
    expect(stableIdOf({ id: 'row-1', record: { id: 'rec-1' } })).toBe('rec-1');
    expect(stableIdOf({ id: 'row-2', record: {} })).toBe('row-2');
    expect(stableIdOf({ id: 'row-3' })).toBe('row-3');
  });
});

describe('contentOf', () => {
  it('leaves out the store members, the access words and the sync map', () => {
    expect(
      contentOf({ ...record, remote_id: 'row-1', published: true, sync: { vault: false } })
    ).toBe(contentOf(record));
    expect(contentOf({ ...record, secret: { password: 'two' } })).not.toBe(contentOf(record));
  });
});

describe('unionOf and presenceOf', () => {
  const host = { key: 'host-1', copies: [copyOf({ row: wireOf('sec-1', record) })] };
  const vault = { key: VAULT, copies: [copyOf({ record })] };

  it('merges the copies of one secret into one row keyed by its stable id', () => {
    const rows = unionOf([host, vault]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('rec-1');
    expect(Object.keys(rows[0].held).sort()).toEqual(['host-1', VAULT]);
    expect(presenceOf(rows[0], 'host-1')).toBe('equal');
    expect(presenceOf(rows[0], VAULT)).toBe('equal');
    expect(presenceOf(rows[0], 'hyperweaver-server')).toBe('none');
  });

  it('reads an older copy as behind the newest', () => {
    const newer = {
      ...record,
      secret: { password: 'two' },
      updated_at: '2026-10-12T09:00:00.000Z',
    };
    const rows = unionOf([host, { key: VAULT, copies: [copyOf({ record: newer })] }]);
    expect(presenceOf(rows[0], VAULT)).toBe('equal');
    expect(presenceOf(rows[0], 'host-1')).toBe('behind');
  });

  it("names the organization a copy names and keeps a remote row's subject", () => {
    const backend = {
      key: 'hyperweaver-server',
      copies: [copyOf({ row: wireOf('row-9', record, { organization: 'acme', subject: 'CN=x' }) })],
    };
    const [row] = unionOf([vault, backend]);
    expect(row.organization).toBe('acme');
    expect(row.subject).toBe('CN=x');
  });
});

describe('syncMapOf and syncsRow', () => {
  it("reads the Vault copy's map first, then a remote copy's", () => {
    const mapped = { ...record, sync: { 'host-1': false } };
    const [row] = unionOf([
      {
        key: 'host-1',
        copies: [copyOf({ row: wireOf('sec-1', { ...record, sync: { idp: true } }) })],
      },
      { key: VAULT, copies: [copyOf({ record: mapped })] },
    ]);
    expect(syncMapOf(row)).toEqual({ 'host-1': false });
  });

  it("lets the row's own map win over the preference, an absent key reading on", () => {
    const [row] = unionOf([
      { key: VAULT, copies: [copyOf({ record: { ...record, sync: { idp: true } } })] },
    ]);
    expect(syncsRow(row, 'idp', { idp: false })).toBe(true);
    expect(syncsRow(row, 'hyperweaver-server', { 'hyperweaver-server': false })).toBe(false);
    expect(syncsRow(row, 'host-1', {})).toBe(true);
  });
});

describe('pendingWrites', () => {
  it('names every store the row syncs to and does not hold equal', () => {
    const [row] = unionOf([
      { key: VAULT, copies: [copyOf({ record: { ...record, sync: { idp: false } } })] },
    ]);
    expect(pendingWrites([row], [VAULT, 'host-1', 'idp'], {}).map(entry => entry.key)).toEqual([
      'host-1',
    ]);
  });
});

describe('the destinations', () => {
  const row = wireOf('row-7', { ...record, secret: null }, { organization: 'acme' });

  it('links the backend by remote_id and the identity provider by idp_id alone', () => {
    expect(BACKEND_DESTINATION.idOf({ remote_id: 'row-1' })).toBe('row-1');
    expect(IDP_DESTINATION.idOf({ remote_id: 'row-1' })).toBeNull();
    expect(IDP_DESTINATION.link({ ...record, remote_id: 'row-1' }, { id: 'idp-1' })).toMatchObject({
      remote_id: 'row-1',
      idp_id: 'idp-1',
    });
  });

  it("keeps the record's backend members and secret on an identity provider pull", () => {
    const held = { ...record, remote_id: 'row-1', organization: 'acme', origin: 'shared' };
    expect(IDP_DESTINATION.merged(row, held)).toMatchObject({
      id: 'rec-1',
      remote_id: 'row-1',
      idp_id: 'row-7',
      secret: { password: 'one' },
    });
    expect(IDP_DESTINATION.merged(row, null)).toMatchObject({ remote_id: null, idp_id: 'row-7' });
  });

  it('keeps the held id, origin and secret on a backend pull', () => {
    const held = { ...record, id: 'rec-local', origin: 'local', idp_id: 'idp-3' };
    expect(BACKEND_DESTINATION.merged(row, held)).toMatchObject({
      id: 'rec-local',
      origin: 'local',
      remote_id: 'row-7',
      idp_id: 'idp-3',
      secret: { password: 'one' },
    });
  });
});
