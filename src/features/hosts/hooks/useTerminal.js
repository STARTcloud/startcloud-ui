import { useEffect, useState, useSyncExternalStore } from 'react';

import { log } from '../../../lib/logger';
import { socketUrl, wsTicket } from '../api/terminal';

const store = {
  restarts: 0,
  prefsOpen: false,
  listeners: new Set(),
};

const subscribe = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const announce = () => store.listeners.forEach(listener => listener());

const readRestarts = () => store.restarts;

const readPrefsOpen = () => store.prefsOpen;

/**
 * Ask the open shell to restart: its session is stopped and a new one
 * started, the Restart shell row of the pane's menu and of the toggle's
 * drop-up.
 */
export const requestTerminalRestart = () => {
  store.restarts += 1;
  announce();
};

/**
 * Open the terminal preferences dialog, the Terminal preferences row of
 * the pane's menu and of the toggle's drop-up.
 */
export const openTerminalPrefs = () => {
  store.prefsOpen = true;
  announce();
};

export const closeTerminalPrefs = () => {
  store.prefsOpen = false;
  announce();
};

/**
 * Whether the terminal preferences dialog is open, one store behind
 * every call so the rows that open it and the pane that draws it agree.
 *
 * @returns {boolean} True while the dialog is open
 */
export const useTerminalPrefsOpen = () => useSyncExternalStore(subscribe, readPrefsOpen);

const IDLE = { key: '', socket: null, state: 'idle' };

const stopQuietly = ({ status, id, source, sessionId }) =>
  source.stop(status, id, sessionId).catch(error => {
    log.api.warn('Error stopping terminal session', { error: error.message });
  });

/**
 * One terminal session over a terminal source, `{ key, start, stop,
 * socketPath, ticketMachine }`: the route that starts the session, the
 * route that stops it, the socket's path from the session row and the
 * machine its ticket is bound to, none for a host-level terminal; the
 * hook is written against the source and never against one kind of
 * shell. The session starts when the view first opens on a host, is
 * stopped and started again when the host in focus changes or the
 * person restarts, and is stopped when the pane goes. `state` reads
 * `idle` before the view opened, `connecting` until the socket is open,
 * `open`, and `closed` once the start failed or the socket closed; a
 * closed socket is not opened again on a clock, `restart` opens a new
 * session.
 *
 * @param {Object} options - The pane's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object} options.source - The terminal source
 * @param {boolean} options.open - Whether the view shows
 * @returns {{ socket: WebSocket|null, state: string, restart: Function }} The session's socket and state
 */
export const useTerminal = ({ status, id, source, open }) => {
  const restarts = useSyncExternalStore(subscribe, readRestarts);
  const [opened, setOpened] = useState(false);
  const [session, setSession] = useState(IDLE);
  const key = `${source.key}|${id}|${restarts}`;

  if (open && !opened) {
    setOpened(true);
  }

  useEffect(() => {
    if (!opened) {
      return undefined;
    }
    let live = true;
    let sessionId = '';
    let socket = null;

    const connect = async () => {
      const row = await source.start(status, id);
      sessionId = row.id;
      if (!live) {
        stopQuietly({ status, id, source, sessionId });
        return;
      }
      const { ticket } = await wsTicket(status, id, source.ticketMachine);
      if (!live) {
        return;
      }
      socket = new WebSocket(socketUrl(status, id, source.socketPath(row), ticket));
      socket.addEventListener('open', () => {
        if (live) {
          setSession({ key, socket, state: 'open' });
        }
      });
      socket.addEventListener('close', () => {
        if (live) {
          setSession({ key, socket: null, state: 'closed' });
        }
      });
      setSession({ key, socket, state: 'connecting' });
    };

    connect().catch(error => {
      log.api.error('Error starting terminal session', { error: error.message });
      if (live) {
        setSession({ key, socket: null, state: 'closed' });
      }
    });

    return () => {
      live = false;
      socket?.close();
      if (sessionId) {
        stopQuietly({ status, id, source, sessionId });
      }
    };
  }, [opened, status, id, source, key]);

  const waiting = { ...IDLE, state: opened ? 'connecting' : 'idle' };
  const current = session.key === key ? session : waiting;

  return { socket: current.socket, state: current.state, restart: requestTerminalRestart };
};
