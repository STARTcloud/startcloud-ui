import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THRESHOLD_DAYS,
  KINDS,
  algorithmOf,
  currentOf,
  derOf,
  historyEntry,
  holdsDer,
  issuerOf,
  kindOf,
  matchesRecord,
  nameOf,
  newId,
  newRecord,
  notAfterOf,
  recordPath,
  recordStatus,
  relationships,
  statusOf,
  stemOf,
} from '../../src/features/certs/utils/records.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-18T12:00:00Z');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const at = days => new Date(NOW + days * DAY_MS).toISOString();

describe('statusOf', () => {
  it('reads expired past the end, expiring within the threshold and valid beyond it', () => {
    expect(statusOf(at(-1), NOW)).toBe('expired');
    expect(statusOf(at(0), NOW)).toBe('expired');
    expect(statusOf(at(DEFAULT_THRESHOLD_DAYS), NOW)).toBe('expiring');
    expect(statusOf(at(DEFAULT_THRESHOLD_DAYS + 1), NOW)).toBe('valid');
    expect(statusOf(at(5), NOW, 3)).toBe('valid');
    expect(statusOf(at(2), NOW, 3)).toBe('expiring');
  });

  it('answers nothing for a thing with no end', () => {
    expect(statusOf('', NOW)).toBe('');
    expect(statusOf(undefined, NOW)).toBe('');
    expect(statusOf('never', NOW)).toBe('');
  });
});

describe('currentOf and notAfterOf', () => {
  const history = [
    { version: 1, not_after: at(10), current: false },
    { version: 2, not_after: at(400), current: true },
    { version: 3, not_after: at(700), current: false },
  ];

  it('answers the entry marked current, else the last, else null', () => {
    expect(currentOf({ history }).version).toBe(2);
    expect(
      currentOf({ history: history.map(entry => ({ ...entry, current: false })) }).version
    ).toBe(3);
    expect(currentOf({ history: [] })).toBeNull();
    expect(currentOf({})).toBeNull();
  });

  it('reads the end from the current version while there is a history, from the facts otherwise', () => {
    expect(notAfterOf({ history, facts: { not_after: at(1) } })).toBe(at(400));
    expect(notAfterOf({ history: [], facts: { not_after: at(1) } })).toBe(at(1));
    expect(notAfterOf({ history: [], facts: null })).toBe('');
    expect(recordStatus({ history, facts: null }, NOW)).toBe('valid');
    expect(recordStatus({ history: [], facts: { not_after: at(1) } }, NOW)).toBe('expiring');
    expect(recordStatus({ history: [], facts: null }, NOW)).toBe('');
  });
});

describe('kindOf and derOf', () => {
  it("answers the engine's word for every kind, a key without its private half a public key", () => {
    expect(kindOf({ kind: 'certificate' })).toBe('certificate');
    expect(kindOf({ kind: 'authority' })).toBe('ca');
    expect(kindOf({ kind: 'request' })).toBe('csr');
    expect(kindOf({ kind: 'key', private_der_b64: 'AQ==' })).toBe('key');
    expect(kindOf({ kind: 'key', private_der_b64: null })).toBe('public_key');
    expect(kindOf({ kind: 'ssh_certificate' })).toBe('ssh_certificate');
    expect(kindOf({ kind: 'template' })).toBe('template');
  });

  it('hands the private half first, the public half otherwise, nothing for a template', () => {
    expect(derOf({ private_der_b64: 'AQ==', public_der_b64: 'Ag==' })).toBe('AQ==');
    expect(derOf({ private_der_b64: null, public_der_b64: 'Ag==' })).toBe('Ag==');
    expect(derOf({ private_der_b64: null, public_der_b64: null })).toBe('');
  });
});

describe('algorithmOf and issuerOf', () => {
  it('names the algorithm with its bits or curve', () => {
    expect(algorithmOf({ facts: { algorithm: 'RSA', bits: 2048 } })).toBe('RSA 2048');
    expect(algorithmOf({ facts: { algorithm: 'EC', bits: 256, curve: 'P-256' } })).toBe('EC P-256');
    expect(algorithmOf({ facts: { algorithm: 'EC', bits: 384 } })).toBe('EC 384');
    expect(algorithmOf({ facts: { algorithm: 'Ed25519' } })).toBe('Ed25519');
    expect(algorithmOf({ facts: null })).toBe('');
    expect(algorithmOf({})).toBe('');
  });

  it('names the issuer by its common name, else the whole name, else nothing', () => {
    expect(issuerOf({ facts: { issuer: { CN: 'Root' }, issuer_dn: 'CN=Root,O=Acme' } })).toBe(
      'Root'
    );
    expect(issuerOf({ facts: { issuer: {}, issuer_dn: 'CN=Root,O=Acme' } })).toBe('CN=Root,O=Acme');
    expect(issuerOf({ facts: null })).toBe('');
  });
});

describe('relationships', () => {
  const key = { id: 'key', kind: 'key', links: {} };
  const root = { id: 'root', kind: 'authority', links: {} };
  const request = { id: 'csr', kind: 'request', links: { key_id: 'key' } };
  const leaf = {
    id: 'leaf',
    kind: 'certificate',
    links: { key_id: 'key', issuer_id: 'root', request_id: 'csr' },
  };
  const records = [key, root, request, leaf];

  it('answers the records the links name and the records whose links name it', () => {
    expect(relationships(leaf, records)).toEqual({
      key,
      issuer: root,
      request,
      issued: [],
      signedWith: [],
    });
    expect(relationships(root, records).issued).toEqual([leaf]);
    expect(relationships(key, records).signedWith).toEqual([request, leaf]);
  });

  it('answers null for a link no record carries and for a record without links', () => {
    expect(relationships({ id: 'x', links: { key_id: 'gone' } }, records).key).toBeNull();
    expect(relationships({ id: 'x' }, records)).toEqual({
      key: null,
      issuer: null,
      request: null,
      issued: [],
      signedWith: [],
    });
  });
});

describe('nameOf, stemOf and recordPath', () => {
  it('draws the name, else the common name, else the subject, else the id', () => {
    expect(nameOf({ id: 'a', name: 'Own', facts: { subject: { CN: 'cn' } } })).toBe('Own');
    expect(nameOf({ id: 'a', name: '', facts: { subject: { CN: 'cn' }, subject_dn: 'dn' } })).toBe(
      'cn'
    );
    expect(nameOf({ id: 'a', name: '', facts: { subject: {}, subject_dn: 'dn' } })).toBe('dn');
    expect(nameOf({ id: 'a', name: '', facts: null })).toBe('a');
  });

  it('stems the name to letters, digits, dots, dashes and underscores', () => {
    expect(stemOf({ name: 'www.example.com' })).toBe('www.example.com');
    expect(stemOf({ name: 'Dana leaf (2026)' })).toBe('Dana_leaf_2026_');
    expect(stemOf({ name: 'a/b\\c' })).toBe('a_b_c');
  });

  it('routes a record by its encoded id', () => {
    expect(recordPath({ id: 'rec-1' })).toBe('/certs/rec-1');
    expect(recordPath({ id: 'a b' })).toBe('/certs/a%20b');
  });
});

describe('newId and newRecord', () => {
  it('makes a version 4 UUID with the variant bits set, never the same one twice', () => {
    const first = newId();
    expect(first).toMatch(UUID);
    expect(newId()).not.toBe(first);
  });

  it('lays the given members over every member of the shape, the instants now', () => {
    const before = Date.now();
    const record = newRecord({ kind: 'key', name: 'k', private_der_b64: 'AQ==' });
    expect(record).toMatchObject({
      kind: 'key',
      name: 'k',
      tags: [],
      notes: '',
      facts: null,
      links: { key_id: null, issuer_id: null, request_id: null, chain_ids: [] },
      history: [],
      public_der_b64: null,
      private_der_b64: 'AQ==',
      template: null,
      origin: 'local',
      remote_id: null,
      organization: '',
      created_by: '',
      synced_at: null,
      published: false,
      is_public: false,
      guest_access: false,
    });
    expect(record.id).toMatch(UUID);
    expect(Date.parse(record.created_at)).toBeGreaterThanOrEqual(before);
    expect(record.updated_at).toBe(record.created_at);
    expect(newRecord({}).kind).toBe('certificate');
  });

  it('lists the six kinds', () => {
    expect(KINDS).toEqual([
      'certificate',
      'authority',
      'request',
      'key',
      'ssh_certificate',
      'template',
    ]);
  });
});

describe('historyEntry and holdsDer', () => {
  it('numbers the next version over the history held and marks it current', () => {
    expect(historyEntry([], { not_before: 'b', not_after: 'a' }, 'AQ==')).toEqual({
      version: 1,
      der_b64: 'AQ==',
      not_before: 'b',
      not_after: 'a',
      current: true,
    });
    expect(historyEntry([{}, {}], null, 'AQ==')).toMatchObject({
      version: 3,
      not_before: '',
      not_after: '',
    });
  });

  it('finds a DER under either half and never an empty one', () => {
    const records = [
      { public_der_b64: 'AQ==', private_der_b64: null },
      { public_der_b64: null, private_der_b64: 'Ag==' },
    ];
    expect(holdsDer(records, 'AQ==')).toBe(true);
    expect(holdsDer(records, 'Ag==')).toBe(true);
    expect(holdsDer(records, 'Aw==')).toBe(false);
    expect(holdsDer(records, '')).toBe(false);
    expect(holdsDer([{ public_der_b64: null, private_der_b64: null }], null)).toBe(false);
  });
});

describe('matchesRecord', () => {
  const record = {
    name: 'Leaf',
    facts: {
      subject_dn: 'CN=www.example.com',
      issuer_dn: 'CN=Root',
      serial_hex: '0abc',
      fingerprint_sha256: 'ff00',
      public_key_sha256: 'ee11',
    },
    tags: ['prod', 'web'],
    notes: 'Renew in May',
  };

  it('matches the name, the names, the serial, the fingerprints, the tags and the notes', () => {
    ['leaf', 'example', 'root', '0abc', 'ff00', 'ee11', 'web', 'may'].forEach(needle => {
      expect(matchesRecord(record, needle)).toBe(true);
    });
    expect(matchesRecord(record, 'nothing')).toBe(false);
  });

  it('matches a bare record by nothing but its name', () => {
    expect(matchesRecord({ name: 'Bare' }, 'bare')).toBe(true);
    expect(matchesRecord({ name: 'Bare' }, 'x')).toBe(false);
  });
});
