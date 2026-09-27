import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useCssVar } from '../../../hooks/useCssVar';
import {
  FONT_SIZE_BOUNDS,
  SCROLLBACK_BOUNDS,
  TERMINAL_FONT_SUGGESTIONS,
  loadTerminalPrefs,
  resetTerminalPrefs,
  saveTerminalPrefs,
} from '../utils/terminalPrefs';

const SCROLLBACK_STEP = 1000;

const Preview = ({ fontFamily, fontSize }) => {
  const { t } = useTranslation();
  const line = useRef(null);
  const size = Number(fontSize);
  useCssVar(line, '--terminal-preview-font', fontFamily || null);
  useCssVar(line, '--terminal-preview-size', size > 0 ? `${size}px` : null);
  return (
    <span ref={line} className="form-text terminal-preview">
      {t('footer.terminal.preview')}
    </span>
  );
};

Preview.propTypes = {
  fontFamily: PropTypes.string,
  fontSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

const PrefsForm = ({ onHide }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(loadTerminalPrefs);

  const setField = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));

  const save = () => {
    saveTerminalPrefs(draft);
    onHide();
  };

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('footer.terminal.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="terminal-prefs-font-size">
              {t('footer.terminal.fontSize')}
            </label>
            <input
              id="terminal-prefs-font-size"
              className="form-control"
              type="number"
              min={FONT_SIZE_BOUNDS.min}
              max={FONT_SIZE_BOUNDS.max}
              value={draft.fontSize}
              onChange={event => setField('fontSize', event.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="terminal-prefs-scrollback">
              {t('footer.terminal.scrollback')}
            </label>
            <input
              id="terminal-prefs-scrollback"
              className="form-control"
              type="number"
              min={SCROLLBACK_BOUNDS.min}
              max={SCROLLBACK_BOUNDS.max}
              step={SCROLLBACK_STEP}
              value={draft.scrollback}
              onChange={event => setField('scrollback', event.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="terminal-prefs-cursor-style">
              {t('footer.terminal.cursorStyle')}
            </label>
            <select
              id="terminal-prefs-cursor-style"
              className="form-select"
              value={draft.cursorStyle}
              onChange={event => setField('cursorStyle', event.target.value)}
            >
              <option value="block">{t('footer.terminal.cursorBlock')}</option>
              <option value="underline">{t('footer.terminal.cursorUnderline')}</option>
              <option value="bar">{t('footer.terminal.cursorBar')}</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <span className="form-label d-block">{t('footer.terminal.cursorBlink')}</span>
            <Form.Check
              type="switch"
              id="terminal-prefs-cursor-blink"
              className="mt-2"
              label={t(draft.cursorBlink ? 'footer.terminal.on' : 'footer.terminal.off')}
              checked={draft.cursorBlink === true}
              onChange={event => setField('cursorBlink', event.target.checked)}
            />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="terminal-prefs-font-family">
              {t('footer.terminal.fontFamily')}
            </label>
            <input
              id="terminal-prefs-font-family"
              className="form-control font-monospace"
              type="text"
              list="terminal-prefs-font-options"
              value={draft.fontFamily}
              onChange={event => setField('fontFamily', event.target.value)}
            />
            <datalist id="terminal-prefs-font-options">
              {TERMINAL_FONT_SUGGESTIONS.map(font => (
                <option key={font} value={font} />
              ))}
            </datalist>
            <span className="form-text">{t('footer.terminal.fontHint')}</span>
          </div>
          <div className="col-12">
            <Preview fontFamily={draft.fontFamily} fontSize={draft.fontSize} />
          </div>
          <div className="col-12">
            <span className="form-text">{t('footer.terminal.applyNote')}</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setDraft(resetTerminalPrefs())}>
          {t('footer.terminal.resetDefaults')}
        </Button>
        <Button variant="secondary" onClick={onHide}>
          {t('footer.terminal.cancel')}
        </Button>
        <Button variant="primary" onClick={save}>
          {t('footer.terminal.save')}
        </Button>
      </Modal.Footer>
    </>
  );
};

PrefsForm.propTypes = {
  onHide: PropTypes.func.isRequired,
};

/**
 * The terminal preferences dialog, a list dialog of the pages contract:
 * the font size (6 to 32), the scrollback (to 200000), the cursor style,
 * the cursor blink and the font family with its suggestions, a preview
 * line in the font chosen, Reset to defaults, Cancel and Save. The
 * preferences are kept in the browser under `terminal_prefs`, held to
 * their bounds on save and applied to the open terminal at once.
 */
const TerminalPrefsDialog = ({ show, onHide }) => (
  <Modal show={show} onHide={onHide} dialogClassName="list-modal" scrollable>
    <PrefsForm onHide={onHide} />
  </Modal>
);

TerminalPrefsDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default TerminalPrefsDialog;
