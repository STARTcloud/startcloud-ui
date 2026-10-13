import { AttachAddon } from '@xterm/addon-attach';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

import { log } from '../../../lib/logger';
import { socketUrl, wsTicket } from '../api/terminal';
import { setConsoleState } from '../hooks/useTerminal';

import { loadTerminalPrefs, onTerminalPrefs, terminalOptionsOf } from './terminalPrefs';

const PTY_CONTROL = String.fromCharCode(0);

const DEFAULTS = { theme: { background: '#101420' } };

const held = new Map();

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

const applyPrefs = terminal => {
  Object.assign(terminal.options, terminalOptionsOf(loadTerminalPrefs()));
};

const sendSize = entry => {
  const { terminal, socket } = entry;
  if (socket?.readyState === WebSocket.OPEN && terminal.cols && terminal.rows) {
    const size = JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
    socket.send(`${PTY_CONTROL}${size}`);
  }
};

/**
 * Fit one held terminal to the element it is open on and tell the PTY
 * its size in the NUL-prefixed `{ type: 'resize', cols, rows }` frame
 * both agents accept; nothing while the terminal is not open or its
 * element is not drawn.
 *
 * @param {string} key - The console's key
 */
export const fitHeld = key => {
  const entry = held.get(key);
  if (!entry?.terminal.element || entry.terminal.element.offsetWidth === 0) {
    return;
  }
  try {
    entry.addons.fit.fit();
  } catch (error) {
    log.component.debug('Terminal fit skipped', { error: error.message });
    return;
  }
  sendSize(entry);
};

onTerminalPrefs(() => {
  held.forEach((entry, key) => {
    applyPrefs(entry.terminal);
    fitHeld(key);
  });
});

const connect = async entry => {
  const { key, status, id, source, session } = entry;
  const { ticket } = await wsTicket(status, id, source.ticketMachine);
  if (held.get(key) !== entry) {
    return;
  }
  const socket = new WebSocket(socketUrl(status, id, source.socketPath(session), ticket));
  entry.socket = socket;
  socket.addEventListener('open', () => {
    if (held.get(key) !== entry || entry.socket !== socket) {
      return;
    }
    entry.attach = new AttachAddon(socket);
    entry.terminal.loadAddon(entry.attach);
    if (source.hello) {
      socket.send(source.hello);
    }
    setConsoleState(key, 'open');
    fitHeld(key);
  });
  socket.addEventListener('close', () => {
    if (held.get(key) === entry && entry.socket === socket) {
      entry.socket = null;
      setConsoleState(key, 'closed');
    }
  });
  setConsoleState(key, 'connecting');
};

const closeSocket = entry => {
  entry.attach?.dispose();
  entry.attach = null;
  entry.socket?.close();
  entry.socket = null;
};

/**
 * Hold one terminal for a console, the host shell's or an SSH shell's:
 * one xterm with the fit, clipboard, web links, serialize, search and
 * WebGL addons and the person's terminal preferences, greeted with
 * `greeting` once, and one socket to the session with a ticket of its
 * own, the socket attached as it opens and the source's `hello` sent; the
 * terminal outlives every surface that draws it, so a console moved
 * between the footer and the page keeps its socket, which on
 * hyperweaver-agent is the shell itself. A console already held keeps
 * what it holds.
 *
 * @param {Object} options - The console's side
 * @param {string} options.key - The console's key
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object} options.source - The terminal source
 * @param {Object} options.session - The session the agent answered
 * @param {string} [options.greeting] - The line written before the socket opens
 */
export const holdTerminal = ({ key, status, id, source, session, greeting = '' }) => {
  if (held.has(key)) {
    return;
  }
  const terminal = new Terminal({ ...DEFAULTS, ...terminalOptionsOf(loadTerminalPrefs()) });
  const addons = createAddons();
  loadAddons(terminal, addons);
  if (greeting) {
    terminal.writeln(greeting);
  }
  const entry = { key, status, id, source, session, terminal, addons, socket: null, attach: null };
  held.set(key, entry);
  connect(entry).catch(error => {
    log.api.error('Error connecting terminal session', { error: error.message });
    if (held.get(key) === entry) {
      setConsoleState(key, 'closed');
    }
  });
};

/**
 * Close the held socket of a console and open a new one to the same
 * session with a new ticket, the session left running, Reconnect shell.
 *
 * @param {string} key - The console's key
 */
export const reconnectHeld = key => {
  const entry = held.get(key);
  if (!entry) {
    return;
  }
  closeSocket(entry);
  connect(entry).catch(error => {
    log.api.error('Error connecting terminal session', { error: error.message });
    if (held.get(key) === entry) {
      setConsoleState(key, 'closed');
    }
  });
};

/**
 * Point a held console at a new session, the terminal kept, its socket
 * closed and a new one opened to the new session, Restart shell.
 *
 * @param {string} key - The console's key
 * @param {Object} session - The new session the agent answered
 */
export const rejoinHeld = (key, session) => {
  const entry = held.get(key);
  if (!entry) {
    return;
  }
  closeSocket(entry);
  entry.session = session;
  entry.terminal.reset();
  connect(entry).catch(error => {
    log.api.error('Error connecting terminal session', { error: error.message });
    if (held.get(key) === entry) {
      setConsoleState(key, 'closed');
    }
  });
};

/**
 * Let a held console go: its socket closed, its addons and terminal
 * disposed, its element gone with them.
 *
 * @param {string} key - The console's key
 */
export const releaseHeld = key => {
  const entry = held.get(key);
  if (!entry) {
    return;
  }
  held.delete(key);
  closeSocket(entry);
  disposeAddons(entry.addons);
  entry.terminal.dispose();
};

/**
 * Draw a held terminal in an element: opened there the first time and
 * moved there, its own element re-parented, every time after, so the
 * terminal, its scrollback and its socket follow the surface that draws
 * it; then fitted.
 *
 * @param {string} key - The console's key
 * @param {HTMLElement} element - The element to draw in
 * @returns {boolean} True while a terminal is held under the key
 */
export const mountHeld = (key, element) => {
  const entry = held.get(key);
  if (!entry) {
    return false;
  }
  if (!entry.terminal.element) {
    entry.terminal.open(element);
  } else if (entry.terminal.element.parentElement !== element) {
    element.appendChild(entry.terminal.element);
  }
  fitHeld(key);
  return true;
};

/**
 * Write text into a held console's terminal as typed, the way a paste
 * reaches the shell, and focus it.
 *
 * @param {string} key - The console's key
 * @param {string} text - The text
 * @returns {boolean} True while the console is held and its socket open
 */
export const pasteHeld = (key, text) => {
  const entry = held.get(key);
  if (!entry || entry.socket?.readyState !== WebSocket.OPEN) {
    return false;
  }
  entry.terminal.paste(text);
  entry.terminal.focus();
  return true;
};

/**
 * Send text down a held console's socket, the keys typed, the way a
 * broadcast reaches the shell.
 *
 * @param {string} key - The console's key
 * @param {string} text - The text
 * @returns {boolean} True while the console is held and its socket open
 */
export const sendHeld = (key, text) => {
  const entry = held.get(key);
  if (!entry || entry.socket?.readyState !== WebSocket.OPEN) {
    return false;
  }
  entry.socket.send(text);
  return true;
};

/**
 * Focus a held console's terminal.
 *
 * @param {string} key - The console's key
 */
export const focusHeld = key => {
  held.get(key)?.terminal.focus();
};

/**
 * The session a held console is joined to.
 *
 * @param {string} key - The console's key
 * @returns {Object|null} The session
 */
export const heldSession = key => held.get(key)?.session || null;
