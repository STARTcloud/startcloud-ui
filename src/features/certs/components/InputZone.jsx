import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEraser, FaLockOpen, FaMagnifyingGlass } from 'react-icons/fa6';

import DropOverlay from '../../../components/common/DropOverlay';
import Field from '../../../components/common/Field';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { loadCerts } from '../lib/certsClient';
import { focusOn } from '../utils/focus';
import { ACCEPT, formatOf } from '../utils/formats';
import { INPUT_LABELS, INPUT_SCHEMA } from '../utils/schemas';

import { SecretField } from './fields';

const NONE = { name: '', bytes: null };

const EMPTY_DRAFT = { text: '', password: '' };

const PASTED = 'pasted.pem';

const TEXT_CONTROLS = ['\t', '\n', '\r'];

const encode = text => new TextEncoder().encode(text);

const isControl = char => {
  const code = char.charCodeAt(0);
  return (code < 32 && !TEXT_CONTROLS.includes(char)) || code === 127;
};

/**
 * The text a read file shows in the textarea: the bytes decoded as UTF-8
 * while they are valid UTF-8 without control characters and the engine's
 * format is a text one, PEM, OpenSSH, PPK or JWK; null for binary
 * material, DER, PKCS#7 or PKCS#12, which stays a held file.
 *
 * @param {Uint8Array} bytes - The file's bytes
 * @param {string} format - The format the engine detected
 * @returns {string|null} The text, or null for binary material
 */
const shownTextOf = (bytes, format) => {
  if (formatOf(format)?.binary) {
    return null;
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return [...text].some(isControl) ? null : text;
  } catch {
    return null;
  }
};

/**
 * The one way a certs page takes material in: one textarea that is the
 * drop zone, a file dropped or pasted anywhere over it or picked through
 * the browse button drawn centered inside it while it is empty and no
 * file is held, the files of one drop read one after another in the order
 * dropped, the first naming the page's downloads and the last named in
 * the held-file chip as the file Unlock reads again, a file the browser
 * cannot open refused as a read the engine refuses is and the next file
 * still read. A read text file, PEM, OpenSSH, PPK or JWK, shows its text
 * in the textarea, and typing over it makes the typed text the material,
 * read on Read as `pasted.pem`; a binary file, DER or PKCS#12, stays held
 * with the textarea read-only reading "<name> · binary". A password is
 * drawn once the engine says the material is locked, Unlock, or Enter in
 * the password, reading it again with the password; the detection,
 * `{ format, encrypted, needs_password, components }`, is handed to
 * `onDetected` with the file's name and bytes, and Clear hands
 * `onDetected` null. A read the engine refuses is one danger notice in
 * plain words, drawn under the textarea too, and focus returns to the
 * Read control after every read.
 */
const InputZone = ({ onDetected, idPrefix = 'certs-input' }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [source, setSource] = useState(NONE);
  const [binary, setBinary] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reads, setReads] = useState(0);
  const readButton = useRef(null);
  const queue = useRef(Promise.resolve());
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

  const read = async ({ load, name, secret, shows = false }) => {
    setBusy(true);
    setError('');
    let bytes = null;
    try {
      const engine = await loadCerts();
      bytes = await load();
      const detected = engine.detect(bytes, name, secret);
      setSource({ name, bytes });
      setLocked(Boolean(detected.needs_password));
      if (shows) {
        const text = shownTextOf(bytes, detected.format);
        set('text', text ?? '');
        setBinary(text === null);
      }
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
    !binary && draft.text.trim()
      ? read({
          load: () => encode(draft.text),
          name: source.name || PASTED,
          secret: draft.password,
        })
      : read({ load: () => source.bytes, name: source.name, secret: draft.password });

  const onFile = file => {
    queue.current = queue.current.then(() => {
      set('text', '');
      return read({
        load: () => file.arrayBuffer().then(buffer => new Uint8Array(buffer)),
        name: file.name,
        secret: draft.password,
        shows: true,
      });
    });
  };

  const type = value => {
    set('text', value);
    if (source.name) {
      setSource(NONE);
    }
  };

  const clear = () => {
    setDraft(EMPTY_DRAFT);
    setSource(NONE);
    setBinary(false);
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
      <Field
        id={rules.idFor('text')}
        label={rules.labelFor('text')}
        error={rules.errors.text || ''}
        className="mb-2"
      >
        {aria => (
          <DropOverlay
            invite={!draft.text && !source.bytes}
            busy={busy}
            accept={ACCEPT}
            multiple
            dropText={t('certs.input.drop')}
            busyText={t('certs.input.reading')}
            browseText={t('certs.input.browse')}
            onFile={onFile}
            error={error}
          >
            <textarea
              {...aria}
              className="form-control font-monospace"
              name="text"
              rows={6}
              value={binary ? t('certs.input.binary', { name: source.name }) : draft.text}
              readOnly={binary}
              data-held={binary ? 'binary' : undefined}
              onChange={event => type(event.target.value)}
              onBlur={() => rules.onBlur('text')}
            />
          </DropOverlay>
        )}
      </Field>
      {source.name ? (
        <div className="mb-3">
          <span className="badge text-bg-secondary" data-chip="held-file">
            {source.name}
          </span>
        </div>
      ) : null}
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
