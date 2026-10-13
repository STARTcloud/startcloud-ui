import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { registerSender, useConsoleStates, useConsoles } from '../hooks/useTerminal';
import { fitHeld, mountHeld, sendHeld } from '../utils/heldTerminals';

const NOTICES = {
  connecting: 'footer.shell.connecting',
  closed: 'footer.shell.closed',
};

/**
 * The surface of one held terminal, the host shell's or an SSH shell's,
 * in the footer's Consoles pane or on the machine page: the terminal the
 * console store holds is drawn in this element, moved here with its
 * socket from wherever it was drawn before, and fitted whenever the
 * surface shows, the pane's `height` moves or the window is resized,
 * every fit telling the PTY its size. A broadcast reaches it through the
 * sender registered here, the string sent down its socket. The states
 * with nothing to type into, connecting and closed, draw as text over the
 * terminal; a closed socket is opened again by Reconnect, to the same
 * session, or by Restart, on a new one, and never on a clock.
 */
const ShellTerminal = ({ consoleKey, kind, active = true, height = 0, className = '' }) => {
  const { t } = useTranslation();
  const states = useConsoleStates();
  const held = useConsoles().some(entry => entry.key === consoleKey);
  const box = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  });

  const fit = useCallback(() => {
    if (activeRef.current) {
      fitHeld(consoleKey);
    }
  }, [consoleKey]);

  useEffect(() => {
    if (!held) {
      return undefined;
    }
    if (box.current) {
      mountHeld(consoleKey, box.current);
    }
    registerSender(consoleKey, text => sendHeld(consoleKey, text));
    return () => registerSender(consoleKey, null);
  }, [consoleKey, held]);

  useEffect(() => {
    if (active) {
      fit();
    }
  }, [active, height, fit]);

  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const notice = NOTICES[states[consoleKey] || 'connecting'] || '';

  return (
    <div className={`footer-shell ${className}`} data-viewer={kind}>
      <div ref={box} className="footer-shell-term" />
      {notice ? (
        <div
          className="footer-shell-notice"
          role="status"
          data-note={`shell-${states[consoleKey] || 'connecting'}`}
        >
          {t(notice)}
        </div>
      ) : null}
    </div>
  );
};

ShellTerminal.propTypes = {
  consoleKey: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
  active: PropTypes.bool,
  height: PropTypes.number,
  className: PropTypes.string,
};

export default ShellTerminal;
