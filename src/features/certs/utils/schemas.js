import { NON_BLANK } from '../../../utils/validation';

import { PASSWORD_FORMATS } from './formats';

const ALGORITHMS = [
  'rsa2048',
  'rsa3072',
  'rsa4096',
  'p256',
  'p384',
  'p521',
  'secp256k1',
  'ed25519',
  'ed448',
];

const SIGNATURES = ['pkcs1', 'pss'];

const SAN_KINDS = ['dns', 'ip', 'email', 'uri'];

const EKUS = ['serverAuth', 'clientAuth', 'codeSigning', 'emailProtection'];

const SOURCE_MODES = ['vault', 'paste'];

const required = (value, values, when) =>
  when(values) && !value ? { rule: 'required', params: {} } : null;

const SUBJECT_PROPERTIES = {
  CN: NON_BLANK,
  O: { type: 'string' },
  OU: { type: 'string' },
  L: { type: 'string' },
  ST: { type: 'string' },
  C: { type: 'string' },
  emailAddress: { type: 'string' },
  sans: {
    type: 'array',
    items: {
      required: ['value'],
      properties: { kind: { type: 'string', enum: SAN_KINDS }, value: NON_BLANK },
    },
  },
  ext_key_usage: { type: 'array', items: { type: 'string', enum: EKUS } },
};

const SUBJECT_LABELS = {
  CN: 'certs.subject.CN',
  O: 'certs.subject.O',
  OU: 'certs.subject.OU',
  L: 'certs.subject.L',
  ST: 'certs.subject.ST',
  C: 'certs.subject.C',
  emailAddress: 'certs.subject.emailAddress',
  sans: 'certs.subject.sans',
  ext_key_usage: 'certs.subject.eku',
};

const SIGNATURE_PROPERTY = { type: 'string', enum: SIGNATURES };

const KEY_SOURCE_PROPERTIES = {
  mode: { type: 'string', enum: ['generate', 'vault'] },
  keyId: { ...NON_BLANK, dependsOn: 'mode', showWhen: ['vault'] },
  alg: { type: 'string', enum: ALGORITHMS },
  signature: SIGNATURE_PROPERTY,
};

const KEY_SOURCE_LABELS = {
  mode: 'certs.generate.keySource',
  keyId: 'certs.generate.vaultKey',
  alg: 'certs.generate.algorithm',
  signature: 'certs.generate.signature',
};

const ISSUE_PROPERTIES = {
  days: { ...NON_BLANK, type: 'integer', minimum: 1 },
  is_ca: { type: 'boolean' },
  path_len: { type: 'integer', minimum: 0, dependsOn: 'is_ca', showWhen: [true] },
};

const ISSUE_LABELS = {
  days: 'certs.generate.days',
  is_ca: 'certs.generate.authority',
  path_len: 'certs.generate.pathLen',
};

/**
 * The page schema and label keys of the Generate page's Key tab: the
 * algorithm, then the name of the key made, required, and its notes.
 */
export const KEY_SCHEMA = {
  required: ['alg', 'name'],
  properties: {
    alg: KEY_SOURCE_PROPERTIES.alg,
    name: NON_BLANK,
    notes: { type: 'string' },
  },
};

export const KEY_LABELS = {
  alg: 'certs.generate.algorithm',
  name: 'certs.record.name',
  notes: 'certs.record.notes',
};

/**
 * The page schema and label keys of the Request tab: the subject, the
 * names, the usages and the key source, the vault key required while the
 * source is the vault, the signature scheme one of the engine's two words.
 */
export const REQUEST_SCHEMA = {
  required: ['CN', 'mode', 'keyId', 'alg'],
  properties: { ...SUBJECT_PROPERTIES, ...KEY_SOURCE_PROPERTIES },
};

export const REQUEST_LABELS = { ...SUBJECT_LABELS, ...KEY_SOURCE_LABELS };

/**
 * The page schema and label keys of the Certificate tab: the request
 * tab's members and the issue, the validity a whole number of days from
 * one and the path length a whole number from zero while it is an
 * authority.
 */
export const CERTIFICATE_SCHEMA = {
  required: [...REQUEST_SCHEMA.required, 'days'],
  properties: { ...REQUEST_SCHEMA.properties, ...ISSUE_PROPERTIES },
};

export const CERTIFICATE_LABELS = { ...REQUEST_LABELS, ...ISSUE_LABELS };

const pasted = mode => values => values[mode] === 'paste';

/**
 * The page schema and label keys of the Sign request tab: the request
 * and the authority each from the vault, its pick required, or pasted,
 * the request's component, the authority's certificate and its key each
 * required while pasted, the signature scheme the authority's key signs
 * with, then the issue.
 */
export const SIGN_SCHEMA = {
  required: ['request_mode', 'request_id', 'authority_mode', 'authority_id', 'days'],
  properties: {
    request_mode: { type: 'string', enum: SOURCE_MODES },
    request_id: { ...NON_BLANK, dependsOn: 'request_mode', showWhen: ['vault'] },
    request: { custom: (value, values) => required(value, values, pasted('request_mode')) },
    authority_mode: { type: 'string', enum: SOURCE_MODES },
    authority_id: { ...NON_BLANK, dependsOn: 'authority_mode', showWhen: ['vault'] },
    authority_cert: {
      custom: (value, values) => required(value, values, pasted('authority_mode')),
    },
    authority_key: {
      custom: (value, values) => required(value, values, pasted('authority_mode')),
    },
    signature: SIGNATURE_PROPERTY,
    copy_extensions: { type: 'boolean' },
    ...ISSUE_PROPERTIES,
  },
};

export const SIGN_LABELS = {
  request_mode: 'certs.generate.request',
  request_id: 'certs.generate.request',
  request: 'certs.generate.pasteRequest',
  authority_mode: 'certs.generate.authorityPick',
  authority_id: 'certs.generate.authorityPick',
  authority_cert: 'certs.generate.authorityCertificate',
  authority_key: 'certs.generate.authorityKey',
  signature: 'certs.generate.signature',
  copy_extensions: 'certs.generate.copyExtensions',
  ...ISSUE_LABELS,
};

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const taken = (names, scope) => value =>
  names.some(name => sameName(name, String(value || '')))
    ? { rule: 'unique', params: { value, scope } }
    : null;

/**
 * The page schema of the template name beside a subject form, the name
 * required and refused while a template of the vault already carries
 * it, `scope` the translated noun the refusal names.
 *
 * @param {Array<string>} names - The names the vault's templates carry
 * @param {string} scope - The scope's translated noun
 * @returns {Object} The schema
 */
export const templateSchemaOf = (names, scope) => ({
  required: ['name'],
  properties: { name: { ...NON_BLANK, custom: taken(names, scope) } },
});

export const TEMPLATE_LABELS = { name: 'certs.generate.templateName' };

/**
 * The page schema and label keys of a conversion's output: the format
 * required, the password required while the format cannot be written
 * without one, the legacy switch and the friendly name.
 */
export const OUTPUT_SCHEMA = {
  required: ['to', 'password'],
  properties: {
    to: NON_BLANK,
    password: { ...NON_BLANK, dependsOn: 'to', showWhen: PASSWORD_FORMATS },
    legacy: { type: 'boolean' },
    friendly_name: { type: 'string' },
  },
};

export const OUTPUT_LABELS = {
  to: 'certs.convert.format',
  password: 'certs.convert.password',
  legacy: 'certs.convert.legacy',
  friendly_name: 'certs.convert.friendlyName',
};

/**
 * The page schema and label keys of the Convert page: the output and
 * the picked components, at least one.
 */
export const CONVERT_SCHEMA = {
  required: [...OUTPUT_SCHEMA.required, 'picked'],
  properties: { ...OUTPUT_SCHEMA.properties, picked: { type: 'array', minItems: 1 } },
};

export const CONVERT_LABELS = { ...OUTPUT_LABELS, picked: 'certs.convert.components' };

/**
 * The page schema and label keys of a record's details: the name
 * required, the tags and the notes.
 */
export const DETAILS_SCHEMA = {
  required: ['name'],
  properties: { name: NON_BLANK, tags: { type: 'string' }, notes: { type: 'string' } },
};

export const DETAILS_LABELS = {
  name: 'certs.record.name',
  tags: 'certs.record.tags',
  notes: 'certs.record.notes',
};

/**
 * The page schema and label keys of the vault's preferences: the expiry
 * threshold a whole number of days from one.
 */
export const PREFERENCES_SCHEMA = {
  required: ['threshold_days'],
  properties: { threshold_days: { ...NON_BLANK, type: 'integer', minimum: 1 } },
};

export const PREFERENCES_LABELS = { threshold_days: 'certs.preferences.thresholdDays' };

/**
 * The page schema and label keys of the Input zone's paste: the text and
 * the password, neither required.
 */
export const INPUT_SCHEMA = {
  properties: { text: { type: 'string' }, password: { type: 'string' } },
};

export const INPUT_LABELS = { text: 'certs.input.pasteLabel', password: 'certs.input.password' };

export { ALGORITHMS, EKUS, SAN_KINDS, SIGNATURES };
