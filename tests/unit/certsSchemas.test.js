import { describe, expect, it } from 'vitest';

import { PASSWORD_FORMATS } from '../../src/features/certs/utils/formats.js';
import {
  ALGORITHMS,
  CERTIFICATE_SCHEMA,
  CONVERT_SCHEMA,
  DETAILS_SCHEMA,
  EKUS,
  KEY_SCHEMA,
  OUTPUT_SCHEMA,
  PREFERENCES_SCHEMA,
  REQUEST_SCHEMA,
  SAN_KINDS,
  SIGNATURES,
  SIGN_SCHEMA,
  TEMPLATE_LABELS,
  templateSchemaOf,
} from '../../src/features/certs/utils/schemas.js';
import { validateObject } from '../../src/utils/validation.js';

const pointersOf = (schema, values) => validateObject(schema, values).map(error => error.pointer);

const SUBJECT = {
  CN: 'a',
  mode: 'generate',
  keyId: '',
  alg: 'p256',
  signature: 'pkcs1',
  sans: [],
  ext_key_usage: [],
};

describe('the words the engine takes', () => {
  it('lists the nine algorithms, the two signature schemes, the four name kinds and the four usages', () => {
    expect(ALGORITHMS).toEqual([
      'rsa2048',
      'rsa3072',
      'rsa4096',
      'p256',
      'p384',
      'p521',
      'secp256k1',
      'ed25519',
      'ed448',
    ]);
    expect(SIGNATURES).toEqual(['pkcs1', 'pss']);
    expect(SAN_KINDS).toEqual(['dns', 'ip', 'email', 'uri']);
    expect(EKUS).toEqual(['serverAuth', 'clientAuth', 'codeSigning', 'emailProtection']);
  });
});

describe('the generate schemas', () => {
  it('requires a name of the key made', () => {
    expect(pointersOf(KEY_SCHEMA, { alg: 'p256', name: '', notes: '' })).toEqual(['/name']);
    expect(pointersOf(KEY_SCHEMA, { alg: 'p256', name: 'k', notes: '' })).toEqual([]);
  });

  it('requires the common name and the vault key only while the source is the vault', () => {
    expect(pointersOf(REQUEST_SCHEMA, { ...SUBJECT, CN: '' })).toEqual(['/CN']);
    expect(pointersOf(REQUEST_SCHEMA, { ...SUBJECT, mode: 'vault' })).toEqual(['/keyId']);
    expect(pointersOf(REQUEST_SCHEMA, { ...SUBJECT, mode: 'vault', keyId: 'k' })).toEqual([]);
  });

  it('refuses a signature scheme outside the two words', () => {
    expect(pointersOf(REQUEST_SCHEMA, { ...SUBJECT, signature: 'other' })).toEqual(['/signature']);
    expect(pointersOf(REQUEST_SCHEMA, { ...SUBJECT, signature: 'pss' })).toEqual([]);
    expect(SIGN_SCHEMA.properties.signature.enum).toEqual(SIGNATURES);
  });

  it('refuses a name row without a value and an unknown usage', () => {
    const values = {
      ...SUBJECT,
      sans: [{ kind: 'dns', value: '' }],
      ext_key_usage: ['other'],
    };
    expect(pointersOf(REQUEST_SCHEMA, values)).toEqual(['/sans/0/value', '/ext_key_usage']);
  });

  it('adds the validity from one day and the path length from zero while an authority', () => {
    expect(pointersOf(CERTIFICATE_SCHEMA, { ...SUBJECT, days: '', is_ca: false })).toEqual([
      '/days',
    ]);
    expect(pointersOf(CERTIFICATE_SCHEMA, { ...SUBJECT, days: 0, is_ca: false })).toEqual([
      '/days',
    ]);
    expect(
      pointersOf(CERTIFICATE_SCHEMA, { ...SUBJECT, days: 365, is_ca: true, path_len: -1 })
    ).toEqual(['/path_len']);
    expect(
      pointersOf(CERTIFICATE_SCHEMA, { ...SUBJECT, days: 365, is_ca: true, path_len: 0 })
    ).toEqual([]);
  });

  it('requires the pasted request and the pasted authority only while pasted', () => {
    const { request, authority_cert, authority_key } = SIGN_SCHEMA.properties;
    expect(request.custom(null, { request_mode: 'paste' })).toEqual({
      rule: 'required',
      params: {},
    });
    expect(request.custom({ der_b64: 'A' }, { request_mode: 'paste' })).toBeNull();
    expect(request.custom(null, { request_mode: 'vault' })).toBeNull();
    expect(authority_cert.custom(null, { authority_mode: 'paste' })).toEqual({
      rule: 'required',
      params: {},
    });
    expect(authority_key.custom(null, { authority_mode: 'vault' })).toBeNull();
    expect(SIGN_SCHEMA.required).toEqual([
      'request_mode',
      'request_id',
      'authority_mode',
      'authority_id',
      'days',
    ]);
  });
});

describe('templateSchemaOf', () => {
  const schema = templateSchemaOf(['Web', 'mail'], 'Templates');

  it('refuses a name a template already carries, whatever its case or spacing', () => {
    expect(schema.properties.name.custom('web', {})).toEqual({
      rule: 'unique',
      params: { value: 'web', scope: 'Templates' },
    });
    expect(schema.properties.name.custom(' MAIL ', {})).toMatchObject({ rule: 'unique' });
    expect(schema.properties.name.custom('fresh', {})).toBeNull();
    expect(schema.properties.name.custom('', {})).toBeNull();
  });

  it('requires the name and labels it', () => {
    expect(schema.required).toEqual(['name']);
    expect(pointersOf(schema, { name: '' })).toEqual(['/name']);
    expect(TEMPLATE_LABELS).toEqual({ name: 'certs.generate.templateName' });
  });
});

describe('the output and convert schemas', () => {
  it('requires the format, and the password only for a format that cannot be written without one', () => {
    expect(OUTPUT_SCHEMA.properties.password.showWhen).toEqual(PASSWORD_FORMATS);
    expect(pointersOf(OUTPUT_SCHEMA, { to: '', password: '', legacy: false })).toEqual(['/to']);
    expect(pointersOf(OUTPUT_SCHEMA, { to: 'pkcs12', password: '', legacy: false })).toEqual([]);
    expect(
      pointersOf(OUTPUT_SCHEMA, { to: 'pkcs8_encrypted', password: '', legacy: false })
    ).toEqual(['/password']);
  });

  it('asks for at least one picked component', () => {
    const output = { to: 'pem', password: '', legacy: false };
    expect(pointersOf(CONVERT_SCHEMA, { ...output, picked: [] })).toEqual(['/picked']);
    expect(pointersOf(CONVERT_SCHEMA, { ...output, picked: ['a'] })).toEqual([]);
  });
});

describe('the details and preferences schemas', () => {
  it('requires the name alone', () => {
    expect(pointersOf(DETAILS_SCHEMA, { name: ' ', tags: '', notes: '' })).toEqual(['/name']);
    expect(pointersOf(DETAILS_SCHEMA, { name: 'n', tags: '', notes: '' })).toEqual([]);
  });

  it('takes the threshold as a whole number of days from one', () => {
    expect(pointersOf(PREFERENCES_SCHEMA, { threshold_days: '' })).toEqual(['/threshold_days']);
    expect(pointersOf(PREFERENCES_SCHEMA, { threshold_days: 0 })).toEqual(['/threshold_days']);
    expect(pointersOf(PREFERENCES_SCHEMA, { threshold_days: 30 })).toEqual([]);
  });
});
