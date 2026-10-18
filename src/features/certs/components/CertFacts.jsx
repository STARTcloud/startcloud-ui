import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { absoluteTime } from '../../../components/common/InboxList';
import RecordRows from '../../../components/common/RecordRows';

const localeTime = (value, language) => (value ? absoluteTime(value, language) : '');

const code = value => (value ? <code className="checksum">{value}</code> : '');

const list = values => (values.length > 0 ? values.join(', ') : '');

const sansText = sans => sans.map(san => `${san.kind}:${san.value}`);

const isKeyFacts = facts => 'has_private' in facts;

const yesNo = (value, t) => t(value ? 'certs.facts.yes' : 'certs.facts.no');

const keyRows = (facts, t) => [
  { key: 'algorithm', label: t('certs.facts.algorithm'), value: facts.algorithm },
  { key: 'bits', label: t('certs.facts.bits'), value: String(facts.bits) },
  ...(facts.curve ? [{ key: 'curve', label: t('certs.facts.curve'), value: facts.curve }] : []),
  { key: 'hash', label: t('certs.facts.publicKeyHash'), value: code(facts.public_key_sha256) },
  { key: 'private', label: t('certs.facts.hasPrivate'), value: yesNo(facts.has_private, t) },
];

const validityRows = (facts, t, language) =>
  facts.not_after
    ? [
        {
          key: 'not_before',
          label: t('certs.facts.notBefore'),
          value: localeTime(facts.not_before, language),
        },
        {
          key: 'not_after',
          label: t('certs.facts.notAfter'),
          value: localeTime(facts.not_after, language),
        },
      ]
    : [];

const optionalRows = (facts, t) =>
  [
    ['issuer', 'certs.facts.issuer', facts.issuer_dn],
    ['serial', 'certs.facts.serial', code(facts.serial_hex)],
    ['sans', 'certs.facts.sans', list(sansText(facts.sans))],
    ['key_usage', 'certs.facts.keyUsage', list(facts.key_usage)],
    ['ext_key_usage', 'certs.facts.extKeyUsage', list(facts.ext_key_usage)],
    ['ski', 'certs.facts.subjectKeyId', code(facts.subject_key_id)],
    ['aki', 'certs.facts.authorityKeyId', code(facts.authority_key_id)],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

const certRows = (facts, t, language) => [
  { key: 'subject', label: t('certs.facts.subject'), value: facts.subject_dn },
  ...optionalRows(facts, t).filter(row => row.key === 'issuer' || row.key === 'serial'),
  ...validityRows(facts, t, language),
  {
    key: 'algorithm',
    label: t('certs.facts.algorithm'),
    value: `${facts.algorithm} ${facts.curve || facts.bits}`,
  },
  { key: 'signature', label: t('certs.facts.signature'), value: facts.signature_algorithm },
  { key: 'self_signed', label: t('certs.facts.selfSigned'), value: yesNo(facts.self_signed, t) },
  {
    key: 'is_ca',
    label: t('certs.facts.isCa'),
    value: facts.is_ca
      ? `${yesNo(true, t)}${facts.path_len === null ? '' : ` · ${t('certs.facts.pathLen', { n: facts.path_len })}`}`
      : yesNo(false, t),
  },
  ...optionalRows(facts, t).filter(row => !['issuer', 'serial'].includes(row.key)),
  { key: 'sha256', label: t('certs.facts.sha256'), value: code(facts.fingerprint_sha256) },
  { key: 'sha1', label: t('certs.facts.sha1'), value: code(facts.fingerprint_sha1) },
  { key: 'md5', label: t('certs.facts.md5'), value: code(facts.fingerprint_md5) },
  ...(facts.csr_signature_valid === null
    ? []
    : [
        {
          key: 'csr_signature',
          label: t('certs.facts.csrSignature'),
          value: t(
            facts.csr_signature_valid
              ? 'certs.facts.signatureValid'
              : 'certs.facts.signatureInvalid'
          ),
        },
      ]),
];

/**
 * The facts of one certificate, request or key as the record rows the
 * estate draws a record with: the subject, issuer, serial, validity,
 * algorithm, signature, self-signed and CA words, the names, usages and
 * identifiers while present, the three fingerprints and the request's
 * signature verdict; a key's facts draw its algorithm, bits, curve,
 * public key hash and whether the private half is held.
 */
const CertFacts = ({ facts, className = 'mb-3' }) => {
  const { t, i18n } = useTranslation();
  const rows = isKeyFacts(facts) ? keyRows(facts, t) : certRows(facts, t, i18n.language);
  return <RecordRows rows={rows} className={className} />;
};

CertFacts.propTypes = {
  facts: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default CertFacts;
