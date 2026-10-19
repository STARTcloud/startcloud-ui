import PropTypes from 'prop-types';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaste, FaShuffle, FaStop } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { useConsoleActions } from '../hooks/useOpenConsole';
import { consolesHeld } from '../hooks/useTerminal';
import { sshAddressesOf } from '../utils/consoles';
import { pasteHeld } from '../utils/heldTerminals';
import { isServerRole } from '../utils/hosts';
import { consoleKeyOf } from '../utils/terminals';

import { startConsole, startSshPreview } from './consoleActions';
import ConsoleLaunchers from './ConsoleLaunchers';
import ConsoleSwitchButtons from './ConsoleSwitchButtons';
import SendToFooterButton from './SendToFooterButton';
import ShellTerminal from './ShellTerminal';

const PREFIX = 'console.sshConsoleDisplay';

const Busy = () => <span className="spinner-border spinner-border-sm" aria-hidden="true" />;

/**
 * The SSH console, hyperweaver-ui's third console beside VNC and zlogin
 * in the same section with the same header: Paste, the next-address
 * button of a multi-homed guest, the switch-or-start buttons of the
 * other consoles the host's row lists, Send to footer, the launchers of
 * a host that lists `host-launchers`, the native RDP client, the working
 * directory and the SFTP handler, and Stop SSH. The shell is the
 * terminal the console store holds for the session, one xterm attached
 * to `ssh/{sessionId}` at the path the role fixes, the socket opened
 * with a ticket bound to the machine, every fit sending the PTY its
 * size, held outside the page so Send to footer takes the socket with
 * it; the session comes from the start button's
 * `POST machines/{name}/ssh/start`, and the store takes the console as
 * placed on this page the moment the session is known. Stop SSH stops
 * the session and lets the terminal go.
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
  sendToFooter = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const consoles = useConsoleActions();
  const isDirect = !isServerRole(status);
  const session = machineDetails.ssh_session;
  const sessionId = session?.id || '';
  const consoleKey = consoleKeyOf({ kind: 'ssh', id, name, session });
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
    if (!sessionId || consolesHeld().some(entry => entry.key === consoleKey)) {
      return;
    }
    consoles
      .adopt({ kind: 'ssh', id, name, server, session, placed: 'page', accepts: false })
      .catch(error => {
        log.api.error('Error holding the SSH terminal', { error: error.message });
      });
  }, [sessionId, consoleKey, id, name, server, session, consoles]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          pasteHeld(consoleKey, text);
        }
      }
    } catch (error) {
      log.component.warn('Clipboard access error', { error: error.message });
    }
  };

  const handleStop = async () => {
    await consoles.close(consoleKey);
    setMachineDetails(prev => ({ ...prev, ssh_session: null }));
    setActiveConsoleType(hasVnc ? 'vnc' : 'zlogin');
  };

  const { ipCandidates, ipIndex, nextIndex } = sshAddressesOf(session);

  const handleNextAddress = async () => {
    await consoles.close(consoleKey);
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
          {sendToFooter ? (
            <SendToFooterButton onSend={() => sendToFooter('ssh')} disabled={loading} />
          ) : null}
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
        <ShellTerminal consoleKey={consoleKey} kind="ssh" className="hw-console-canvas" />
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
  sendToFooter: PropTypes.func,
};

export default memo(SshConsoleDisplay);
