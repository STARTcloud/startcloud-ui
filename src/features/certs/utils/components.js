import { CERT_COMPONENT_KINDS, historyEntry, newRecord } from './records';

const RECORD_KINDS = {
  certificate: 'certificate',
  ca: 'authority',
  intermediate: 'authority',
  csr: 'request',
  key: 'key',
  public_key: 'key',
  ssh_certificate: 'ssh_certificate',
};

const KEY_KINDS = ['key', 'public_key'];

const isCert = component => CERT_COMPONENT_KINDS.includes(component.kind);

const isKey = component => KEY_KINDS.includes(component.kind);

const nameOfFacts = component =>
  component.facts?.subject?.CN || component.facts?.subject_dn || component.kind;

const keyName = (component, certs, stem) => {
  const owner = certs.find(cert => cert.hash === component.facts?.public_key_sha256);
  if (owner) {
    return `${nameOfFacts(owner.component)} key`;
  }
  return stem || component.facts?.public_key_sha256 || 'key';
};

const certRecord = component =>
  newRecord({
    kind: RECORD_KINDS[component.kind],
    name: nameOfFacts(component),
    facts: component.facts,
    history: [historyEntry([], component.facts, component.der_b64)],
    public_der_b64: component.der_b64,
  });

const keyRecord = (component, certs, stem) =>
  newRecord({
    kind: 'key',
    name: keyName(component, certs, stem),
    facts: component.facts,
    public_der_b64: component.kind === 'public_key' ? component.der_b64 : null,
    private_der_b64: component.kind === 'key' ? component.der_b64 : null,
  });

const otherRecord = component =>
  newRecord({
    kind: RECORD_KINDS[component.kind],
    name: nameOfFacts(component),
    facts: component.facts,
    public_der_b64: component.der_b64,
  });

/**
 * Whether a detected component can be kept in the vault: every kind but
 * an encrypted key, which has no facts until its password opens it.
 *
 * @param {Object} component - The engine's component
 * @returns {boolean} True when a record can be made of it
 */
export const keepable = component => Boolean(RECORD_KINDS[component.kind]);

/**
 * The first component of one of the kinds among a detection's, null for
 * none.
 *
 * @param {Object|null} detected - The engine's detection
 * @param {Array<string>} kinds - The component kinds wanted
 * @returns {Object|null} The component
 */
export const firstOf = (detected, kinds) =>
  (detected?.components || []).find(component => kinds.includes(component.kind)) || null;

/**
 * The records of the engine's components: a certificate a record of the
 * `certificate` kind, a CA or an intermediate one of `authority`, a CSR
 * one of `request`, a key or a public key one of `key`, an SSH
 * certificate one of `ssh_certificate`, an encrypted key none; a key
 * whose public key hash equals a certificate's is linked to that
 * certificate through the certificate's `links.key_id` and named after
 * it, and a key beside no certificate is named by `stem`, the file it
 * came from. The hashes come from `engine.public_key_hash`, one call per
 * certificate.
 *
 * @param {Array<Object>} components - The engine's components
 * @param {Object} engine - The engine of `loadCerts`
 * @param {string} [stem] - The stem of the file the components came from
 * @returns {Array<Object>} The records, the certificates' links set
 */
export const recordsOf = (components, engine, stem = '') => {
  const certs = components.filter(isCert).map(component => {
    let hash = '';
    try {
      hash = engine.public_key_hash(component.der_b64, component.kind);
    } catch {
      hash = '';
    }
    return { component, hash, record: certRecord(component) };
  });
  const keys = components.filter(isKey).map(component => keyRecord(component, certs, stem));
  certs.forEach(cert => {
    const key = keys.find(
      entry => entry.private_der_b64 && entry.facts?.public_key_sha256 === cert.hash
    );
    if (key) {
      cert.record.links = { ...cert.record.links, key_id: key.id };
    }
  });
  const others = components
    .filter(component => keepable(component) && !isCert(component) && !isKey(component))
    .map(otherRecord);
  return [...certs.map(cert => cert.record), ...keys, ...others];
};

/**
 * The components a convert takes of a record and the records beside it:
 * the record's own DER under its engine kind, for a certificate its
 * key's DER as a `key` component, and the chain's issuers after them.
 *
 * @param {Object} record - The record
 * @param {Object|null} key - The key record its links name
 * @param {Function} kindOf - The engine kind of a record
 * @param {Function} derOf - The DER a record hands the engine
 * @param {Array<{ kind: string, der_b64: string }>} [issuers] - The chain's issuers, leaf's issuer first
 * @returns {Array<{ kind: string, der_b64: string }>} The components
 */
export const componentsOf = (record, key, kindOf, derOf, issuers = []) => {
  const own = derOf(record) ? [{ kind: kindOf(record), der_b64: derOf(record) }] : [];
  const linked = key?.private_der_b64 ? [{ kind: 'key', der_b64: key.private_der_b64 }] : [];
  return [...own, ...linked, ...issuers];
};
