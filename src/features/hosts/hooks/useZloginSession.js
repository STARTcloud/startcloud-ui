import { useCallback, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchZloginSessions } from '../api/consoleAPI';

import { useZoneTerminal } from './useZoneTerminal';

const activeSessionOf = (sessions, machineName) =>
  sessions.find(session => session.machine_name === machineName && session.status === 'active') ||
  null;

/**
 * The zlogin session state of one zone, hyperweaver-ui's
 * `useZloginSession`: the dialog's open and full-screen state, the start
 * of a session through the zone terminal context, which opens the
 * dialog on it, the read of the session the agent holds,
 * `GET zlogin/sessions`, adopted into the context when one is active,
 * and the paste of the browser's clipboard down the zone's socket.
 *
 * @param {Object} options - The machine and the console's state setter
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The zone name
 * @param {Function} options.setMachineDetails - The console state's setter
 * @returns {Object} The state and its handlers
 */
export const useZloginSession = ({ id, name, setMachineDetails }) => {
  const status = useStatus();
  const [showZloginConsole, setShowZloginConsole] = useState(false);
  const [isZloginFullScreen, setIsZloginFullScreen] = useState(false);
  const { startZloginSessionExplicitly, initializeSessionFromExisting, pasteTextToZone } =
    useZoneTerminal();

  const handleZloginConsole = useCallback(
    async machineName => {
      const session = await startZloginSessionExplicitly(id, machineName);
      if (!session) {
        return { success: false, message: 'Failed to start zlogin console.' };
      }
      setMachineDetails(prev => ({
        ...prev,
        zlogin_session: session,
        active_zlogin_session: true,
      }));
      setShowZloginConsole(true);
      return { success: true };
    },
    [id, startZloginSessionExplicitly, setMachineDetails]
  );

  const refreshZloginSessionStatus = useCallback(
    async machineName => {
      try {
        const active = activeSessionOf(await fetchZloginSessions(status, id), machineName);
        if (active) {
          initializeSessionFromExisting(id, machineName, active);
        }
        setMachineDetails(prev => ({
          ...prev,
          zlogin_session: active,
          active_zlogin_session: Boolean(active),
        }));
      } catch (error) {
        log.api.warn('Error reading the zlogin sessions', {
          name: machineName,
          error: error.message,
        });
        setMachineDetails(prev => ({
          ...prev,
          zlogin_session: null,
          active_zlogin_session: false,
        }));
      }
    },
    [status, id, initializeSessionFromExisting, setMachineDetails]
  );

  const pasteClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          pasteTextToZone(id, name, text);
        }
      }
    } catch (error) {
      log.component.warn('Clipboard access error', { error: error.message });
    }
  }, [id, name, pasteTextToZone]);

  return {
    showZloginConsole,
    setShowZloginConsole,
    isZloginFullScreen,
    setIsZloginFullScreen,
    handleZloginConsole,
    refreshZloginSessionStatus,
    handleZloginPreviewPaste: pasteClipboard,
    handleZloginModalPaste: pasteClipboard,
  };
};
