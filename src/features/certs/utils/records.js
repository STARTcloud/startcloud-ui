const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_THRESHOLD_DAYS = 30;

export const KINDS = ['certificate', 'authority', 'request', 'key', 'ssh_certificate', 'template'];

export const STATUSES = ['valid', 'expiring', 'expired'];

export const STATUS_CLASSES = {
  valid: 'text-bg-success',
  expiring: 'text-bg-warning',
  expired: 'text-bg-danger',
};

/**
 * The engine's certificate component kinds, a certificate, a root CA and
 * an intermediate CA.
 */
export const CERT_COMPONENT_KINDS = ['certificate', 'ca', 'intermediate'];

const ENGINE_KINDS = {
  certificate: 'certificate',
  authority: 'ca',
  request: 'csr',
  key: 'key',
  ssh_certificate: 'ssh_certificate',
  template: 'template',
};

const timeOf = iso => (iso ? new Date(iso).getTime() : NaN);

/**
 * The instant a status is read at, the clock read once per render and
 * never to schedule anything.
 *
 * @returns {number} The epoch in milliseconds
 */
export const nowOf = () => Date.now();

/**
 * The route of one record's page.
 *
 * @param {Object} record - The record
 * @returns {string} The route
 */
export const recordPath = record => `/certs/${encodeURIComponent(record.id)}`;

/**
 * The expiry status of a thing that ends at `not_after`: `expired` once
 * `now` is past it, `expiring` within `thresholdDays` of it, `valid`
 * otherwise, and empty for a thing with no end.
 *
 * @param {string} not_after - The end as the engine answers it, empty for none
 * @param {number} now - The reference epoch in milliseconds
 * @param {number} [thresholdDays] - The days before the end that read as expiring
 * @returns {string} `valid`, `expiring`, `expired` or empty
 */
export const statusOf = (not_after, now, thresholdDays = DEFAULT_THRESHOLD_DAYS) => {
  const end = timeOf(not_after);
  if (Number.isNaN(end)) {
    return '';
  }
  if (end <= now) {
    return 'expired';
  }
  return end - now <= thresholdDays * DAY_MS ? 'expiring' : 'valid';
};

/**
 * The current version of a record's history, the entry marked current
 * or the last, null for a record with no history.
 *
 * @param {Object} record - The record
 * @returns {Object|null} The history entry
 */
export const currentOf = record => {
  const history = Array.isArray(record.history) ? record.history : [];
  return history.find(entry => entry.current) || history.at(-1) || null;
};

/**
 * The end a record reads its status from: its current version's end
 * while it has a history, its facts' end otherwise.
 *
 * @param {Object} record - The record
 * @returns {string} The end, empty for none
 */
export const notAfterOf = record => currentOf(record)?.not_after || record.facts?.not_after || '';

/**
 * The status of one record at `now`, empty for a record with no end.
 *
 * @param {Object} record - The record
 * @param {number} now - The reference epoch in milliseconds
 * @param {number} [thresholdDays] - The days before the end that read as expiring
 * @returns {string} `valid`, `expiring`, `expired` or empty
 */
export const recordStatus = (record, now, thresholdDays = DEFAULT_THRESHOLD_DAYS) =>
  statusOf(notAfterOf(record), now, thresholdDays);

/**
 * The engine's component kind of a record, the word its DER is handed
 * to `convert` and `public_key_hash` under: `ca` for an authority,
 * `csr` for a request, `public_key` for a key held without its private
 * half.
 *
 * @param {Object} record - The record
 * @returns {string} The engine's kind
 */
export const kindOf = record => {
  if (record.kind === 'key' && !record.private_der_b64) {
    return 'public_key';
  }
  return ENGINE_KINDS[record.kind] || record.kind;
};

/**
 * The DER a record hands the engine: a key's private half while it holds
 * one, else its public half.
 *
 * @param {Object} record - The record
 * @returns {string} The DER as base64, empty for a template
 */
export const derOf = record => record.private_der_b64 || record.public_der_b64 || '';

/**
 * The algorithm word a record's facts carry, with the bits or the curve
 * beside it: `RSA 2048`, `EC P-256`, `Ed25519`.
 *
 * @param {Object} record - The record
 * @returns {string} The word, empty for a template
 */
export const algorithmOf = record => {
  const { facts } = record;
  if (!facts?.algorithm) {
    return '';
  }
  if (facts.algorithm === 'EC') {
    return `${facts.algorithm} ${facts.curve || facts.bits}`;
  }
  return facts.algorithm === 'RSA' ? `${facts.algorithm} ${facts.bits}` : facts.algorithm;
};

/**
 * The issuer a record's facts name, its common name first, the whole
 * distinguished name without one.
 *
 * @param {Object} record - The record
 * @returns {string} The issuer, empty for none
 */
export const issuerOf = record => record.facts?.issuer?.CN || record.facts?.issuer_dn || '';

/**
 * The relationships of one record among the vault's records: the key,
 * the issuer and the request its links name, and the records whose
 * links name it.
 *
 * @param {Object} record - The record
 * @param {Array<Object>} records - Every record of the vault
 * @returns {{ key: Object|null, issuer: Object|null, request: Object|null, issued: Array<Object>, signedWith: Array<Object> }} The relationships
 */
export const relationships = (record, records) => {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const links = record.links || {};
  return {
    key: byId.get(links.key_id) || null,
    issuer: byId.get(links.issuer_id) || null,
    request: byId.get(links.request_id) || null,
    issued: records.filter(entry => entry.links?.issuer_id === record.id),
    signedWith: records.filter(entry => entry.links?.key_id === record.id),
  };
};

/**
 * The name a record is drawn under: its own, else its facts' common
 * name, else its subject, else its id.
 *
 * @param {Object} record - The record
 * @returns {string} The name
 */
export const nameOf = record =>
  record.name || record.facts?.subject?.CN || record.facts?.subject_dn || record.id;

/**
 * The file stem a record's downloads are named by: its name with every
 * character outside letters, digits, dots, dashes and underscores
 * replaced by an underscore.
 *
 * @param {Object} record - The record
 * @returns {string} The stem
 */
export const stemOf = record => nameOf(record).replace(/[^A-Za-z0-9._-]+/gu, '_');

/**
 * A fresh RFC 4122 version 4 UUID, sixteen random bytes with the version
 * and variant bits set.
 *
 * @returns {string} The UUID
 */
export const newId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};

/**
 * A new record of the vault's shape, every member present, the given
 * members laid over the defaults, the instants set to now.
 *
 * @param {Object} members - The members that differ
 * @returns {Object} The record
 */
export const newRecord = members => {
  const at = new Date().toISOString();
  return {
    id: newId(),
    kind: 'certificate',
    name: '',
    tags: [],
    notes: '',
    created_at: at,
    updated_at: at,
    facts: null,
    links: { key_id: null, issuer_id: null, request_id: null, chain_ids: [] },
    history: [],
    public_der_b64: null,
    private_der_b64: null,
    template: null,
    origin: 'local',
    remote_id: null,
    organization: '',
    created_by: '',
    synced_at: null,
    published: false,
    is_public: false,
    guest_access: false,
    ...members,
  };
};

/**
 * One history entry of a certificate's record: the next version number
 * over the history held, the DER and the validity, marked current.
 *
 * @param {Array<Object>} history - The history held
 * @param {Object} facts - The certificate's facts
 * @param {string} der_b64 - The certificate's DER as base64
 * @returns {Object} The entry
 */
export const historyEntry = (history, facts, der_b64) => ({
  version: history.length + 1,
  der_b64,
  not_before: facts?.not_before || '',
  not_after: facts?.not_after || '',
  current: true,
});

/**
 * Whether the vault already holds a record carrying the DER given, under
 * either half.
 *
 * @param {Array<Object>} records - Every record of the vault
 * @param {string} der_b64 - The DER as base64
 * @returns {boolean} True when a record holds it
 */
export const holdsDer = (records, der_b64) =>
  Boolean(der_b64) &&
  records.some(record => record.public_der_b64 === der_b64 || record.private_der_b64 === der_b64);

/**
 * Whether a record matches the navbar's query: its name, its subject,
 * its issuer, its serial, its fingerprint, its tags and its notes.
 *
 * @param {Object} record - The record
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when the record matches
 */
export const matchesRecord = (record, needle) =>
  [
    record.name,
    record.facts?.subject_dn,
    record.facts?.issuer_dn,
    record.facts?.serial_hex,
    record.facts?.fingerprint_sha256,
    record.facts?.public_key_sha256,
    ...(record.tags || []),
    record.notes,
  ]
    .filter(Boolean)
    .some(text => String(text).toLowerCase().includes(needle));
