import { useCallback, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchVncSessionInfo, startVncSession, stopVncSession } from '../api/consoleAPI';
import { standaloneConsoleRoute } from '../utils/consoles';

const NEW_TAB = 'width=1280,height=800,scrollbars=no,resizable=yes';

const readClipboard = async ref => {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text && ref?.current?.clipboardPaste) {
        ref.current.clipboardPaste(text);
      }
    }
  } catch (error) {
    log.component.warn('Clipboard access error', { error: error.message });
  }
};

/**
 * The VNC session state of one machine, hyperweaver-ui's `useVncSession`:
 * the dialog's open and full-screen state, the load-error state with its
 * direct-console fallback, the viewer's settings, quality, compression,
 * scaling and the cursor dot, a change of the last two remounting the
 * viewer through `vncReconnectKey`, the start of a session,
 * `POST machines/{name}/vnc/start` then one read of
 * `GET machines/{name}/vnc/info`, opening the dialog or the full-window
 * console page in a new tab and marking the session active in the
 * console's own state, and the kill, `DELETE machines/{name}/vnc/stop`,
 * which clears it. hyperweaver-ui read the session's readiness every
 * half second up to ten times and verified a kill on a clock; here the
 * info is read once and the viewer's own reconnect does the rest, so
 * nothing polls.
 *
 * @param {Object} options - The machine and the console's state setter
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Function} options.setMachineDetails - The console state's setter
 * @param {Object} options.previewVncRef - The preview viewer's ref
 * @param {Object} options.modalVncRef - The dialog viewer's ref
 * @returns {Object} The state and its handlers
 */
export const useVncSession = ({ id, setMachineDetails, previewVncRef, modalVncRef }) => {
  const status = useStatus();
  const [vncSession, setVncSession] = useState(null);
  const [loadingVnc, setLoadingVnc] = useState(false);
  const [showVncConsole, setShowVncConsole] = useState(false);
  const [vncLoadError, setVncLoadError] = useState(false);
  const [isVncFullScreen, setIsVncFullScreen] = useState(false);
  const [killInProgress, setKillInProgress] = useState(false);
  const [vncReconnectKey, setVncReconnectKey] = useState(0);
  const [vncSettings, setVncSettings] = useState({
    quality: 6,
    compression: 2,
    resize: 'scale',
    showDot: true,
  });

  const handleVncQualityChange = quality => setVncSettings(prev => ({ ...prev, quality }));

  const handleVncCompressionChange = compression =>
    setVncSettings(prev => ({ ...prev, compression }));

  const handleVncResizeChange = resize => {
    setVncSettings(prev => ({ ...prev, resize }));
    setVncReconnectKey(prev => prev + 1);
  };

  const handleVncShowDotChange = showDot => {
    setVncSettings(prev => ({ ...prev, showDot }));
    setVncReconnectKey(prev => prev + 1);
  };

  const waitForVncSessionReady = useCallback(
    async machineName => {
      try {
        const info = await fetchVncSessionInfo(status, id, machineName);
        if (info?.active_vnc_session) {
          return { ready: true, sessionInfo: info.vnc_session_info || {} };
        }
        return { ready: false, reason: 'The VNC session is not active.' };
      } catch (error) {
        return { ready: false, reason: error.message };
      }
    },
    [status, id]
  );

  const handleVncConsole = useCallback(
    async (machineName, openInNewTab = false) => {
      let errorMsg = '';
      try {
        setLoadingVnc(true);
        const session = await startVncSession(status, id, machineName);
        const readiness = await waitForVncSessionReady(machineName);
        if (readiness.ready) {
          setVncSession(session);
          if (openInNewTab) {
            window.open(standaloneConsoleRoute(id, machineName, 'vnc'), '_blank', NEW_TAB);
          } else {
            setShowVncConsole(true);
          }
          setMachineDetails(prev => ({
            ...prev,
            active_vnc_session: true,
            vnc_session_info: { ...session, ...readiness.sessionInfo },
          }));
        } else {
          errorMsg = `VNC session started but not ready: ${readiness.reason}`;
        }
      } catch (error) {
        errorMsg = `Failed to start VNC console for ${machineName}: ${error.message}`;
      } finally {
        setLoadingVnc(false);
      }
      return errorMsg;
    },
    [status, id, waitForVncSessionReady, setMachineDetails]
  );

  const closeVncConsole = () => {
    setShowVncConsole(false);
    setVncLoadError(false);
    setIsVncFullScreen(false);
  };

  const handleKillVncSession = useCallback(
    async machineName => {
      if (killInProgress) {
        return { success: false, message: 'Action in progress.' };
      }
      try {
        setKillInProgress(true);
        await stopVncSession(status, id, machineName);
        setMachineDetails(prev => ({ ...prev, active_vnc_session: false, vnc_session_info: null }));
        setVncReconnectKey(prev => prev + 1);
        setShowVncConsole(false);
        setVncLoadError(false);
        setIsVncFullScreen(false);
        return { success: true };
      } catch (error) {
        return { success: false, message: `Failed to kill VNC session: ${error.message}` };
      } finally {
        setKillInProgress(false);
      }
    },
    [status, id, killInProgress, setMachineDetails]
  );

  const refreshVncSessionStatus = useCallback(
    async machineName => {
      try {
        const info = await fetchVncSessionInfo(status, id, machineName);
        const active = Boolean(info?.active_vnc_session);
        setMachineDetails(prev => ({
          ...prev,
          active_vnc_session: active,
          vnc_session_info: active ? info.vnc_session_info : null,
        }));
      } catch (error) {
        log.api.warn('Error reading the VNC session', { name: machineName, error: error.message });
        setMachineDetails(prev => ({ ...prev, active_vnc_session: false, vnc_session_info: null }));
      }
    },
    [status, id, setMachineDetails]
  );

  const handleVncClipboardPaste = text => {
    previewVncRef?.current?.clipboardPaste?.(text);
  };

  const handleVncPreviewPaste = () => readClipboard(previewVncRef);

  const handleVncModalPaste = () => readClipboard(modalVncRef);

  const openDirectVncFallback = () => {
    const url = vncSession?.directUrl || vncSession?.console_url;
    if (url) {
      window.open(url, '_blank', 'width=1024,height=768,scrollbars=yes,resizable=yes');
    }
    closeVncConsole();
  };

  return {
    vncSession,
    loadingVnc,
    setLoadingVnc,
    showVncConsole,
    setShowVncConsole,
    vncLoadError,
    setVncLoadError,
    isVncFullScreen,
    setIsVncFullScreen,
    killInProgress,
    vncReconnectKey,
    vncSettings,
    handleVncQualityChange,
    handleVncCompressionChange,
    handleVncResizeChange,
    handleVncShowDotChange,
    handleVncConsole,
    closeVncConsole,
    handleKillVncSession,
    refreshVncSessionStatus,
    handleVncClipboardPaste,
    handleVncPreviewPaste,
    handleVncModalPaste,
    openDirectVncFallback,
    waitForVncSessionReady,
  };
};
