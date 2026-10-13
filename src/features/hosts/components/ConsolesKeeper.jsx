import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchVncInfo, fetchZloginSessions } from '../api/consoleAPI';
import { listSshSessions, listTermSessions } from '../api/terminal';
import { useConsoleActions } from '../hooks/useOpenConsole';
import { useServers } from '../hooks/useServers';
import { consolesHeld, dropConsole, dropEveryConsole } from '../hooks/useTerminal';
import { readVncReadiness } from '../hooks/useVncSession';
import { hostHasConsole, hostHasFeature } from '../utils/capabilities';
import { agentIdOf } from '../utils/hosts';
import {
  consoleKeyOf,
  isHeldKind,
  readStoredTabs,
  sessionLives,
  storedTabsOf,
  writeStoredTabs,
} from '../utils/terminals';

const heldTerminals = () => import('../utils/heldTerminals');

const LISTS = [
  { kind: 'host_shell', token: 'host-terminal', feature: true, list: listTermSessions },
  { kind: 'ssh', token: 'ssh', feature: true, list: listSshSessions },
  { kind: 'zlogin', token: 'zlogin', feature: false, list: fetchZloginSessions },
];

const offered = (server, entry) =>
  entry.feature ? hostHasFeature(server, entry.token) : hostHasConsole(server, entry.token);

const displayFacts = async (status, id, name) => {
  try {
    const info = await fetchVncInfo(status, id, name);
    return info && 'vrde_enabled' in info ? info : null;
  } catch {
    return null;
  }
};

const vncLives = async (status, id, name) => {
  const facts = await displayFacts(status, id, name);
  if (facts) {
    return Boolean(facts.running && facts.vrde_enabled);
  }
  return (await readVncReadiness(status, id, name)).ready;
};

/**
 * What keeps the console store true to the agents and the browser: on
 * sign-in, when the list of servers answers and again when the stream
 * opens fresh or answers `reset`, every placement `console_tabs` holds
 * is read back, the host shell, SSH and zlogin sessions listed from
 * each host they name, `GET term/sessions`, `GET ssh/sessions` and
 * `GET zlogin/sessions`, and the ones the agent still holds re-attached
 * where the person had them, a session the agent no longer holds
 * dropped from the map, a VNC or RDP display re-attached while the
 * machine runs; a `session-ended` event of the `sessions` topic closes
 * the matching tab with a notice; a sign-out drops every console, the
 * host shell and SSH sessions stopped, and empties the map. Nothing
 * reads on a clock.
 */
const ConsolesKeeper = ({ signedIn }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { held, loaded } = useServers();
  const actions = useConsoleActions();
  const stopHeld = useRef(null);
  const adopted = useRef(false);

  const forget = storageKey => {
    const next = readStoredTabs();
    delete next[storageKey];
    writeStoredTabs(next);
  };

  const readListed = useCallback(
    async (server, entry, wanted) => {
      const id = String(server.id);
      let sessions = [];
      try {
        sessions = await entry.list(status, id);
      } catch (error) {
        log.api.warn('Error listing sessions', { kind: entry.kind, error: error.message });
        return;
      }
      await Promise.all(
        wanted.map(([storageKey, tab]) => {
          const session = sessions.find(found => String(found.id) === storageKey);
          const alive = session && sessionLives(session);
          const key = consoleKeyOf({ kind: tab.kind, id, name: tab.name });
          if (!alive) {
            forget(storageKey);
            return null;
          }
          if (consolesHeld().some(found => found.key === key)) {
            return null;
          }
          return actions.adopt({
            kind: tab.kind,
            id,
            name: tab.name,
            server,
            session,
            placed: tab.placed,
            accepts: tab.accepts,
          });
        })
      );
    },
    [status, actions]
  );

  const readDisplay = useCallback(
    async (server, [storageKey, tab]) => {
      const id = String(server.id);
      const key = consoleKeyOf({ kind: tab.kind, id, name: tab.name, target: tab.target });
      if (consolesHeld().some(found => found.key === key)) {
        return;
      }
      if (!(await vncLives(status, id, tab.name))) {
        forget(storageKey);
        return;
      }
      await actions.adopt({
        kind: tab.kind,
        id,
        name: tab.name,
        target: tab.target,
        server,
        session: {},
        placed: tab.placed,
        accepts: tab.accepts,
      });
    },
    [status, actions]
  );

  const readOne = useCallback(
    async (server, map) => {
      const stored = storedTabsOf(map, String(server.id));
      if (stored.length === 0) {
        return;
      }
      const lists = LISTS.map(entry => ({
        entry,
        wanted: stored.filter(([, tab]) => tab.kind === entry.kind),
      })).filter(({ entry, wanted }) => wanted.length > 0 && offered(server, entry));
      const displays = stored.filter(([, tab]) => ['vnc', 'rdp'].includes(tab.kind));
      await Promise.all([
        ...lists.map(({ entry, wanted }) => readListed(server, entry, wanted)),
        ...displays.map(display => readDisplay(server, display)),
      ]);
    },
    [readListed, readDisplay]
  );

  const readEvery = useCallback(() => {
    const map = readStoredTabs();
    if (Object.keys(map).length === 0) {
      return;
    }
    held.forEach(server => {
      readOne(server, map).catch(error => {
        log.api.warn('Error re-attaching consoles', { error: error.message });
      });
    });
  }, [held, readOne]);

  const readRef = useRef(readEvery);

  useEffect(() => {
    readRef.current = readEvery;
  });

  useEffect(() => {
    if (!signedIn || !loaded || adopted.current) {
      return;
    }
    adopted.current = true;
    readRef.current();
  }, [signedIn, loaded]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed && signedIn && loaded) {
      readRef.current();
    }
  });

  useEventStream('reset', () => {
    if (signedIn && loaded) {
      readRef.current();
    }
  });

  useEventStream('session-ended', data => {
    const id = agentIdOf(data);
    const sessionId = String(data?.id || data?.session_id || '');
    const ended = consolesHeld().find(
      entry => entry.id === id && entry.session?.id && String(entry.session.id) === sessionId
    );
    if (!ended) {
      return;
    }
    dropConsole(ended.key);
    if (isHeldKind(ended.kind)) {
      heldTerminals().then(module => module.releaseHeld(ended.key));
    }
    notify('warning', t('footer.console.sessionEnded', { target: ended.label }));
  });

  useEffect(() => {
    stopHeld.current = () => {
      consolesHeld()
        .filter(entry => isHeldKind(entry.kind))
        .forEach(entry => {
          actions.close(entry.key).catch(error => {
            log.api.warn('Error closing a console', { error: error.message });
          });
        });
      dropEveryConsole();
    };
  });

  useEffect(() => {
    if (signedIn) {
      return undefined;
    }
    adopted.current = false;
    return undefined;
  }, [signedIn]);

  const wasSignedIn = useRef(signedIn);

  useEffect(() => {
    if (wasSignedIn.current && !signedIn) {
      stopHeld.current?.();
    }
    wasSignedIn.current = signedIn;
  }, [signedIn]);

  return null;
};

ConsolesKeeper.propTypes = {
  signedIn: PropTypes.bool.isRequired,
};

export default ConsolesKeeper;
