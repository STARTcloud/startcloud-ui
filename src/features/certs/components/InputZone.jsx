import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEraser, FaLockOpen, FaMagnifyingGlass } from 'react-icons/fa6';

import UploadZone from '../../../components/common/UploadZone';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { loadCerts } from '../lib/certsClient';
import { focusOn } from '../utils/focus';
import { ACCEPT } from '../utils/formats';
import { INPUT_LABELS, INPUT_SCHEMA } from '../utils/schemas';

import { SecretField, TextAreaField } from './fields';

const NONE = { name: '', bytes: null };

const EMPTY_DRAFT = { text: '', password: '' };

const PASTED = 'pasted.pem';

const encode = text => new TextEncoder().encode(text);

/**
 * The one way a certs page takes material in: the shared upload zone,
 * open from the first draw, for dropped or picked files, each read on
 * its own, a textarea for pasted PEM, OpenSSH, PPK or JWK text read on
 * Read, and a password drawn once the engine says the material is
 * locked, Unlock, or Enter in the password, reading it again with the
 * password; the detection, `{ format, encrypted, needs_password,
 * components }`, is handed to `onDetected` with the file's name and
 * bytes, and Clear hands `onDetected` null. A read the engine refuses
 * is one danger notice in plain words, drawn under the zone too, and
 * focus returns to the Read control after every read.
 */
const InputZone = ({ onDetected, idPrefix = 'certs-input' }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [source, setSource] = useState(NONE);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reads, setReads] = useState(0);
  const readButton = useRef(null);
  const rules = useFormRules({
    schema: INPUT_SCHEMA,
    values: draft,
    labels: INPUT_LABELS,
    idPrefix,
  });

  useEffect(() => {
    if (reads > 0 && !busy) {
      focusOn(readButton.current);
    }
  }, [reads, busy]);

  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }));

  const read = async (bytes, name, secret) => {
    setBusy(true);
    setError('');
    try {
      const engine = await loadCerts();
      const detected = engine.detect(bytes, name, secret);
      setSource({ name, bytes });
      setLocked(Boolean(detected.needs_password));
      onDetected(detected, { name, bytes });
    } catch {
      const text = t('certs.notice.readFailed', { name });
      setError(text);
      notify('danger', text, { key: `${idPrefix}-read` });
      onDetected(null, { name, bytes });
    } finally {
      setBusy(false);
      setReads(current => current + 1);
    }
  };

  const readHeld = () =>
    draft.text.trim()
      ? read(encode(draft.text), source.name || PASTED, draft.password)
      : read(source.bytes, source.name, draft.password);

  const onFile = file => {
    file.arrayBuffer().then(buffer => {
      set('text', '');
      read(new Uint8Array(buffer), file.name, draft.password);
    });
  };

  const clear = () => {
    setDraft(EMPTY_DRAFT);
    setSource(NONE);
    setLocked(false);
    setError('');
    onDetected(null, NONE);
  };

  const unlockOnEnter = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      readHeld();
    }
  };

  return (
    <div data-panel={idPrefix}>
      <div className="d-flex flex-wrap align-items-start gap-2 mb-3">
        <UploadZone
          uploading={busy}
          progress={0}
          accept={ACCEPT}
          multiple
          defaultOpen
          dropText={t('certs.input.drop')}
          uploadingText={t('certs.input.reading')}
          onFile={onFile}
          error={error}
        />
        {source.name ? <span className="small text-body-secondary">{source.name}</span> : null}
      </div>
      <TextAreaField
        name="text"
        draft={draft}
        rules={rules}
        onChange={set}
        rows={6}
        monospace
        placeholder={t('certs.input.placeholder')}
      />
      {locked ? (
        <SecretField
          name="password"
          draft={draft}
          rules={rules}
          onChange={set}
          autoComplete="off"
          hint={t('certs.input.locked')}
          onKeyDown={unlockOnEnter}
        />
      ) : null}
      <div className="d-flex flex-wrap gap-2">
        <button
          ref={readButton}
          type="button"
          className="btn btn-sm btn-primary"
          data-action="read"
          disabled={busy || (!draft.text.trim() && !source.bytes)}
          onClick={readHeld}
        >
          {locked ? (
            <FaLockOpen className="me-1" aria-hidden="true" />
          ) : (
            <FaMagnifyingGlass className="me-1" aria-hidden="true" />
          )}
          {t(locked ? 'certs.input.unlock' : 'certs.input.read')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="clear"
          disabled={busy}
          onClick={clear}
        >
          <FaEraser className="me-1" aria-hidden="true" />
          {t('certs.input.clear')}
        </button>
      </div>
    </div>
  );
};

InputZone.propTypes = {
  onDetected: PropTypes.func.isRequired,
  idPrefix: PropTypes.string,
};

export default InputZone;
