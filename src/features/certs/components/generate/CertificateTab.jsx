import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCertificate } from 'react-icons/fa6';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import SectionCard from '../../../../components/common/SectionCard';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useFormRules } from '../../../../hooks/useFormRules';
import { useEngine } from '../../hooks/useEngine';
import { useVault } from '../../hooks/useVault';
import { downloadText } from '../../utils/download';
import { fileNameOf } from '../../utils/formats';
import { historyEntry, newRecord, stemOf } from '../../utils/records';
import { CERTIFICATE_LABELS, CERTIFICATE_SCHEMA } from '../../utils/schemas';
import SubjectForm, { EMPTY_SUBJECT, sansOf, subjectOf } from '../SubjectForm';

import IssueFields, { EMPTY_ISSUE, issueOf } from './IssueFields';
import KeySource, { EMPTY_KEY_SOURCE, resolveKey } from './KeySource';
import Outcome from './Outcome';
import { draftOfTemplate, templateOf } from './RequestTab';
import TemplatePicker from './TemplatePicker';

const PEM = 'application/x-pem-file';

const EMPTY_DRAFT = { ...EMPTY_SUBJECT, ...EMPTY_KEY_SOURCE, ...EMPTY_ISSUE };

const issueOfTemplate = template => ({
  days: String(template.template.days || EMPTY_ISSUE.days),
  is_ca: Boolean(template.template.is_ca),
  path_len: template.template.path_len === null ? '' : String(template.template.path_len ?? ''),
});

/**
 * The record of an issued certificate: an authority while it is a CA,
 * a certificate otherwise, its facts and DER from the engine's answer,
 * one history entry and the links given.
 *
 * @param {Object} issued - The engine's `{ der_b64, pem, facts }`
 * @param {Object} links - The record's links
 * @returns {Object} The record
 */
export const issuedRecord = (issued, links) =>
  newRecord({
    kind: issued.facts.is_ca ? 'authority' : 'certificate',
    name: issued.facts.subject?.CN || issued.facts.subject_dn,
    facts: issued.facts,
    history: [historyEntry([], issued.facts, issued.der_b64)],
    public_der_b64: issued.der_b64,
    links: { key_id: null, issuer_id: null, request_id: null, chain_ids: [], ...links },
  });

/**
 * The file name an issued certificate's PEM downloads under.
 *
 * @param {Object} issued - The engine's `{ facts }`
 * @returns {string} The file name
 */
export const issuedFileName = issued =>
  fileNameOf(stemOf({ name: issued.facts.subject?.CN || 'certificate' }), 'pem', 'crt');

/**
 * The Certificate tab of the Generate page: the subject form, the
 * validity, the Authority switch with its path length, the key source
 * and the templates, Self-sign issuing the certificate through the
 * engine once the rules pass, busy while it runs, then Save to vault
 * keeping it as an authority while it is a CA and a certificate
 * otherwise, linked to its key, and Download handing the browser the
 * PEM.
 */
const CertificateTab = ({ fold }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [made, setMade] = useState(null);
  const [saved, setSaved] = useState(false);
  const rules = useFormRules({
    schema: CERTIFICATE_SCHEMA,
    values: draft,
    labels: CERTIFICATE_LABELS,
    idPrefix: 'certs-certificate',
  });
  const keys = vault.records.filter(record => record.kind === 'key');
  const templates = vault.records.filter(record => record.kind === 'template');
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const sign = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    engine.run(held => {
      const key = resolveKey(held, draft, keys, draft.CN.trim());
      const issued = held.self_sign({
        key_der_b64: key.record.private_der_b64,
        subject: subjectOf(draft),
        sans: sansOf(draft.sans),
        ext_key_usage: draft.ext_key_usage,
        ...issueOf(draft),
      });
      setMade({ ...issued, key });
      setSaved(false);
    });
  };

  const save = async () => {
    if (made.key.fresh) {
      await vault.add(made.key.record);
    }
    await vault.add(issuedRecord(made, { key_id: made.key.record.id }));
    setSaved(true);
    notify('success', t('certs.notice.saved'));
  };

  return (
    <SectionCard
      title={t('certs.generate.certificateTitle')}
      folded={fold.folded}
      onFold={fold.onFold}
    >
      <TemplatePicker
        idPrefix="certs-certificate-template"
        templates={templates}
        onLoad={template =>
          setDraft(current => ({
            ...current,
            ...draftOfTemplate(template),
            ...issueOfTemplate(template),
          }))
        }
        onSave={name =>
          vault
            .add(templateOf(name, draft, { ...issueOf(draft), alg: draft.alg }))
            .then(() => notify('success', t('certs.notice.saved')))
        }
        onDelete={id => {
          const template = templates.find(entry => entry.id === id);
          if (template) {
            vault.remove(template);
          }
        }}
      />
      <form onSubmit={sign} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <SubjectForm draft={draft} rules={rules} onChange={setDraft} />
        <IssueFields draft={draft} rules={rules} onChange={set} />
        <KeySource draft={draft} rules={rules} onChange={set} keys={keys} />
        <button type="submit" className="btn btn-primary" disabled={engine.busy}>
          <FaCertificate className="me-1" aria-hidden="true" />
          {t('certs.generate.selfSign')}
        </button>
      </form>
      {made ? (
        <Outcome
          title={t('certs.generate.certificateMade')}
          facts={made.facts}
          pem={made.pem}
          saved={saved}
          onSave={save}
          onDownload={() => downloadText(made.pem, PEM, issuedFileName(made))}
        />
      ) : null}
    </SectionCard>
  );
};

CertificateTab.propTypes = {
  fold: PropTypes.object.isRequired,
};

export default CertificateTab;
