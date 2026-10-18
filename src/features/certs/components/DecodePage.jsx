import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaDownload, FaVault } from 'react-icons/fa6';

import Field from '../../../components/common/Field';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { copyToClipboard } from '../../../lib/clipboard';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { useVault } from '../hooks/useVault';
import { keepable, recordsOf } from '../utils/components';
import { foldOf } from '../utils/folds';
import { fileStemOf } from '../utils/formats';
import { EMPTY_READ, describeComponent, idOf, withRead } from '../utils/reads';
import { CERT_COMPONENT_KINDS, holdsDer, nowOf } from '../utils/records';
import { warningTone, warningsOf } from '../utils/warnings';

import CertFacts from './CertFacts';
import InputZone from './InputZone';

const DOWNLOADS = ['pem', 'der', 'pkcs7'];

const PICK_ID = 'certs-decode-component';

const isCert = component => CERT_COMPONENT_KINDS.includes(component.kind);

const EMPTY_INPUT = { held: EMPTY_READ, picked: '' };

const afterRead = (answer, name) => input => {
  if (!answer) {
    return EMPTY_INPUT;
  }
  const held = withRead(input.held, answer, name);
  const fresh = held.components.find(entry => !input.held.components.includes(entry));
  return { held, picked: fresh ? idOf(fresh) : input.picked };
};

const Cautions = ({ facts, thresholdDays }) => {
  const { t } = useTranslation();
  const words = warningsOf(facts, nowOf(), thresholdDays);
  return words.map(word => (
    <span
      key={word}
      className={`badge bg-${warningTone(word)}`}
      title={t(`certs.warnings.${word}`)}
    >
      {t(`certs.warnings.${word}`)}
    </span>
  ));
};

Cautions.propTypes = {
  facts: PropTypes.object.isRequired,
  thresholdDays: PropTypes.number.isRequired,
};

const ComponentSelect = ({ components, picked, onPick }) => {
  const { t, i18n } = useTranslation();
  if (components.length < 2) {
    return null;
  }
  return (
    <Field id={PICK_ID} label={t('certs.decode.pickComponent')}>
      {aria => (
        <select
          {...aria}
          className="form-select"
          value={picked}
          onChange={event => onPick(event.target.value)}
        >
          {components.map(component => (
            <option key={idOf(component)} value={idOf(component)}>
              {`${t(`certs.component.${component.kind}`)} · ${describeComponent(component, t, i18n.language)}`}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

ComponentSelect.propTypes = {
  components: PropTypes.array.isRequired,
  picked: PropTypes.string.isRequired,
  onPick: PropTypes.func.isRequired,
};

const downloadsOf = component => {
  if (isCert(component)) {
    return DOWNLOADS;
  }
  return component.kind === 'csr' ? DOWNLOADS.filter(to => to !== 'pkcs7') : [];
};

const DecodedActions = ({ component, busy, onDownload, onSave, onCopy }) => {
  const { t } = useTranslation();
  return (
    <>
      {downloadsOf(component).map(to => (
        <button
          key={to}
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action={`download-${to}`}
          disabled={busy}
          onClick={() => onDownload(to)}
        >
          <FaDownload className="me-1" aria-hidden="true" />
          {t(`certs.decode.download.${to}`)}
        </button>
      ))}
      {component.facts ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="copy-all"
          onClick={onCopy}
        >
          <FaCopy className="me-1" aria-hidden="true" />
          {t('certs.decode.copyAll')}
        </button>
      ) : null}
      {keepable(component) ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          data-action="save-vault"
          disabled={busy}
          onClick={onSave}
        >
          <FaVault className="me-1" aria-hidden="true" />
          {t('certs.convert.saveToVault')}
        </button>
      ) : null}
    </>
  );
};

DecodedActions.propTypes = {
  component: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onDownload: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

const Decoded = ({ component, thresholdDays, busy, onDownload, onSave, onCopy }) => {
  const { t } = useTranslation();
  const { facts } = component;
  const actions = (
    <DecodedActions
      component={component}
      busy={busy}
      onDownload={onDownload}
      onSave={onSave}
      onCopy={onCopy}
    />
  );
  return (
    <div data-panel="decoded">
      <SectionHeading
        title={t(`certs.component.${component.kind}`)}
        count={facts ? facts.subject_dn || '' : t('certs.component.locked')}
        state={facts ? null : 'warning'}
        badge={facts ? <Cautions facts={facts} thresholdDays={thresholdDays} /> : null}
        actions={actions}
      />
      {facts ? <CertFacts facts={facts} /> : null}
    </div>
  );
};

Decoded.propTypes = {
  component: PropTypes.object.isRequired,
  thresholdDays: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  onDownload: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

/**
 * The Decode page at `/certs/decode`: the Input card, every read adding
 * its components to the ones held exactly as Convert does, an unlocked
 * read replacing the locked component of the same file; a select over
 * every component read, the facts of the picked one under it, its
 * heading with the subject, the cautions as chips beside it, the locked
 * line for an encrypted key, and in its pane Download as PEM, DER or
 * P7B (P7B for a certificate alone), Copy all as JSON while the facts
 * are read and Save to vault of the picked component, a lone key named
 * by its file; and the line reading that nothing was understood when a
 * read found no component.
 */
const DecodePage = ({ context }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const engine = useEngine();
  const folds = useFolds(`${context.prefsPrefix}_certs_decode`);
  const [input, setInput] = useState(EMPTY_INPUT);
  const { held, picked } = input;
  const { components } = held;
  const component = components.find(entry => idOf(entry) === picked) || components.at(-1) || null;

  useEffect(() => {
    document.title = `${t('certs.sidebar.decode')} · ${context.appName}`;
  }, [context.appName, t]);

  const detected = (answer, { name }) => setInput(afterRead(answer, name));

  const pick = id => setInput(current => ({ ...current, picked: id }));

  const download = to =>
    engine.run(run => {
      const answer = run.convert({
        components: to === 'pkcs7' ? components.filter(isCert) : [component],
        to,
        password: '',
        legacy: false,
        friendly_name: '',
      });
      engine.save(answer, fileStemOf(component.source), to);
    });

  const save = () =>
    engine.run(async run => {
      const fresh = holdsDer(vault.records, component.der_b64) ? [] : [component];
      const records = recordsOf(fresh, run, fileStemOf(component.source));
      await Promise.all(records.map(entry => vault.add(entry)));
      notify(
        records.length > 0 ? 'success' : 'info',
        t(records.length > 0 ? 'certs.notice.imported' : 'certs.notice.alreadyHeld', {
          count: records.length,
        })
      );
    });

  const copy = () =>
    copyToClipboard(JSON.stringify(component.facts, null, 2)).then(
      () => notify('success', t('certs.notice.copied')),
      () => notify('danger', t('certs.notice.copyFailed'))
    );

  return (
    <div className="list row" data-page="certs-decode">
      <SectionCard title={t('certs.decode.input')} {...foldOf(folds, 'input')}>
        <InputZone onDetected={detected} />
      </SectionCard>
      {component ? (
        <>
          <ComponentSelect
            components={components}
            picked={component ? idOf(component) : ''}
            onPick={pick}
          />
          <Decoded
            component={component}
            thresholdDays={vault.preferences.threshold_days}
            busy={engine.busy}
            onDownload={download}
            onSave={save}
            onCopy={copy}
          />
        </>
      ) : null}
      {held.read && components.length === 0 ? (
        <p className="text-body-secondary">{t('certs.decode.nothing')}</p>
      ) : null}
    </div>
  );
};

DecodePage.propTypes = {
  context: pageContextShape.isRequired,
};

export default DecodePage;
