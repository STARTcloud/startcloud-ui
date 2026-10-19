import PropTypes from 'prop-types';
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaFileSignature } from 'react-icons/fa6';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import SectionCard from '../../../../components/common/SectionCard';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useFormRules } from '../../../../hooks/useFormRules';
import { useEngine } from '../../hooks/useEngine';
import { useVault } from '../../hooks/useVault';
import { downloadText } from '../../utils/download';
import { fileNameOf } from '../../utils/formats';
import { newId, newRecord, stemOf } from '../../utils/records';
import { REQUEST_LABELS, REQUEST_SCHEMA } from '../../utils/schemas';
import SubjectForm, { EMPTY_SUBJECT, fieldsOfSubject, sansOf, subjectOf } from '../SubjectForm';

import KeySource, { EMPTY_KEY_SOURCE, resolveKey } from './KeySource';
import Outcome from './Outcome';
import TemplatePicker from './TemplatePicker';

const PEM = 'application/x-pem-file';

const withIds = sans => sans.map(san => ({ id: newId(), ...san }));

/**
 * The subject members a draft takes from a template record.
 *
 * @param {Object} template - The template record
 * @returns {Object} The draft's subject members
 */
export const draftOfTemplate = template => ({
  ...fieldsOfSubject(template.template.subject),
  sans: withIds(template.template.sans || []),
  ext_key_usage: [...(template.template.ext_key_usage || [])],
});

/**
 * A template record of a subject draft and the issue's members.
 *
 * @param {string} name - The template's name
 * @param {Object} draft - The subject draft
 * @param {Object} issue - `days`, `is_ca`, `path_len` and `alg`
 * @returns {Object} The record
 */
export const templateOf = (name, draft, issue) =>
  newRecord({
    kind: 'template',
    name,
    template: {
      subject: subjectOf(draft),
      sans: sansOf(draft.sans),
      ext_key_usage: draft.ext_key_usage,
      days: issue.days,
      is_ca: issue.is_ca,
      path_len: issue.path_len,
      alg: issue.alg,
    },
  });

const EMPTY_DRAFT = { ...EMPTY_SUBJECT, ...EMPTY_KEY_SOURCE };

/**
 * The CSR tab of the Generate page: one line saying what it makes, the
 * subject form and the key source, Make CSR building the PKCS#10 through
 * the engine once the rules pass, its glyph a spinner while it runs,
 * then the optional templates of the vault under the form to load, save
 * and delete, then Save to vault keeping the request linked to its key,
 * the key kept beside it under the common name while it was generated,
 * and Download handing the browser the PEM.
 */
const RequestTab = ({ fold }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [made, setMade] = useState(null);
  const [saved, setSaved] = useState(false);
  const rules = useFormRules({
    schema: REQUEST_SCHEMA,
    values: draft,
    labels: REQUEST_LABELS,
    idPrefix: 'certs-request',
  });
  const keys = vault.records.filter(record => record.kind === 'key');
  const templates = vault.records.filter(record => record.kind === 'template');
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const make = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    engine.run(held => {
      const key = resolveKey(held, draft, keys, draft.CN.trim());
      const csr = held.make_csr({
        key_der_b64: key.record.private_der_b64,
        signature: draft.signature,
        subject: subjectOf(draft),
        sans: sansOf(draft.sans),
        ext_key_usage: draft.ext_key_usage,
      });
      const detected = held.detect(new TextEncoder().encode(csr.pem), 'request.csr', '');
      setMade({ ...csr, key, facts: detected.components[0]?.facts || null, name: draft.CN.trim() });
      setSaved(false);
    });
  };

  const save = async () => {
    if (made.key.fresh) {
      await vault.add(made.key.record);
    }
    await vault.add(
      newRecord({
        kind: 'request',
        name: made.name,
        facts: made.facts,
        public_der_b64: made.der_b64,
        links: { key_id: made.key.record.id, issuer_id: null, request_id: null, chain_ids: [] },
      })
    );
    setSaved(true);
    notify('success', t('certs.notice.saved'));
  };

  return (
    <SectionCard title={t('certs.generate.requestTitle')} folded={fold.folded} onFold={fold.onFold}>
      <p className="text-body-secondary">{t('certs.generate.aboutRequest')}</p>
      <form onSubmit={make} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <SubjectForm draft={draft} rules={rules} onChange={setDraft} />
        <KeySource draft={draft} rules={rules} onChange={set} keys={keys} />
        <button
          type="submit"
          className="btn btn-primary"
          data-action="make-request"
          disabled={engine.busy}
        >
          {engine.busy ? (
            <Spinner animation="border" size="sm" role="status" className="me-1" />
          ) : (
            <FaFileSignature className="me-1" aria-hidden="true" />
          )}
          {t('certs.generate.makeRequest')}
        </button>
      </form>
      <TemplatePicker
        idPrefix="certs-request-template"
        templates={templates}
        onLoad={template => setDraft(current => ({ ...current, ...draftOfTemplate(template) }))}
        onSave={name =>
          vault
            .add(templateOf(name, draft, { days: 0, is_ca: false, path_len: null, alg: draft.alg }))
            .then(() => notify('success', t('certs.notice.saved')))
        }
        onDelete={id => {
          const template = templates.find(entry => entry.id === id);
          if (template) {
            vault.remove(template);
          }
        }}
      />
      {made ? (
        <Outcome
          title={t('certs.generate.requestMade')}
          facts={made.facts}
          pem={made.pem}
          saved={saved}
          onSave={save}
          onDownload={() =>
            downloadText(made.pem, PEM, fileNameOf(stemOf({ name: made.name }), 'pem', 'csr'))
          }
        />
      ) : null}
    </SectionCard>
  );
};

RequestTab.propTypes = {
  fold: PropTypes.object.isRequired,
};

export default RequestTab;
