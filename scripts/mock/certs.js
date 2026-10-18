import { Buffer } from 'buffer';
import { createHash, randomUUID } from 'crypto';

import { ago, denied, missing, now, ok } from './kit.js';
import { membershipIn, organizations } from './people.js';
import { broadcast } from './stream.js';

const TOPIC = 'certs';
const DAY_MINUTES = 60 * 24;
const MANAGERS = ['owner', 'admin'];
const NOT_MEMBER = 'Only a member of the organization may share a certificate there.';
const NOT_OWNER = 'Only the person who shared it or a manager of the organization may change it.';
const NO_ROW = 'No such certificate.';

const CA_DER =
  'MIIBvTCCAWOgAwIBAgIUKW/gvsqif4ajk8Xb310fBqwTgT0wCgYIKoZIzj0EAwIwLDEYMBYGA1UEAwwPRXhhbXBsZSBSb290IENBMRAwDgYDVQQKDAdFeGFtcGxlMB4XDTI2MTAxNzExNTk0NloXDTM2MTAxNDExNTk0NlowLDEYMBYGA1UEAwwPRXhhbXBsZSBSb290IENBMRAwDgYDVQQKDAdFeGFtcGxlMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEbtFwPoRM9HkiT8DimXuCBxH6ON8+/zGbZzIRDtzIoCaOD+UwGg0xfVIRse50Ixj7Oi+EfoakDJ2ovph1HnT0jaNjMGEwHQYDVR0OBBYEFPbNNEfkHEUylUPBS9awtThWyjoEMB8GA1UdIwQYMBaAFPbNNEfkHEUylUPBS9awtThWyjoEMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMCA0gAMEUCIQC4mGEO9YfDrqLY+jmlD+mHkmO8XIQZge0I8FiM8RoA5gIgbjWya47Sd1QN2IG+NFOcaLyTA6JOtHnXiP2PK++l/OE=';

const LEAF_DER =
  'MIIB5jCCAY2gAwIBAgIUakcjNg/lQPoF++m8iGbef48mTaQwCgYIKoZIzj0EAwIwLDEYMBYGA1UEAwwPRXhhbXBsZSBSb290IENBMRAwDgYDVQQKDAdFeGFtcGxlMB4XDTI2MTAxNzExNTk0NloXDTI3MTExODExNTk0NlowLDEYMBYGA1UEAwwPd3d3LmV4YW1wbGUuY29tMRAwDgYDVQQKDAdFeGFtcGxlMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEX739F5F/H0KU7H7zUDywCElLn1d4/QwgaOjmieNmvv4QCB9lxuUFXfCA/MClhvGqApiQW7W2XBLy5Q39YfuvOaOBjDCBiTAnBgNVHREEIDAegg93d3cuZXhhbXBsZS5jb22CC2V4YW1wbGUuY29tMBMGA1UdJQQMMAoGCCsGAQUFBwMBMAkGA1UdEwQCMAAwHQYDVR0OBBYEFIcaV9Pk0JdsGJyoEOQsL7A9JfaBMB8GA1UdIwQYMBaAFPbNNEfkHEUylUPBS9awtThWyjoEMAoGCCqGSM49BAMCA0cAMEQCIGG3Pdq97svdkhLLZq7XiuGoiTu2NSxuZ4jJCbp8SwWjAiBl1zyKOJOcMDetzsqjjGEEvVyKXLHWxByKZ9KY3oSRxw==';

const CA_SUBJECT = { CN: 'Example Root CA', O: 'Example' };
const LEAF_SUBJECT = { CN: 'www.example.com', O: 'Example' };
const CA_DN = 'CN=Example Root CA,O=Example';
const LEAF_DN = 'CN=www.example.com,O=Example';
const CA_NOT_BEFORE = '2026-10-17T11:59:46Z';
const CA_NOT_AFTER = '2036-10-14T11:59:46Z';
const LEAF_NOT_AFTER = '2027-11-18T11:59:46Z';

const digest = (algorithm, b64) =>
  createHash(algorithm).update(Buffer.from(b64, 'base64')).digest('hex');

const factsOf = ({ subject, subject_dn, issuer, issuer_dn, der, serial, not_after, ca }) => ({
  subject,
  issuer,
  subject_dn,
  issuer_dn,
  serial_hex: serial,
  not_before: CA_NOT_BEFORE,
  not_after,
  algorithm: 'EC',
  bits: 256,
  curve: 'P-256',
  signature_algorithm: 'ecdsa-with-SHA256',
  self_signed: ca,
  is_ca: ca,
  path_len: null,
  sans: ca
    ? []
    : [
        { kind: 'dns', value: 'www.example.com' },
        { kind: 'dns', value: 'example.com' },
      ],
  key_usage: ca ? ['digitalSignature', 'keyCertSign', 'cRLSign'] : [],
  ext_key_usage: ca ? [] : ['serverAuth'],
  fingerprint_sha256: digest('sha256', der),
  fingerprint_sha1: digest('sha1', der),
  fingerprint_md5: digest('md5', der),
  subject_key_id: null,
  authority_key_id: null,
  csr_signature_valid: null,
});

const CA_FACTS = factsOf({
  subject: CA_SUBJECT,
  subject_dn: CA_DN,
  issuer: CA_SUBJECT,
  issuer_dn: CA_DN,
  der: CA_DER,
  serial: '296fe0becaa27f86a393c5dbdf5d1f06ac13813d',
  not_after: CA_NOT_AFTER,
  ca: true,
});

const LEAF_FACTS = factsOf({
  subject: LEAF_SUBJECT,
  subject_dn: LEAF_DN,
  issuer: CA_SUBJECT,
  issuer_dn: CA_DN,
  der: LEAF_DER,
  serial: '6a4723360fe540fa05fbe9bc8866de7f8f264da4',
  not_after: LEAF_NOT_AFTER,
  ca: false,
});

const recordOf = ({ id, kind, name, facts, der, at }) => ({
  id,
  kind,
  name,
  tags: ['seed'],
  notes: '',
  created_at: at,
  updated_at: at,
  facts,
  links: { key_id: null, issuer_id: null, request_id: null, chain_ids: [] },
  history: [
    {
      version: 1,
      der_b64: der,
      not_before: facts.not_before,
      not_after: facts.not_after,
      current: true,
    },
  ],
  public_der_b64: der,
  private_der_b64: null,
  template: null,
  origin: 'shared',
  remote_id: null,
  organization: '',
  created_by: '',
  synced_at: null,
  published: false,
  is_public: false,
  guest_access: false,
});

const rows = new Map();

const WORDS = ['published', 'is_public', 'guest_access'];

const wordsOf = source => Object.fromEntries(WORDS.map(word => [word, Boolean(source[word])]));

const withWords = row => ({
  ...row,
  record: { ...row.record, ...wordsOf(row), organization: row.organization, remote_id: row.id },
});

const rowOf = ({ organization, kind, name, words, created_by, record, at }) => {
  const id = randomUUID();
  const held = record && typeof record === 'object' ? record : {};
  return withWords({
    id,
    organization,
    kind,
    name,
    subject: held.facts?.subject_dn || '',
    not_after: held.facts?.not_after || '',
    ...wordsOf(words),
    created_by,
    updated_at: at,
    record: { ...held, created_by },
  });
};

const seedOrganization = (name, index) => {
  const at = ago(DAY_MINUTES * (3 + index));
  [
    {
      kind: 'authority',
      name: 'Example Root CA',
      facts: CA_FACTS,
      der: CA_DER,
      words: { published: true, is_public: true, guest_access: true },
    },
    {
      kind: 'certificate',
      name: 'www.example.com',
      facts: LEAF_FACTS,
      der: LEAF_DER,
      words: { published: true, is_public: false, guest_access: false },
    },
  ].forEach(seed => {
    const row = rowOf({
      organization: name,
      kind: seed.kind,
      name: seed.name,
      words: seed.words,
      created_by: 'system',
      record: recordOf({
        id: randomUUID(),
        kind: seed.kind,
        name: seed.name,
        facts: seed.facts,
        der: seed.der,
        at,
      }),
      at,
    });
    rows.set(row.id, row);
  });
};

[...organizations.keys()].forEach(seedOrganization);

const manageable = (person, row) => {
  const membership = membershipIn(person, row.organization);
  if (membership?.role === 'guest') {
    return false;
  }
  return row.created_by === person.username || MANAGERS.includes(membership?.role);
};

const readable = (person, row) => {
  if (row.created_by === person.username) {
    return true;
  }
  if (!row.published) {
    return manageable(person, row);
  }
  if (row.is_public) {
    return true;
  }
  const membership = membershipIn(person, row.organization);
  if (!membership) {
    return false;
  }
  return membership.role !== 'guest' || row.guest_access;
};

const listed = ctx => {
  const organization = String(ctx.url.searchParams.get('organization') || '');
  const own = [...rows.values()].filter(
    row => (!organization || row.organization === organization) && readable(ctx.person, row)
  );
  return ok(own);
};

const shown = ctx => {
  const row = rows.get(ctx.params.id);
  return row && readable(ctx.person, row) ? ok(row) : missing(NO_ROW);
};

const created = ctx => {
  const { body, person } = ctx;
  const organization = String(body.organization || '');
  const membership = membershipIn(person, organization);
  const member = Boolean(membership) && membership.role !== 'guest';
  if (!organizations.has(organization) || !member) {
    return denied(NOT_MEMBER);
  }
  const row = rowOf({
    organization,
    kind: String(body.kind || 'certificate'),
    name: String(body.name || ''),
    words: body,
    created_by: person.username,
    record: body.record,
    at: now(),
  });
  rows.set(row.id, row);
  broadcast(TOPIC, 'cert-updated', row);
  return ok(row, 201);
};

const MEMBERS = ['name', ...WORDS];

const updated = ctx => {
  const held = rows.get(ctx.params.id);
  if (!held || !readable(ctx.person, held)) {
    return missing(NO_ROW);
  }
  if (!manageable(ctx.person, held)) {
    return denied(NOT_OWNER);
  }
  const { body } = ctx;
  MEMBERS.filter(member => member in body).forEach(member => {
    held[member] = member === 'name' ? String(body.name) : Boolean(body[member]);
  });
  if (body.record && typeof body.record === 'object') {
    held.record = { ...body.record, created_by: held.created_by };
    held.subject = held.record.facts?.subject_dn || held.subject;
    held.not_after = held.record.facts?.not_after || held.not_after;
  }
  held.updated_at = now();
  const row = withWords(held);
  rows.set(row.id, row);
  broadcast(TOPIC, 'cert-updated', row);
  return ok(row);
};

const removed = ctx => {
  const row = rows.get(ctx.params.id);
  if (!row || !readable(ctx.person, row)) {
    return missing(NO_ROW);
  }
  if (!manageable(ctx.person, row)) {
    return denied(NOT_OWNER);
  }
  rows.delete(row.id);
  broadcast(TOPIC, 'cert-removed', { id: row.id, organization: row.organization });
  return ok({ message: 'The certificate is removed.' });
};

/**
 * The shared certificate store of the pages contract: one row a
 * certificate, authority, request, key or template a person shared with
 * an organization, two seeded per organization, each carrying
 * `published`, `is_public` and `guest_access` and read by the four lines
 * of the pages contract: an unpublished row by the person who shared it
 * or an owner or admin of the organization, a published private row by
 * the organization's members, a
 * published private row marked for guests by its guests too, a
 * published public row by anyone; a member shares, the sharer or an
 * owner or admin of the organization changes and removes, a guest and a
 * global admin by role alone refused 403, and every write is sent on
 * the `certs` topic as `cert-updated` or `cert-removed`.
 *
 * @param {Object} router - `sessionRoute`
 * @returns {void}
 */
export const mountCerts = ({ sessionRoute }) => {
  sessionRoute('GET', '/api/certs', listed);
  sessionRoute('POST', '/api/certs', created);
  sessionRoute('GET', '/api/certs/:id', shown);
  sessionRoute('PUT', '/api/certs/:id', updated);
  sessionRoute('DELETE', '/api/certs/:id', removed);
};
