import { describe, expect, it } from 'vitest';

import {
  ACCEPT,
  FORMATS,
  PASSWORD_FORMATS,
  carriedBy,
  fileNameOf,
  fileStemOf,
  formatOf,
  formatsFor,
  slotsOf,
} from '../../src/features/certs/utils/formats.js';

describe('fileStemOf', () => {
  it('takes a known extension off and keeps any other dotted name whole', () => {
    expect(fileStemOf('leaf.pem')).toBe('leaf');
    expect(fileStemOf('leaf.enc.key')).toBe('leaf.enc');
    expect(fileStemOf('modern.PFX')).toBe('modern');
    expect(fileStemOf('www.example.com')).toBe('www.example.com');
    expect(fileStemOf('.hidden')).toBe('.hidden');
    expect(fileStemOf('bare')).toBe('bare');
  });
});

describe('formatOf and the tables', () => {
  it('answers a format by its word and null for one the table lacks', () => {
    expect(formatOf('pkcs12')).toMatchObject({ extensions: ['pfx', 'p12'], binary: true });
    expect(formatOf('nope')).toBeNull();
  });

  it('lists the one format that cannot be written without a password', () => {
    expect(PASSWORD_FORMATS).toEqual(['pkcs8_encrypted']);
  });

  it('accepts every extension the formats wear and the ones a dropped file may carry', () => {
    const accepted = ACCEPT.split(',');
    FORMATS.flatMap(format => format.extensions).forEach(extension => {
      expect(accepted).toContain(`.${extension}`);
    });
    ['.csr', '.req', '.p8', '.jwk', '.txt'].forEach(extension => {
      expect(accepted).toContain(extension);
    });
    expect(new Set(accepted).size).toBe(accepted.length);
  });
});

describe('formatsFor', () => {
  it('offers every format that carries every picked kind and none for no pick', () => {
    expect(formatsFor([]).map(format => format.id)).toEqual([]);
    expect(formatsFor(['certificate', 'key']).map(format => format.id)).toEqual([
      'pem',
      'der',
      'pkcs12',
      'openssh_public',
      'jwk',
      'jwks_public',
      'combined',
    ]);
    expect(formatsFor(['ca', 'key']).map(format => format.id)).not.toContain('pkcs7');
    expect(formatsFor(['csr']).map(format => format.id)).toEqual([
      'pem',
      'der',
      'openssh_public',
      'jwk',
      'jwks_public',
    ]);
    expect(formatsFor(['encrypted_key']).map(format => format.id)).toEqual(['pem']);
  });
});

describe('slotsOf', () => {
  it('answers the slots a format carries in order and none for no format', () => {
    const idsOf = id => slotsOf(formatOf(id)).map(slot => slot.id);
    expect(idsOf('pkcs12')).toEqual(['certificate', 'key']);
    expect(idsOf('pkcs7')).toEqual(['certificate']);
    expect(idsOf('pkcs8')).toEqual(['key']);
    expect(idsOf('pem')).toEqual(['certificate', 'key', 'public_key', 'request']);
    expect(slotsOf(null)).toEqual([]);
  });
});

describe('carriedBy', () => {
  const components = [
    { kind: 'certificate', der_b64: 'a' },
    { kind: 'key', der_b64: 'b' },
    { kind: 'csr', der_b64: 'c' },
  ];

  it('keeps the components the format writes and leaves the rest', () => {
    expect(carriedBy(components, 'pkcs7')).toEqual([{ kind: 'certificate', der_b64: 'a' }]);
    expect(carriedBy(components, 'pkcs8')).toEqual([{ kind: 'key', der_b64: 'b' }]);
    expect(carriedBy(components, 'pem')).toEqual(components);
    expect(carriedBy(components, 'nope')).toEqual([]);
  });
});

describe('fileNameOf', () => {
  it('leaves the word out where the extension says it, keeps it otherwise', () => {
    expect(fileNameOf('leaf', 'pem', 'pem')).toBe('leaf.pem');
    expect(fileNameOf('leaf', 'pem', 'crt')).toBe('leaf.crt');
    expect(fileNameOf('req', 'pem', 'csr')).toBe('req.csr');
    expect(fileNameOf('leaf', 'pem', 'key')).toBe('leaf.key');
    expect(fileNameOf('leaf', 'pkcs8', 'key')).toBe('leaf.pkcs8.key');
    expect(fileNameOf('leaf', 'fullchain', 'pem')).toBe('leaf.fullchain.pem');
    expect(fileNameOf('leaf', 'pkcs12', 'pfx')).toBe('leaf.pkcs12.pfx');
    expect(fileNameOf('leaf', 'der', 'der')).toBe('leaf.der');
    expect(fileNameOf('vault', 'certs', 'json')).toBe('vault.certs.json');
  });

  it('falls back to certificate as the stem', () => {
    expect(fileNameOf('', 'pem', 'pem')).toBe('certificate.pem');
  });
});
