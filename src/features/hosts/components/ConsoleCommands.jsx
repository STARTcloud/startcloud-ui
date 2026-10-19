import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaClockRotateLeft, FaPaperPlane, FaXmark } from 'react-icons/fa6';

import { broadcast } from '../hooks/useTerminal';
import { loadTerminalPrefs } from '../utils/terminalPrefs';
import { broadcastText } from '../utils/terminals';

import CommandsHistoryDialog from './CommandsHistoryDialog';

/**
 * The Commands bar of the footer's Consoles pane, between the tab strip
 * and the terminals while two or more tabs are open: one field typed
 * once with Clear inside it, Send, a glyph, writing it to every tab that
 * accepts broadcasts as the keys typed, Enter after it while the Terminal
 * preferences say so, a terminal taking it down its socket and a VNC or
 * RDP tab as keystrokes; the history button opening the history dialog,
 * a pick there filling the field again; and the count of the tabs that
 * accept over every tab as `accepting/total`. Enter in the field sends.
 */
const ConsoleCommands = ({ accepting, total }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

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
      <div className="input-group input-group-sm console-commands-field">
        <input
          type="text"
          className="form-control"
          value={text}
          placeholder={t('footer.console.commandPlaceholder')}
          aria-label={t('footer.console.commands')}
          data-field="command"
          onChange={event => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn btn-outline-secondary btn-glyph"
          disabled={!text}
          title={t('footer.console.clear')}
          aria-label={t('footer.console.clear')}
          data-action="broadcast-clear"
          onClick={() => setText('')}
        >
          <FaXmark />
        </button>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary btn-glyph"
        title={t('footer.console.sentBefore')}
        aria-label={t('footer.console.sentBefore')}
        data-action="broadcast-history"
        onClick={() => setHistoryOpen(true)}
      >
        <FaClockRotateLeft />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary btn-glyph"
        disabled={!text || accepting === 0}
        title={t('footer.console.send')}
        aria-label={t('footer.console.send')}
        data-action="broadcast-send"
        onClick={send}
      >
        <FaPaperPlane />
      </button>
      <span
        className="console-commands-count text-body-secondary"
        title={t('footer.console.acceptCount', { count: accepting, total })}
        data-note="accept-count"
      >
        {accepting}/{total}
      </span>
      <CommandsHistoryDialog
        show={historyOpen}
        onHide={() => setHistoryOpen(false)}
        onPick={setText}
      />
    </div>
  );
};

ConsoleCommands.propTypes = {
  accepting: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

export default ConsoleCommands;
