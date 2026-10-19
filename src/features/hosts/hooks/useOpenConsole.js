import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { startVncSession } from '../api/consoleAPI';
import { HOST_SHELL, sshShell } from '../api/terminal';
import {
  startRdpPreview,
  startSshPreview,
  startVncPreview,
  startZloginPreview,
} from '../components/consoleActions';
import { zoneKeyOf } from '../components/ZoneTerminalProvider';
import { hostLabel, machineNoun } from '../utils/hosts';
import { consoleKeyOf, isHeldKind } from '../utils/terminals';

import {
  activateConsole,
  addConsole,
  consolesHeld,
  dropConsole,
  placeConsole,
  setConsoleSession,
  turnConsole,
} from './useTerminal';
import { readVncReadiness } from './useVncSession';
import { useZoneTerminal } from './useZoneTerminal';

const heldTerminals = () => import('../utils/heldTerminals');

const NOOP = () => undefined;

const capture = () => {
  let details = {};
  return {
    setMachineDetails: updater => {
      details = typeof updater === 'function' ? updater(details) : updater;
    },
    read: () => details,
  };
};

const stopQuietly = (source, status, id, sessionId) =>
  source.stop(status, id, sessionId).catch(error => {
    log.api.warn('Error stopping terminal session', { error: error.message });
  });

const sourceOf = entry =>
  entry.kind === 'host_shell'
    ? HOST_SHELL
    : sshShell(entry.name, 0, entry.session?.credential_id || '');

const withCredential = (session, entry) =>
  entry.session?.credential_id
    ? { ...session, credential_id: entry.session.credential_id }
    : session;

const othersOf = ({ kind, id, name, session }) =>
  isHeldKind(kind)
    ? consolesHeld().filter(
        entry =>
          entry.kind === kind &&
          entry.id === id &&
          entry.name === name &&
          String(entry.session?.id || '') !== String(session?.id || '')
      ).length
    : 0;

/**
 * The openers and the actions of the console store, the ones that reach
 * an agent or the zone terminal provider: `open` starts a console of one
 * kind and adds it, the host shell through `POST term/start`, SSH, VNC,
 * RDP and zlogin through the one start each console header calls, SSH
 * and RDP with the machine's credential `credentialId` names, the
 * zlogin session through the provider, a host shell or an SSH shell
 * started afresh on every open, each session its own tab numbered after
 * the first of its host or machine, a display or a zlogin terminal
 * already open brought to the front instead; `adopt` adds a console over
 * a session the agent already holds or the page already draws; `close`
 * drops one and stops what it started, the host shell's and SSH's
 * session through their stop route, the zlogin session through the
 * provider's cleanup, the VNC display and the RDP bridge left as they
 * are; `reconnect` opens a new socket to the same session of a held
 * console and draws a VNC or RDP viewer again; `restart` stops the
 * session of a held console and starts a new one, an SSH shell with the
 * credential its session carries, and stops and starts
 * a zlogin session through the provider; `move` places a console in the
 * footer or on the page, a zlogin terminal's history kept across the
 * move through the provider's own preserve and restore. A refusal is
 * one danger notice.
 *
 * @returns {{ open: Function, adopt: Function, close: Function, reconnect: Function, restart: Function, move: Function }} The actions
 */
export const useConsoleActions = () => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const {
    startZloginSessionExplicitly,
    initializeSessionFromExisting,
    forceZoneSessionCleanup,
    preserveZoneHistory,
  } = useZoneTerminal();

  const setError = useCallback(message => notify('danger', message), [notify]);

  const hold = useCallback(
    (entry, session) =>
      heldTerminals().then(module =>
        module.holdTerminal({
          key: entry.key,
          status,
          id: entry.id,
          source: sourceOf(entry),
          session,
          greeting: entry.kind === 'host_shell' ? t('footer.shell.ready') : '',
        })
      ),
    [status, t]
  );

  const adopt = useCallback(
    async ({ kind, id, name = '', target = '', server = null, session, placed, accepts }) => {
      const key = consoleKeyOf({ kind, id, name, target, session });
      const base = name || (server ? hostLabel(server) : String(id));
      const others = othersOf({ kind, id, name, session });
      const entry = {
        key,
        kind,
        id,
        name,
        target,
        label: others > 0 ? `${base} ${others + 1}` : base,
        noun: machineNoun(server ? [server] : []),
        session,
        placed,
        accepts: Boolean(accepts),
      };
      if (isHeldKind(kind)) {
        await hold(entry, session);
      }
      if (kind === 'zlogin') {
        await initializeSessionFromExisting(id, name, session);
      }
      addConsole(entry);
      return entry;
    },
    [hold, initializeSessionFromExisting]
  );

  const start = useCallback(
    async ({ kind, id, name, target, credentialId }) => {
      if (kind === 'host_shell') {
        return HOST_SHELL.start(status, id);
      }
      const taken = capture();
      const starters = {
        status,
        id,
        name,
        setLoading: NOOP,
        setError,
        setMachineDetails: taken.setMachineDetails,
        setActiveConsoleType: NOOP,
      };
      if (kind === 'ssh') {
        await startSshPreview({ ...starters, credentialId });
        return taken.read().ssh_session || null;
      }
      if (kind === 'zlogin') {
        await startZloginPreview({ ...starters, startZloginSessionExplicitly });
        return taken.read().zlogin_session || null;
      }
      if (kind === 'vnc') {
        await startVncPreview({
          ...starters,
          setLoadingVnc: NOOP,
          startVncSession,
          waitForVncSessionReady: machineName => readVncReadiness(status, id, machineName),
        });
        return taken.read().active_vnc_session ? taken.read().vnc_session_info || {} : null;
      }
      await startRdpPreview({ ...starters, target: target || 'console', credentialId });
      return taken.read().rdp_session || null;
    },
    [status, setError, startZloginSessionExplicitly]
  );

  const open = useCallback(
    async ({
      kind,
      id,
      name = '',
      target = '',
      server = null,
      placed = 'footer',
      credentialId = '',
    }) => {
      if (!isHeldKind(kind)) {
        const key = consoleKeyOf({ kind, id, name, target });
        const existing = consolesHeld().find(entry => entry.key === key);
        if (existing) {
          if (existing.placed === placed) {
            activateConsole(key);
          } else {
            placeConsole(key, placed);
          }
          return existing;
        }
      }
      let session = null;
      try {
        session = await start({ kind, id, name, target, credentialId });
      } catch (error) {
        setError(error.message);
        return null;
      }
      if (!session) {
        return null;
      }
      return adopt({ kind, id, name, target, server, session, placed, accepts: false });
    },
    [start, adopt, setError]
  );

  const close = useCallback(
    async key => {
      const entry = consolesHeld().find(held => held.key === key);
      if (!entry) {
        return;
      }
      dropConsole(key);
      if (isHeldKind(entry.kind)) {
        const module = await heldTerminals();
        const session = module.heldSession(key) || entry.session;
        module.releaseHeld(key);
        if (session?.id) {
          await stopQuietly(sourceOf(entry), status, entry.id, session.id);
        }
      } else if (entry.kind === 'zlogin') {
        await forceZoneSessionCleanup(entry.id, entry.name);
      }
    },
    [status, forceZoneSessionCleanup]
  );

  const reconnect = useCallback(async key => {
    const entry = consolesHeld().find(held => held.key === key);
    if (!entry) {
      return;
    }
    if (isHeldKind(entry.kind)) {
      (await heldTerminals()).reconnectHeld(key);
      return;
    }
    turnConsole(key);
  }, []);

  const restart = useCallback(
    async key => {
      const entry = consolesHeld().find(held => held.key === key);
      if (!entry) {
        return;
      }
      if (isHeldKind(entry.kind)) {
        const module = await heldTerminals();
        const old = module.heldSession(key) || entry.session;
        if (old?.id) {
          await stopQuietly(sourceOf(entry), status, entry.id, old.id);
        }
        try {
          const session = withCredential(await sourceOf(entry).start(status, entry.id), entry);
          setConsoleSession(key, session);
          module.rejoinHeld(key, session);
        } catch (error) {
          setError(error.message);
        }
        return;
      }
      if (entry.kind === 'zlogin') {
        await forceZoneSessionCleanup(entry.id, entry.name);
        const session = await startZloginSessionExplicitly(entry.id, entry.name);
        if (session) {
          setConsoleSession(key, session);
        } else {
          setError(t('footer.console.restartFailed', { target: entry.label }));
        }
        turnConsole(key);
        return;
      }
      turnConsole(key);
    },
    [status, setError, forceZoneSessionCleanup, startZloginSessionExplicitly, t]
  );

  const move = useCallback(
    (key, placed) => {
      const entry = consolesHeld().find(held => held.key === key);
      if (!entry) {
        return;
      }
      if (entry.kind === 'zlogin') {
        preserveZoneHistory(zoneKeyOf(entry.id, entry.name));
      }
      placeConsole(key, placed);
    },
    [preserveZoneHistory]
  );

  return useMemo(
    () => ({ open, adopt, close, reconnect, restart, move }),
    [open, adopt, close, reconnect, restart, move]
  );
};
