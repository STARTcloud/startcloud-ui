import PropTypes from 'prop-types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaExpand, FaPaste } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { captureFileName, consoleAdmin, saveBlob } from '../utils/consoles';

import { startConsole } from './consoleActions';
import ConsoleSwitchButtons from './ConsoleSwitchButtons';
import ZloginActionsDropdown from './ZloginActionsDropdown';
import ZoneShell from './ZoneShell';

const PREFIX = 'console.zloginConsoleDisplay';

/**
 * The zlogin console preview, hyperweaver-ui's active zlogin display:
 * the header with the session's id and start, the zlogin actions menu,
 * Paste down the zone's socket while interactive, Expand into the
 * dialog, and the switch-or-start buttons of the other consoles the
 * host's row lists, VNC, SSH and RDP; under it the zone's terminal with
 * the live-or-offline chip in its corner.
 */
const ZloginConsoleDisplay = ({
  id,
  name,
  server,
  user,
  machineDetails,
  loading,
  loadingVnc,
  previewReadOnly,
  previewReconnectKey,
  hasVnc,
  hasSsh,
  hasRdp,
  setLoading,
  setLoadingVnc,
  setError,
  setPreviewReadOnly,
  setMachineDetails,
  setActiveConsoleType,
  setShowZloginConsole,
  startVncSession,
  waitForVncSessionReady,
  forceZoneSessionCleanup,
  pasteTextToZone,
  handleZloginConsole,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const session = machineDetails.zlogin_session;
  const starters = {
    status,
    id,
    name,
    setLoading,
    setError,
    setMachineDetails,
    setActiveConsoleType,
  };
  const start = kind =>
    startConsole({ kind, starters, setLoadingVnc, startVncSession, waitForVncSessionReady });

  const kill = async () => {
    try {
      setLoading(true);
      await forceZoneSessionCleanup(id, name);
      setMachineDetails(prev => ({ ...prev, zlogin_session: null, active_zlogin_session: false }));
    } catch (error) {
      setError(`Error killing zlogin session: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const capture = () => {
    const screen = document.querySelector('.xterm-screen');
    if (screen) {
      const text = screen.textContent || screen.innerText;
      saveBlob(
        new Blob([text], { type: 'text/plain' }),
        captureFileName('zlogin-output', name, 'txt')
      );
    }
  };

  const paste = async () => {
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
  };

  return (
    <div className="hw-console-container" data-console="zlogin">
      <div className="hw-console-header">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {t('console.zloginConsoleDisplay.activeSession')}
          </h6>
          {session ? (
            <p className="small text-white-50 mb-0">
              {t('console.zloginConsoleDisplay.sessionIdStarted', {
                sessionId:
                  String(session.id || '').substring(0, 8) ||
                  t('console.zloginConsoleDisplay.unknown'),
                started: session.created_at
                  ? new Date(session.created_at).toLocaleString()
                  : t('console.zloginConsoleDisplay.unknown'),
              })}
            </p>
          ) : null}
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <ZloginActionsDropdown
            variant="button"
            onToggleReadOnly={() => setPreviewReadOnly(!previewReadOnly)}
            onKillSession={kill}
            onScreenshot={capture}
            isReadOnly={previewReadOnly}
            isAdmin={consoleAdmin(user)}
          />
          {!previewReadOnly ? (
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={paste}
              title={t('console.zloginConsoleDisplay.pasteFromClipboard')}
              aria-label={t('console.zloginConsoleDisplay.pasteFromClipboard')}
              data-action="console-paste"
            >
              <FaPaste aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => (session ? setShowZloginConsole(true) : handleZloginConsole(name))}
            disabled={loading}
            title={t('console.zloginConsoleDisplay.expandConsole')}
            aria-label={t('console.zloginConsoleDisplay.expandConsole')}
            data-action="console-expand"
          >
            <FaExpand aria-hidden="true" />
          </button>
          <ConsoleSwitchButtons
            prefix={PREFIX}
            server={server}
            current="zlogin"
            held={{ vnc: hasVnc, ssh: hasSsh, rdp: hasRdp }}
            loading={loading}
            loadingVnc={loadingVnc}
            onSwitch={setActiveConsoleType}
            onStart={start}
          />
        </div>
      </div>
      <div className="hw-console-content">
        <ZoneShell
          key={`preview-zlogin-${name}-${previewReconnectKey}-${previewReadOnly ? 'ro' : 'rw'}`}
          id={id}
          zoneName={name}
          readOnly={previewReadOnly}
          className="hw-console-zone-shell"
        />
        <div className="hw-console-status-overlay" data-note={session ? 'live' : 'offline'}>
          <FaCircle
            className={`hw-console-status-icon me-1 ${
              session ? 'hw-status-icon-active' : 'hw-status-icon-inactive'
            }`}
            aria-hidden="true"
          />
          {session
            ? t('console.zloginConsoleDisplay.live')
            : t('console.zloginConsoleDisplay.offline')}
        </div>
      </div>
    </div>
  );
};

ZloginConsoleDisplay.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
  machineDetails: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  previewReadOnly: PropTypes.bool.isRequired,
  previewReconnectKey: PropTypes.number.isRequired,
  hasVnc: PropTypes.bool.isRequired,
  hasSsh: PropTypes.bool.isRequired,
  hasRdp: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  setLoadingVnc: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setPreviewReadOnly: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  setActiveConsoleType: PropTypes.func.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
  startVncSession: PropTypes.func.isRequired,
  waitForVncSessionReady: PropTypes.func.isRequired,
  forceZoneSessionCleanup: PropTypes.func.isRequired,
  pasteTextToZone: PropTypes.func.isRequired,
  handleZloginConsole: PropTypes.func.isRequired,
};

export default memo(ZloginConsoleDisplay);
