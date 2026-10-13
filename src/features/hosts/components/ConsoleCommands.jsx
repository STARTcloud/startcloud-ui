import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaClockRotateLeft, FaPaperPlane, FaXmark } from 'react-icons/fa6';

import { broadcast, useConsoleHistory } from '../hooks/useTerminal';
import { loadTerminalPrefs } from '../utils/terminalPrefs';
import { broadcastText } from '../utils/terminals';

/**
 * The Commands bar of the footer's Consoles pane, between the tab strip
 * and the terminals while two or more tabs are open: one field typed
 * once, Send writing it to every tab that accepts broadcasts as the keys
 * typed, Enter after it while the Terminal preferences say so, a
 * terminal taking it down its socket and a VNC or RDP tab as keystrokes;
 * beside the field the history of what was sent, newest first, a pick
 * filling the field again, Clear emptying it, and the count of the tabs
 * that accept over every tab. Enter in the field sends.
 */
const ConsoleCommands = ({ accepting, total }) => {
  const { t } = useTranslation();
  const history = useConsoleHistory();
  const [text, setText] = useState('');

  const send = () => {
    const typed = text;
    if (!typed) {
      return;
    }
    broadcast(typed, broadcastText(typed, loadTerminalPrefs().broadcastNewline));
    setText('');
  };

  const onKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="console-commands" data-bar="console-commands">
      <span className="console-commands-label">{t('footer.console.commands')}</span>
      <input
        type="text"
        className="form-control form-control-sm console-commands-field"
        value={text}
        placeholder={t('footer.console.commandPlaceholder')}
        aria-label={t('footer.console.commands')}
        data-field="command"
        onChange={event => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <Dropdown drop="up" align="end">
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix="btn"
          className="btn btn-sm btn-outline-secondary btn-glyph"
          title={t('footer.console.sentBefore')}
          aria-label={t('footer.console.sentBefore')}
          data-action="broadcast-history"
        >
          <FaClockRotateLeft />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {history.length === 0 ? (
            <Dropdown.ItemText className="text-body-secondary small">
              {t('footer.console.nothingSent')}
            </Dropdown.ItemText>
          ) : (
            history.map(entry => (
              <Dropdown.Item
                as="button"
                type="button"
                key={entry}
                className="font-monospace small"
                data-sent={entry}
                onClick={() => setText(entry)}
              >
                {entry}
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={!text || accepting === 0}
        data-action="broadcast-send"
        onClick={send}
      >
        <FaPaperPlane className="me-1" aria-hidden="true" />
        {t('footer.console.send')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary btn-glyph"
        disabled={!text}
        title={t('footer.console.clear')}
        aria-label={t('footer.console.clear')}
        data-action="broadcast-clear"
        onClick={() => setText('')}
      >
        <FaXmark />
      </button>
      <span className="console-commands-count text-body-secondary" data-note="accept-count">
        {t('footer.console.acceptCount', { count: accepting, total })}
      </span>
    </div>
  );
};

ConsoleCommands.propTypes = {
  accepting: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

export default ConsoleCommands;
