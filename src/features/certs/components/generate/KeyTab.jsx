import PropTypes from 'prop-types';
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaWandMagicSparkles } from 'react-icons/fa6';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import SectionCard from '../../../../components/common/SectionCard';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useFormRules } from '../../../../hooks/useFormRules';
import { useEngine } from '../../hooks/useEngine';
import { useVault } from '../../hooks/useVault';
import { downloadText, textOf } from '../../utils/download';
import { fileNameOf } from '../../utils/formats';
import { newRecord, stemOf } from '../../utils/records';
import { KEY_LABELS, KEY_SCHEMA } from '../../utils/schemas';
import { TextField } from '../fields';
import KeyTypeSelect from '../KeyTypeSelect';

import Outcome from './Outcome';

const EMPTY_DRAFT = { alg: 'rsa2048', name: '', notes: '' };

const PEM = 'application/x-pem-file';

const pemOf = (engine, der_b64) =>
  textOf(
    engine.convert({
      components: [{ kind: 'key', der_b64 }],
      to: 'pkcs8',
      password: '',
      legacy: false,
      friendly_name: '',
    }).bytes
  );

/**
 * The Key tab of the Generate page: one line saying what it makes, the
 * algorithm select, Generate making the key through the engine, its
 * glyph a spinner while it runs, then its name, required, and notes,
 * Save to vault keeping it as a key record once the rules pass and
 * Download handing the browser its PKCS#8 PEM.
 */
const KeyTab = ({ fold }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [made, setMade] = useState(null);
  const [saved, setSaved] = useState(false);
  const rules = useFormRules({
    schema: KEY_SCHEMA,
    values: draft,
    labels: KEY_LABELS,
    idPrefix: 'certs-key',
  });
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const generate = () =>
    engine.run(held => {
      const key = held.generate_key(draft.alg);
      setMade({ ...key, pem: pemOf(held, key.der_b64) });
      set('name', `${draft.alg} key`);
      setSaved(false);
      rules.reset();
    });

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    vault
      .add(
        newRecord({
          kind: 'key',
          name: draft.name.trim(),
          notes: draft.notes,
          facts: made.facts,
          private_der_b64: made.der_b64,
        })
      )
      .then(() => {
        setSaved(true);
        notify('success', t('certs.notice.saved'));
      });
  };

  const download = () =>
    downloadText(made.pem, PEM, fileNameOf(stemOf({ name: draft.name }), 'pem', 'key'));

  return (
    <SectionCard title={t('certs.generate.keyTitle')} folded={fold.folded} onFold={fold.onFold}>
      <p className="text-body-secondary">{t('certs.generate.aboutKey')}</p>
      <form onSubmit={event => event.preventDefault()} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <KeyTypeSelect draft={draft} rules={rules} onChange={set} />
        <button
          type="button"
          className="btn btn-primary"
          data-action="generate-key"
          disabled={engine.busy}
          onClick={generate}
        >
          {engine.busy ? (
            <Spinner animation="border" size="sm" role="status" className="me-1" />
          ) : (
            <FaWandMagicSparkles className="me-1" aria-hidden="true" />
          )}
          {t('certs.generate.generateKey')}
        </button>
        {made ? (
          <>
            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <TextField name="name" draft={draft} rules={rules} onChange={set} />
              </div>
              <div className="col-md-6">
                <TextField name="notes" draft={draft} rules={rules} onChange={set} />
              </div>
            </div>
            <Outcome
              title={t('certs.generate.keyMade')}
              facts={made.facts}
              pem={made.pem}
              saved={saved}
              onSave={save}
              onDownload={download}
            />
          </>
        ) : null}
      </form>
    </SectionCard>
  );
};

KeyTab.propTypes = {
  fold: PropTypes.object.isRequired,
};

export default KeyTab;
