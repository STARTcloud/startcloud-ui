import { describe, expect, it } from 'vitest';

import { warningTone, warningsOf } from '../../src/features/certs/utils/warnings.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-18T12:00:00Z');

const at = days => new Date(NOW + days * DAY_MS).toISOString();

const facts = more => ({
  not_after: at(400),
  algorithm: 'EC',
  bits: 256,
  signature_algorithm: 'ecdsa-with-SHA256',
  self_signed: false,
  is_ca: false,
  ...more,
});

describe('warningsOf', () => {
  it('raises nothing for a sound certificate and nothing for no facts', () => {
    expect(warningsOf(facts({}), NOW)).toEqual([]);
    expect(warningsOf(null, NOW)).toEqual([]);
  });

  it('raises the expiry words from the end and the threshold', () => {
    expect(warningsOf(facts({ not_after: at(-1) }), NOW)).toEqual(['expired']);
    expect(warningsOf(facts({ not_after: at(10) }), NOW)).toEqual(['expiring']);
    expect(warningsOf(facts({ not_after: at(10) }), NOW, 5)).toEqual([]);
    expect(warningsOf(facts({ not_after: '' }), NOW)).toEqual([]);
  });

  it('raises weakKey for an RSA key under 2048 bits alone', () => {
    expect(warningsOf(facts({ algorithm: 'RSA', bits: 1024 }), NOW)).toEqual(['weakKey']);
    expect(warningsOf(facts({ algorithm: 'RSA', bits: 2048 }), NOW)).toEqual([]);
    expect(warningsOf(facts({ algorithm: 'EC', bits: 256 }), NOW)).toEqual([]);
  });

  it('raises weakHash for an MD5 or SHA-1 signature whatever its case', () => {
    expect(warningsOf(facts({ signature_algorithm: 'sha1WithRSAEncryption' }), NOW)).toEqual([
      'weakHash',
    ]);
    expect(warningsOf(facts({ signature_algorithm: 'MD5withRSA' }), NOW)).toEqual(['weakHash']);
    expect(warningsOf(facts({ signature_algorithm: 'sha256WithRSAEncryption' }), NOW)).toEqual([]);
    expect(warningsOf(facts({ signature_algorithm: undefined }), NOW)).toEqual([]);
  });

  it('raises selfSigned for a certificate that signed itself and is no authority', () => {
    expect(warningsOf(facts({ self_signed: true }), NOW)).toEqual(['selfSigned']);
    expect(warningsOf(facts({ self_signed: true, is_ca: true }), NOW)).toEqual([]);
  });

  it('lists every word in order', () => {
    expect(
      warningsOf(
        facts({
          not_after: at(-1),
          algorithm: 'RSA',
          bits: 512,
          signature_algorithm: 'md5WithRSAEncryption',
          self_signed: true,
        }),
        NOW
      )
    ).toEqual(['expired', 'weakKey', 'weakHash', 'selfSigned']);
  });
});

describe('warningTone', () => {
  it('reads danger for an expiry or a weak hash and warning for the rest', () => {
    expect(warningTone('expired')).toBe('danger');
    expect(warningTone('weakHash')).toBe('danger');
    expect(warningTone('expiring')).toBe('warning');
    expect(warningTone('weakKey')).toBe('warning');
    expect(warningTone('selfSigned')).toBe('warning');
  });
});
