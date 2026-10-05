import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import PropTypes from 'prop-types';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaste, FaShuffle, FaStop } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { sshSocketPath, stopSshSession } from '../api/consoleAPI';
import { socketUrl, wsTicket } from '../api/terminal';
import { useXTerm } from '../hooks/useXTerm';
import { sshAddressesOf } from '../utils/consoles';
import { isServerRole } from '../utils/hosts';
import { loadTerminalPrefs } from '../utils/terminalPrefs';

import { startConsole, startSshPreview } from './consoleActions';
import ConsoleLaunchers from './ConsoleLaunchers';
import ConsoleSwitchButtons from './ConsoleSwitchButtons';

const PREFIX = 'console.sshConsoleDisplay';

const Busy = () => <span className="spinner-border spinner-border-sm" aria-hidden="true" />;

const stopQuietly = (status, id, sessionId) =>
  stopSshSession(status, id, sessionId).catch(error => {
    log.api.warn('Error stopping the SSH session', { error: error.message });
  });

/**
 * The SSH console, hyperweaver-ui's third console beside VNC and zlogin
 * in the same section with the same header: Paste, the next-address
 * button of a multi-homed guest, the switch-or-start buttons of the
 * other consoles the host's row lists, the launchers of a host that
 * lists `host-launchers`, the native RDP client, the working directory
 * and the SFTP handler, and Stop SSH. The shell is an xterm attached to
 * `ssh/{sessionId}` at the path the role fixes, the socket opened with
 * a ticket bound to the machine, every fit sending the PTY its size as a
 * JSON `resize` frame; the session row comes from the start button's
 * `POST machines/{name}/ssh/start`.
 */
const SshConsoleDisplay = ({
  id,
  name,
  server,
  machineDetails,
  loading,
  loadingVnc,
  setLoading,
  setLoadingVnc,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startVncSession,
  waitForVncSessionReady,
  startZloginSessionExplicitly,
  hasVnc,
  hasZlogin,
  hasRdp,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { instance, ref } = useXTerm();
  const wsRef = useRef(null);
  const isDirect = !isServerRole(status);
  const session = machineDetails.ssh_session;
  const sessionId = session?.id || '';
  const starters = {
    status,
    id,
    name,
    setLoading,
    setError,
    setMachineDetails,
    setActiveConsoleType,
  };
  const launchers = { status, id, name, isDirect, setLoading, setError };
  const start = kind =>
    startConsole({
      kind,
      starters,
      setLoadingVnc,
      startVncSession,
      waitForVncSessionReady,
      startZloginSessionExplicitly,
    });

  useEffect(() => {
    if (!instance || !sessionId) {
      return undefined;
    }
    let cancelled = false;
    let attachAddon = null;
    Object.assign(instance.options, loadTerminalPrefs());
    const fitAddon = new FitAddon();
    instance.loadAddon(fitAddon);
    instance.open(ref.current);
    fitAddon.fit();

    const sendResize = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN && instance.cols && instance.rows) {
        wsRef.current.send(
          JSON.stringify({ type: 'resize', cols: instance.cols, rows: instance.rows })
        );
      }
    };
    const resizeListener = instance.onResize(sendResize);
    const handleWindowResize = () => fitAddon.fit();
    window.addEventListener('resize', handleWindowResize);

    wsTicket(status, id, name)
      .then(({ ticket }) => {
        if (cancelled) {
          return;
        }
        const ws = new WebSocket(socketUrl(status, id, sshSocketPath(sessionId), ticket));
        wsRef.current = ws;
        ws.onopen = () => {
          attachAddon = new AttachAddon(ws);
          instance.loadAddon(attachAddon);
          fitAddon.fit();
          sendResize();
          instance.focus();
        };
        ws.onclose = () => {
          instance.writeln(`\r\n${t('console.sshConsoleDisplay.connectionClosed')}`);
        };
      })
      .catch(error => {
        log.api.error('Error opening the SSH socket', { error: error.message });
        instance.writeln(`\r\n${t('console.sshConsoleDisplay.connectionClosed')}`);
      });

    return () => {
      cancelled = true;
      resizeListener.dispose();
      window.removeEventListener('resize', handleWindowResize);
      attachAddon?.dispose();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [instance, ref, status, id, name, sessionId, t]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText && instance) {
        const text = await navigator.clipboard.readText();
        if (text) {
          instance.paste(text);
          instance.focus();
        }
      }
    } catch (error) {
      log.component.warn('Clipboard access error', { error: error.message });
    }
  };

  const handleStop = async () => {
    if (sessionId) {
      await stopQuietly(status, id, sessionId);
    }
    setMachineDetails(prev => ({ ...prev, ssh_session: null }));
    setActiveConsoleType(hasVnc ? 'vnc' : 'zlogin');
  };

  const { ipCandidates, ipIndex, nextIndex } = sshAddressesOf(session);

  const handleNextAddress = async () => {
    if (sessionId) {
      await stopQuietly(status, id, sessionId);
    }
    setMachineDetails(prev => ({ ...prev, ssh_session: null }));
    await startSshPreview({ ...starters, ipIndex: nextIndex });
  };

  return (
    <div className="hw-console-container hw-console-container-flex" data-console="ssh">
      <div className="hw-console-header flex-shrink-0">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {t('console.sshConsoleDisplay.sshLabel')} —{' '}
            {session?.ssh_username ? `${session.ssh_username}@` : ''}
            {name}
          </h6>
          <p className="small text-white-50 mb-0">
            {t('console.sshConsoleDisplay.interactiveShellDesc')}
            {session?.ssh_host ? (
              <>
                {' — '}
                <code className="text-white-50">{session.ssh_host}</code>
                {ipCandidates.length > 1
                  ? t('console.sshConsoleDisplay.addressCount', {
                      index: ipIndex + 1,
                      count: ipCandidates.length,
                    })
                  : null}
              </>
            ) : null}
          </p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={handlePaste}
            title={t('console.sshConsoleDisplay.pasteFromClipboard')}
            aria-label={t('console.sshConsoleDisplay.pasteFromClipboard')}
            data-action="console-paste"
          >
            <FaPaste aria-hidden="true" />
          </button>
          {nextIndex !== null ? (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={handleNextAddress}
              disabled={loading}
              title={t('console.sshConsoleDisplay.deadShellReconnect', {
                address: ipCandidates[nextIndex],
              })}
              aria-label={t('console.sshConsoleDisplay.deadShellReconnect', {
                address: ipCandidates[nextIndex],
              })}
              data-action="console-next-address"
            >
              {loading ? <Busy /> : <FaShuffle aria-hidden="true" />}
            </button>
          ) : null}
          <ConsoleSwitchButtons
            prefix={PREFIX}
            server={server}
            current="ssh"
            held={{ vnc: hasVnc, zlogin: hasZlogin, rdp: hasRdp }}
            loading={loading}
            loadingVnc={loadingVnc}
            onSwitch={setActiveConsoleType}
            onStart={start}
          />
          <ConsoleLaunchers
            prefix={PREFIX}
            server={server}
            launchers={launchers}
            loading={loading}
          />
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleStop}
            title={t('console.sshConsoleDisplay.stopSession')}
            data-action="console-stop"
          >
            <FaStop className="me-2" aria-hidden="true" />
            <span>{t('console.sshConsoleDisplay.stopSsh')}</span>
          </button>
        </div>
      </div>
      <div className="hw-console-content">
        <div ref={ref} className="hw-zone-shell-terminal hw-console-canvas" data-viewer="ssh" />
      </div>
    </div>
  );
};

SshConsoleDisplay.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  machineDetails: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  setLoadingVnc: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  setActiveConsoleType: PropTypes.func.isRequired,
  startVncSession: PropTypes.func.isRequired,
  waitForVncSessionReady: PropTypes.func.isRequired,
  startZloginSessionExplicitly: PropTypes.func.isRequired,
  hasVnc: PropTypes.bool.isRequired,
  hasZlogin: PropTypes.bool.isRequired,
  hasRdp: PropTypes.bool.isRequired,
};

export default memo(SshConsoleDisplay);
