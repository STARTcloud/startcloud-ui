import { describe, expect, it } from 'vitest';

import {
  componentsOf,
  firstOf,
  keepable,
  lastOf,
  recordsOf,
} from '../../src/features/certs/utils/components.js';

const engine = {
  public_key_hash: (der, kind) => (kind === 'ca' ? 'hash-root' : `hash-${der}`),
};

const leaf = {
  kind: 'certificate',
  der_b64: 'LEAF',
  facts: { subject: { CN: 'www.example.com' }, subject_dn: 'CN=www.example.com', not_after: 'x' },
};

const root = {
  kind: 'ca',
  der_b64: 'ROOT',
  facts: { subject: { CN: 'Root' }, subject_dn: 'CN=Root', not_after: 'y' },
};

const leafKey = { kind: 'key', der_b64: 'KEY', facts: { public_key_sha256: 'hash-LEAF' } };

const loneKey = { kind: 'key', der_b64: 'LONE', facts: { public_key_sha256: 'hash-none' } };

const publicKey = { kind: 'public_key', der_b64: 'PUB', facts: { public_key_sha256: 'hash-p' } };

const csr = {
  kind: 'csr',
  der_b64: 'CSR',
  facts: { subject: { CN: 'req' }, subject_dn: 'CN=req' },
};

const locked = { kind: 'encrypted_key', der_b64: 'ENC', facts: null };

describe('keepable, firstOf and lastOf', () => {
  it('keeps every kind but an encrypted key', () => {
    expect(keepable(leaf)).toBe(true);
    expect(keepable(root)).toBe(true);
    expect(keepable({ kind: 'intermediate' })).toBe(true);
    expect(keepable(csr)).toBe(true);
    expect(keepable(leafKey)).toBe(true);
    expect(keepable(publicKey)).toBe(true);
    expect(keepable({ kind: 'ssh_certificate' })).toBe(true);
    expect(keepable(locked)).toBe(false);
    expect(keepable({ kind: 'encrypted_bundle' })).toBe(false);
  });

  it('answers the first component of the kinds wanted, null for none', () => {
    const detected = { components: [leafKey, leaf, root] };
    expect(firstOf(detected, ['certificate', 'ca'])).toBe(leaf);
    expect(firstOf(detected, ['csr'])).toBeNull();
    expect(firstOf(null, ['key'])).toBeNull();
  });

  it('answers the newest component of the kinds wanted, null for none', () => {
    const held = { components: [leaf, leafKey, root, loneKey] };
    expect(lastOf(held, ['certificate', 'ca'])).toBe(root);
    expect(lastOf(held, ['key'])).toBe(loneKey);
    expect(lastOf(held, ['csr'])).toBeNull();
    expect(lastOf({ components: [] }, ['key'])).toBeNull();
    expect(lastOf(null, ['key'])).toBeNull();
  });
});

describe('recordsOf', () => {
  it('makes one record a component of the right kind, the certificates first', () => {
    const records = recordsOf([leafKey, csr, root, leaf], engine, 'bundle');
    expect(records.map(record => record.kind)).toEqual([
      'authority',
      'certificate',
      'key',
      'request',
    ]);
    expect(records.map(record => record.name)).toEqual([
      'Root',
      'www.example.com',
      'www.example.com key',
      'req',
    ]);
  });

  it('links a certificate to the key whose hash it shares and names the key after it', () => {
    const [cert, key] = recordsOf([leaf, leafKey], engine);
    expect(cert.links.key_id).toBe(key.id);
    expect(key.private_der_b64).toBe('KEY');
    expect(key.public_der_b64).toBeNull();
    expect(cert.public_der_b64).toBe('LEAF');
    expect(cert.history).toHaveLength(1);
    expect(cert.history[0]).toMatchObject({ version: 1, der_b64: 'LEAF', current: true });
  });

  it('names a key beside no certificate by its file, else by its hash, else key', () => {
    expect(recordsOf([loneKey], engine, 'leaf')[0].name).toBe('leaf');
    expect(recordsOf([loneKey], engine)[0].name).toBe('hash-none');
    expect(recordsOf([{ kind: 'key', der_b64: 'X', facts: null }], engine)[0].name).toBe('key');
  });

  it('keeps a public key under its public half with no link to the certificate', () => {
    const [cert, key] = recordsOf(
      [leaf, { ...publicKey, facts: { public_key_sha256: 'hash-LEAF' } }],
      engine
    );
    expect(key.kind).toBe('key');
    expect(key.public_der_b64).toBe('PUB');
    expect(key.private_der_b64).toBeNull();
    expect(cert.links.key_id).toBeNull();
  });

  it('leaves an encrypted key out and survives a hash the engine refuses', () => {
    const failing = {
      public_key_hash: () => {
        throw new Error('bad der');
      },
    };
    const records = recordsOf([leaf, locked, leafKey], failing);
    expect(records.map(record => record.kind)).toEqual(['certificate', 'key']);
    expect(records[0].links.key_id).toBeNull();
  });
});

describe('componentsOf', () => {
  const kindOf = record => record.kind;
  const derOf = record => record.der || '';

  it("lists the record's own DER, its key's private half and the issuers after them", () => {
    const record = { kind: 'certificate', der: 'A' };
    const key = { private_der_b64: 'K' };
    const issuers = [{ kind: 'ca', der_b64: 'R' }];
    expect(componentsOf(record, key, kindOf, derOf, issuers)).toEqual([
      { kind: 'certificate', der_b64: 'A' },
      { kind: 'key', der_b64: 'K' },
      { kind: 'ca', der_b64: 'R' },
    ]);
  });

  it('leaves out a record with no DER and a key without its private half', () => {
    expect(componentsOf({ kind: 'template' }, { private_der_b64: null }, kindOf, derOf)).toEqual(
      []
    );
    expect(componentsOf({ kind: 'csr', der: 'C' }, null, kindOf, derOf)).toEqual([
      { kind: 'csr', der_b64: 'C' },
    ]);
  });
});
