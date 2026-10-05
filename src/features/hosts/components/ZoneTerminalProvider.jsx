import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { startZloginSession, stopZloginSession, zloginSocketPath } from '../api/consoleAPI';
import { socketUrl, wsTicket } from '../api/terminal';
import { ZoneTerminalContext } from '../hooks/useZoneTerminal';
import { loadTerminalPrefs } from '../utils/terminalPrefs';

const zoneKeyOf = (id, zoneName) => (id && zoneName ? `${id}:${zoneName}` : null);

let ready = null;

/**
 * The xterm addon classes the zone terminals are built from, fetched the
 * first time a zlogin session is started or adopted and never with the
 * page, once per page.
 *
 * @returns {Promise<Object>} `AttachAddon`, `ClipboardAddon`, `FitAddon`, `SearchAddon`, `SerializeAddon`, `WebLinksAddon` and `WebglAddon`
 */
const loadAddonClasses = () => {
  ready ||= Promise.all([
    import('@xterm/addon-attach'),
    import('@xterm/addon-clipboard'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-search'),
    import('@xterm/addon-serialize'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-webgl'),
  ]).then(([attach, clipboard, fit, search, serialize, links, webgl]) => ({
    AttachAddon: attach.AttachAddon,
    ClipboardAddon: clipboard.ClipboardAddon,
    FitAddon: fit.FitAddon,
    SearchAddon: search.SearchAddon,
    SerializeAddon: serialize.SerializeAddon,
    WebLinksAddon: links.WebLinksAddon,
    WebglAddon: webgl.WebglAddon,
  }));
  return ready;
};

const webglOrNull = WebglAddon => {
  try {
    return new WebglAddon();
  } catch (error) {
    log.component.warn('WebGL renderer not available', { error: error.message });
    return null;
  }
};

const openSocket = async ({ status, id, zoneName, sessionId, sockets, zoneKey }) => {
  const { ticket } = await wsTicket(status, id, zoneName);
  const socket = new WebSocket(socketUrl(status, id, zloginSocketPath(sessionId), ticket));
  socket.addEventListener('close', () => {
    if (sockets.get(zoneKey) === socket) {
      sockets.delete(zoneKey);
    }
  });
  socket.addEventListener('error', () => {
    log.api.warn('zlogin socket error', { zone: zoneName });
  });
  sockets.set(zoneKey, socket);
  return socket;
};

/**
 * The zlogin terminals of every zone a person opened, behind
 * `useZoneTerminal`, hyperweaver-ui's zone terminal context kept in the
 * hosts feature's provider so a zone's terminal outlives the surface
 * that hosts it: one set of xterm addons per zone, the fit, web links,
 * serialize, clipboard, search and WebGL addons, the attach addon made
 * on the zone's open socket, bidirectional unless the terminal is
 * read-only, so the preview and the dialog draw the same terminal in
 * turn; the options from the person's terminal preferences, the dark
 * console theme and stdin off while read-only. A session is started with
 * `POST machines/{name}/zlogin/start`, the session the agent already
 * holds of the zone stopped first, and its socket opened at
 * `zlogin/{id}` with a ticket bound to the zone; a session the agent
 * already holds is adopted the same way. A cleanup stops the session,
 * closes the socket and keeps the terminal's serialized history, which a
 * terminal restores when it draws again. A paste writes the text down the
 * socket, the keys typed. Nothing reads on a clock. What is held belongs
 * to the session: when `signedIn` changes every socket is closed and
 * the sessions forgotten.
 */
const ZoneTerminalProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const sessions = useRef(new Map());
  const sockets = useRef(new Map());
  const starting = useRef(new Set());
  const history = useRef(new Map());
  const addons = useRef(new Map());
  const [classes, setClasses] = useState(null);

  useEffect(
    () => () => {
      sockets.current.forEach(socket => socket.close());
      sockets.current.clear();
      sessions.current.clear();
    },
    [signedIn]
  );

  const ensureClasses = useCallback(async () => {
    const loaded = await loadAddonClasses();
    setClasses(current => current || loaded);
    return loaded;
  }, []);

  const addonsOf = useCallback(
    zoneKey => {
      if (!classes) {
        return null;
      }
      if (!addons.current.has(zoneKey)) {
        addons.current.set(zoneKey, {
          fit: new classes.FitAddon(),
          links: new classes.WebLinksAddon(),
          serialize: new classes.SerializeAddon(),
          clipboard: new classes.ClipboardAddon(),
          search: new classes.SearchAddon(),
          webgl: webglOrNull(classes.WebglAddon),
        });
      }
      return addons.current.get(zoneKey);
    },
    [classes]
  );

  const getZoneAddons = useCallback(
    (id, zoneName, readOnly = false) => {
      const zoneKey = zoneKeyOf(id, zoneName);
      if (!zoneKey) {
        return null;
      }
      const held = addonsOf(zoneKey);
      if (!held) {
        return null;
      }
      const socket = sockets.current.get(zoneKey);
      const attach =
        socket && socket.readyState === WebSocket.OPEN
          ? new classes.AttachAddon(socket, { bidirectional: !readOnly })
          : null;
      return [
        held.fit,
        attach,
        held.links,
        held.serialize,
        held.clipboard,
        held.search,
        held.webgl,
      ].filter(Boolean);
    },
    [addonsOf, classes]
  );

  const fitZoneTerminal = useCallback((id, zoneName) => {
    const zoneKey = zoneKeyOf(id, zoneName);
    const held = zoneKey ? addons.current.get(zoneKey) : null;
    held?.fit.fit();
  }, []);

  const getZoneOptions = useCallback((readOnly = false) => {
    const prefs = loadTerminalPrefs();
    return {
      ...prefs,
      cursorBlink: !readOnly && prefs.cursorBlink,
      theme: { background: '#000000', foreground: '#ffffff' },
      allowTransparency: false,
      disableStdin: readOnly,
      convertEol: false,
    };
  }, []);

  const preserveZoneHistory = useCallback(zoneKey => {
    const held = addons.current.get(zoneKey);
    if (held) {
      try {
        history.current.set(zoneKey, held.serialize.serialize());
      } catch (error) {
        log.component.warn('Failed to keep the zone terminal history', { error: error.message });
      }
    }
  }, []);

  const restoreZoneHistory = useCallback((zoneKey, terminal) => {
    const kept = history.current.get(zoneKey);
    if (kept && terminal) {
      try {
        terminal.clear();
        terminal.write(kept);
      } catch (error) {
        log.component.warn('Failed to restore the zone terminal history', {
          error: error.message,
        });
      }
    }
  }, []);

  const startZloginSessionExplicitly = useCallback(
    async (id, zoneName) => {
      const zoneKey = zoneKeyOf(id, zoneName);
      if (!zoneKey || starting.current.has(zoneKey)) {
        return null;
      }
      if (sessions.current.has(zoneKey)) {
        return sessions.current.get(zoneKey);
      }
      starting.current.add(zoneKey);
      try {
        const session = await startZloginSession(status, id, zoneName);
        if (!session?.id) {
          return null;
        }
        await ensureClasses();
        await openSocket({
          status,
          id,
          zoneName,
          sessionId: session.id,
          sockets: sockets.current,
          zoneKey,
        });
        sessions.current.set(zoneKey, session);
        return session;
      } catch (error) {
        log.api.error('Error starting the zlogin session', {
          zone: zoneName,
          error: error.message,
        });
        return null;
      } finally {
        starting.current.delete(zoneKey);
      }
    },
    [status, ensureClasses]
  );

  const initializeSessionFromExisting = useCallback(
    async (id, zoneName, session) => {
      const zoneKey = zoneKeyOf(id, zoneName);
      if (!zoneKey || !session?.id || sockets.current.has(zoneKey)) {
        return;
      }
      try {
        await ensureClasses();
        await openSocket({
          status,
          id,
          zoneName,
          sessionId: session.id,
          sockets: sockets.current,
          zoneKey,
        });
        sessions.current.set(zoneKey, session);
      } catch (error) {
        log.api.error('Error adopting the zlogin session', {
          zone: zoneName,
          error: error.message,
        });
      }
    },
    [status, ensureClasses]
  );

  const forceZoneSessionCleanup = useCallback(
    async (id, zoneName) => {
      const zoneKey = zoneKeyOf(id, zoneName);
      if (!zoneKey) {
        return;
      }
      preserveZoneHistory(zoneKey);
      const session = sessions.current.get(zoneKey);
      if (session) {
        try {
          await stopZloginSession(status, id, session.id);
        } catch (error) {
          log.api.warn('Error stopping the zlogin session', {
            zone: zoneName,
            error: error.message,
          });
        }
      }
      sockets.current.get(zoneKey)?.close();
      sessions.current.delete(zoneKey);
      sockets.current.delete(zoneKey);
    },
    [status, preserveZoneHistory]
  );

  const pasteTextToZone = useCallback((id, zoneName, text) => {
    const socket = sockets.current.get(zoneKeyOf(id, zoneName));
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(text);
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({
      getZoneAddons,
      getZoneOptions,
      fitZoneTerminal,
      forceZoneSessionCleanup,
      startZloginSessionExplicitly,
      initializeSessionFromExisting,
      pasteTextToZone,
      preserveZoneHistory,
      restoreZoneHistory,
    }),
    [
      getZoneAddons,
      getZoneOptions,
      fitZoneTerminal,
      forceZoneSessionCleanup,
      startZloginSessionExplicitly,
      initializeSessionFromExisting,
      pasteTextToZone,
      preserveZoneHistory,
      restoreZoneHistory,
    ]
  );

  return <ZoneTerminalContext.Provider value={value}>{children}</ZoneTerminalContext.Provider>;
};

ZoneTerminalProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default ZoneTerminalProvider;
