import { AttachAddon } from '@xterm/addon-attach';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useXTerm } from 'react-xtermjs';
import '@xterm/xterm/css/xterm.css';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { HOST_SHELL } from '../api/terminal';
import { useFocus } from '../hooks/useFocus';
import { closeTerminalPrefs, useTerminal, useTerminalPrefsOpen } from '../hooks/useTerminal';
import { loadTerminalPrefs, onTerminalPrefs } from '../utils/terminalPrefs';

import TerminalPrefsDialog from './TerminalPrefsDialog';

const PTY_CONTROL = String.fromCharCode(0);

const NOTICES = {
  idle: 'footer.shell.noSession',
  connecting: 'footer.shell.connecting',
  closed: 'footer.shell.closed',
};

const createAddons = () => {
  const addons = {
    fit: new FitAddon(),
    clipboard: new ClipboardAddon(),
    links: new WebLinksAddon(),
    serialize: new SerializeAddon(),
    search: new SearchAddon(),
    webgl: null,
  };
  try {
    addons.webgl = new WebglAddon();
  } catch (error) {
    log.component.warn('WebGL renderer not available', { error: error.message });
  }
  return addons;
};

const loadWebgl = (terminal, addon) => {
  try {
    addon.onContextLoss(() => addon.dispose());
    terminal.loadAddon(addon);
  } catch (error) {
    log.component.warn('WebGL renderer failed to load', { error: error.message });
  }
};

const loadAddons = (terminal, addons) => {
  const { fit, clipboard, links, serialize, search, webgl } = addons;
  [fit, clipboard, links, serialize, search].forEach(addon => terminal.loadAddon(addon));
  if (webgl) {
    loadWebgl(terminal, webgl);
  }
};

const disposeAddons = addons =>
  Object.values(addons).forEach(addon => {
    try {
      addon?.dispose();
    } catch (error) {
      log.component.debug('Terminal addon already disposed', { error: error.message });
    }
  });

const applyPrefs = (terminal, prefs) => {
  Object.assign(terminal.options, prefs);
};

const fitTerminal = ({ terminal, addons, socket }) => {
  addons.fit.fit();
  if (socket?.readyState === WebSocket.OPEN && terminal.cols && terminal.rows) {
    const size = JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
    socket.send(`${PTY_CONTROL}${size}`);
  }
};

/**
 * The shell view of the footer's pane, one xterm over a terminal source
 * through `useTerminal`, today the host shell: the fit, clipboard, web
 * links, serialize, search and WebGL addons, the person's terminal
 * preferences applied as the terminal is made and again on every save,
 * the socket attached once it is open with the first newline sent, and
 * the terminal fitted to the pane whenever the view shows, the pane's
 * `height` moves under the grip or the window is resized, every fit
 * telling the PTY its size in a NUL-prefixed `{ type: 'resize', cols,
 * rows }` frame both agents accept. The states with nothing to type
 * into, no session, connecting and closed, draw as text over the
 * terminal; a closed socket is opened again by Reconnect shell, to the
 * same session, or by Restart shell, on a new one, and never on a clock.
 * The terminal preferences dialog draws here.
 */
const ShellPane = ({ active, height }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const focus = useFocus();
  const { instance, ref } = useXTerm();
  const { socket, state } = useTerminal({
    status,
    id: focus.id,
    source: HOST_SHELL,
    open: active,
  });
  const prefsOpen = useTerminalPrefsOpen();
  const ready = t('footer.shell.ready');
  const addonsRef = useRef(null);
  const socketRef = useRef(null);
  const greetedRef = useRef(null);
  const activeRef = useRef(active);
  const readyRef = useRef(ready);

  useEffect(() => {
    activeRef.current = active;
    readyRef.current = ready;
  });

  const fit = useCallback(() => {
    if (instance && addonsRef.current && activeRef.current) {
      fitTerminal({ terminal: instance, addons: addonsRef.current, socket: socketRef.current });
    }
  }, [instance]);

  useEffect(() => {
    if (!instance) {
      return undefined;
    }
    const addons = createAddons();
    loadAddons(instance, addons);
    applyPrefs(instance, loadTerminalPrefs());
    addonsRef.current = addons;
    if (greetedRef.current !== instance) {
      instance.writeln(readyRef.current);
      greetedRef.current = instance;
    }
    fit();
    const forget = onTerminalPrefs(() => {
      applyPrefs(instance, loadTerminalPrefs());
      fit();
    });
    return () => {
      forget();
      addonsRef.current = null;
      disposeAddons(addons);
    };
  }, [instance, fit]);

  useEffect(() => {
    if (!instance || !socket) {
      return undefined;
    }
    let attach = null;
    const onOpen = () => {
      attach = new AttachAddon(socket);
      instance.loadAddon(attach);
      socket.send('\n');
      socketRef.current = socket;
      fit();
    };
    if (socket.readyState === WebSocket.OPEN) {
      onOpen();
    } else {
      socket.addEventListener('open', onOpen);
    }
    return () => {
      socket.removeEventListener('open', onOpen);
      socketRef.current = null;
      attach?.dispose();
    };
  }, [instance, socket, fit]);

  useEffect(() => {
    if (active) {
      fit();
    }
  }, [active, height, fit]);

  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const notice = NOTICES[state] || '';

  return (
    <div className="footer-shell">
      <div ref={ref} className="footer-shell-term" />
      {notice ? (
        <div className="footer-shell-notice" role="status">
          {t(notice)}
        </div>
      ) : null}
      <TerminalPrefsDialog show={prefsOpen} onHide={closeTerminalPrefs} />
    </div>
  );
};

ShellPane.propTypes = {
  active: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
};

export default ShellPane;
