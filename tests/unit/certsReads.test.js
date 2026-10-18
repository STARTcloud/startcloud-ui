import { describe, expect, it } from 'vitest';

import {
  EMPTY_READ,
  describeComponent,
  idOf,
  pickable,
  withRead,
} from '../../src/features/certs/utils/reads.js';

const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

const certOf = (subject, der) => ({
  kind: 'certificate',
  der_b64: der,
  facts: { subject_dn: subject, not_after: '2027-10-17T11:32:30Z' },
});

const keyOf = der => ({ kind: 'key', der_b64: der, facts: { has_private: true } });

const locked = { kind: 'encrypted_key', der_b64: 'ENC', facts: null };

describe('describeComponent', () => {
  it('draws the locked line while there are no facts', () => {
    expect(describeComponent(locked, t, 'en')).toBe('certs.component.locked');
  });

  it("draws a key's algorithm and size", () => {
    expect(
      describeComponent({ facts: { has_private: true, algorithm: 'RSA', bits: 2048 } }, t, 'en')
    ).toBe('RSA 2048');
    expect(
      describeComponent(
        { facts: { has_private: false, algorithm: 'EC', bits: 256, curve: 'P-256' } },
        t,
        'en'
      )
    ).toBe('EC P-256');
  });

  it('draws the subject with its expiry, the subject alone without an end', () => {
    const line = describeComponent(certOf('CN=leaf', 'A'), t, 'en');
    expect(line.startsWith('CN=leaf · certs.component.expires:')).toBe(true);
    expect(describeComponent({ facts: { subject_dn: 'CN=csr' } }, t, 'en')).toBe('CN=csr');
  });
});

describe('idOf and pickable', () => {
  it('keys a component by its kind and the head of its DER, a locked bundle by its file', () => {
    expect(idOf({ kind: 'certificate', der_b64: `${'A'.repeat(60)}B` })).toBe(
      `certificate:${'A'.repeat(48)}`
    );
    expect(idOf({ kind: 'encrypted_bundle', der_b64: '', source: 'legacy.pfx' })).toBe(
      'encrypted_bundle:legacy.pfx'
    );
    expect(idOf({ kind: 'encrypted_bundle', der_b64: '' })).toBe('encrypted_bundle:');
  });

  it('lets every kind be picked but an encrypted key and a locked bundle', () => {
    expect(pickable(certOf('CN=a', 'A'))).toBe(true);
    expect(pickable(keyOf('K'))).toBe(true);
    expect(pickable(locked)).toBe(false);
    expect(pickable({ kind: 'encrypted_bundle' })).toBe(false);
  });
});

describe('withRead', () => {
  it('starts from nothing read', () => {
    expect(EMPTY_READ).toEqual({ components: [], name: '', read: false });
  });

  it('marks every component with its file and keeps the first file as the name', () => {
    const first = withRead(EMPTY_READ, { components: [certOf('CN=leaf', 'A')] }, 'leaf.pem');
    expect(first).toEqual({
      components: [{ ...certOf('CN=leaf', 'A'), source: 'leaf.pem' }],
      name: 'leaf.pem',
      read: true,
    });
    const second = withRead(first, { components: [keyOf('K')] }, 'leaf.key');
    expect(second.name).toBe('leaf.pem');
    expect(second.components.map(component => component.source)).toEqual(['leaf.pem', 'leaf.key']);
  });

  it('leaves a component already held as it is', () => {
    const first = withRead(EMPTY_READ, { components: [certOf('CN=leaf', 'A')] }, 'leaf.pem');
    const again = withRead(first, { components: [certOf('CN=leaf', 'A')] }, 'copy.pem');
    expect(again.components).toHaveLength(1);
    expect(again.components[0].source).toBe('leaf.pem');
  });

  it('stands a locked read that names no component as one locked bundle of its file', () => {
    const read = withRead(EMPTY_READ, { components: [], needs_password: true }, 'legacy.pfx');
    expect(read.components).toEqual([
      { kind: 'encrypted_bundle', der_b64: '', facts: null, source: 'legacy.pfx' },
    ]);
    expect(read.read).toBe(true);
  });

  it('keeps a read that names nothing and needs no password as read with no component', () => {
    expect(withRead(EMPTY_READ, { components: [] }, 'empty.txt')).toEqual({
      components: [],
      name: 'empty.txt',
      read: true,
    });
  });

  it('replaces the locked component of the same file once a read unlocks it', () => {
    const held = withRead(
      withRead(EMPTY_READ, { components: [certOf('CN=leaf', 'A')] }, 'leaf.pem'),
      { components: [locked] },
      'leaf.enc.key'
    );
    expect(held.components.map(component => component.kind)).toEqual([
      'certificate',
      'encrypted_key',
    ]);
    const unlocked = withRead(held, { components: [keyOf('K')] }, 'leaf.enc.key');
    expect(unlocked.components.map(component => component.kind)).toEqual(['certificate', 'key']);
    expect(unlocked.components[1].source).toBe('leaf.enc.key');
  });

  it('leaves a locked component of another file alone', () => {
    const held = withRead(EMPTY_READ, { components: [locked] }, 'leaf.enc.key');
    const other = withRead(held, { components: [keyOf('K')] }, 'other.key');
    expect(other.components.map(component => component.kind)).toEqual(['encrypted_key', 'key']);
  });

  it('keeps a locked bundle while a second locked read of the same file adds nothing', () => {
    const held = withRead(EMPTY_READ, { components: [], needs_password: true }, 'legacy.pfx');
    const again = withRead(held, { components: [], needs_password: true }, 'legacy.pfx');
    expect(again.components).toHaveLength(1);
  });
});
