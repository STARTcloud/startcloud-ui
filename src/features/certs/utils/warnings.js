import { statusOf } from './records';

const WEAK_RSA_BITS = 2048;

const WEAK_HASHES = ['md5', 'sha1'];

const weakHash = facts =>
  WEAK_HASHES.some(hash =>
    String(facts.signature_algorithm || '')
      .toLowerCase()
      .startsWith(hash)
  );

/**
 * The cautions a certificate's facts raise, each a `certs.warnings.*`
 * word: `expired` and `expiring` from its end, `weakKey` for an RSA key
 * under 2048 bits, `weakHash` for an MD5 or SHA-1 signature and
 * `selfSigned` for a certificate that signed itself.
 *
 * @param {Object|null} facts - The engine's facts
 * @param {number} now - The reference epoch in milliseconds
 * @param {number} [thresholdDays] - The days before the end that read as expiring
 * @returns {Array<string>} The warning words
 */
export const warningsOf = (facts, now, thresholdDays = undefined) => {
  if (!facts) {
    return [];
  }
  const words = [];
  const status = statusOf(facts.not_after, now, thresholdDays);
  if (status && status !== 'valid') {
    words.push(status);
  }
  if (facts.algorithm === 'RSA' && facts.bits < WEAK_RSA_BITS) {
    words.push('weakKey');
  }
  if (weakHash(facts)) {
    words.push('weakHash');
  }
  if (facts.self_signed && !facts.is_ca) {
    words.push('selfSigned');
  }
  return words;
};

/**
 * The alert tone of a warning word: danger for an expiry or a weak hash,
 * warning for the rest.
 *
 * @param {string} word - The warning word
 * @returns {string} The Bootstrap tone
 */
export const warningTone = word =>
  word === 'expired' || word === 'weakHash' ? 'danger' : 'warning';
