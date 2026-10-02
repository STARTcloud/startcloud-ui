import PropTypes from 'prop-types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpand, FaPaste } from 'react-icons/fa6';

import { useFallbackSrc } from '../../../components/common/useFallbackSrc';
import { brandLogoUrl, brandMarkUrl } from '../../../config/brand';
import { useStatus } from '../../../contexts/StatusContext';
import { useChosenTheme } from '../../../hooks/useTheme';
import { log } from '../../../lib/logger';
import { useConsoleScreenshot } from '../hooks/useConsoleScreenshot';
import { hostHasFeature } from '../utils/capabilities';
import { captureFileName, consoleAdmin, saveBlob } from '../utils/consoles';

import { startConsole } from './consoleActions';
import ConsoleSwitchButtons from './ConsoleSwitchButtons';
import VncActionsDropdown from './VncActionsDropdown';
import VncViewerReact from './VncViewerReact';

const PREFIX = 'console.vncConsoleDisplay';

/**
 * The VNC console preview, hyperweaver-ui's active VNC display: the
 * header with the session's web port and start, the VNC actions menu,
 * Paste from the browser's clipboard while interactive, Expand into the
 * dialog, and the switch-or-start buttons of the other consoles the
 * host's row lists, zlogin, SSH and RDP; under it the viewer over the
 * session, or, while no session is active, one frame of the screen on a
 * host that lists `machine-screenshot` and the placeholder otherwise.
 */
const VncConsoleDisplay = ({
  id,
  name,
  server,
  user,
  running,
  turn,
  machineDetails,
  loading,
  loadingVnc,
  previewVncViewOnly,
  vncReconnectKey,
  vncSettings,
  vncRef,
  hasZlogin,
  hasRdp,
  hasSsh,
  setLoading,
  setError,
  setPreviewVncViewOnly,
  setMachineDetails,
  setActiveConsoleType,
  startZloginSessionExplicitly,
  handleVncConsole,
  handleKillVncSession,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { theme, themes } = useChosenTheme();
  const mark = useFallbackSrc(
    brandMarkUrl(status.brand, theme, themes),
    brandLogoUrl(status.brand)
  );
  const session = machineDetails.vnc_session_info;
  const screenshotUrl = useConsoleScreenshot({
    status,
    id,
    name,
    asked: !session && running && hostHasFeature(server, 'machine-screenshot'),
    turn,
  });

  const screenshot = () => {
    const canvas = document.querySelector('.vnc-viewer-react canvas');
    canvas?.toBlob(blob => saveBlob(blob, captureFileName('vnc-screenshot', name, 'png')));
  };

  const paste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && vncRef.current?.clipboardPaste) {
          vncRef.current.clipboardPaste(text);
        }
      }
    } catch (error) {
      log.component.warn('Clipboard access error', { error: error.message });
    }
  };

  const starters = {
    status,
    id,
    name,
    setLoading,
    setError,
    setMachineDetails,
    setActiveConsoleType,
  };
  const start = kind => startConsole({ kind, starters, startZloginSessionExplicitly });

  let content = null;
  if (session) {
    content = (
      <VncViewerReact
        ref={vncRef}
        key={`vnc-preview-${name}-${previewVncViewOnly}-${vncReconnectKey}`}
        id={id}
        machineName={name}
        viewOnly={previewVncViewOnly}
        autoConnect
        showControls={false}
        quality={vncSettings.quality}
        compression={vncSettings.compression}
        resize={vncSettings.resize}
        showDot={vncSettings.showDot}
        resizeSession={vncSettings.resize === 'remote'}
        className="hw-vnc-container"
      />
    );
  } else if (screenshotUrl) {
    content = (
      <img
        src={screenshotUrl}
        alt={t('console.vncConsoleDisplay.consolePreviewAlt', { machineName: name })}
        className="hw-console-screenshot"
      />
    );
  } else {
    content = (
      <div className="hw-console-placeholder" data-note="console-placeholder">
        <div className="text-center">
          <div className="mb-3">
            <img
              src={mark.src}
              onError={mark.onError}
              alt={t('console.vncConsoleDisplay.startConsoleAlt')}
              className="hw-startup-icon"
            />
          </div>
          <div className="fs-6 fw-medium">{t('console.vncConsoleDisplay.noConsoleSession')}</div>
          <div className="small mt-2 opacity-75">{t('console.vncConsoleDisplay.clickToStart')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-console-container" data-console="vnc">
      <div className="hw-console-header">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {t('console.vncConsoleDisplay.activeSession')}
          </h6>
          {session?.web_port ? (
            <p className="small text-white-50 mb-0">
              {t('console.vncConsoleDisplay.portStarted', {
                port: session.web_port,
                started: session.created_at
                  ? new Date(session.created_at).toLocaleString()
                  : t('console.vncConsoleDisplay.unknown'),
              })}
            </p>
          ) : null}
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <VncActionsDropdown
            vncRef={vncRef}
            variant="button"
            onToggleReadOnly={() => setPreviewVncViewOnly(!previewVncViewOnly)}
            onScreenshot={screenshot}
            onNewTab={() => handleVncConsole(name, true)}
            onKillSession={() => handleKillVncSession(name)}
            isReadOnly={previewVncViewOnly}
            isAdmin={consoleAdmin(user)}
            quality={vncSettings.quality}
            compression={vncSettings.compression}
            resize={vncSettings.resize}
            showDot={vncSettings.showDot}
            onQualityChange={handleVncQualityChange}
            onCompressionChange={handleVncCompressionChange}
            onResizeChange={handleVncResizeChange}
            onShowDotChange={handleVncShowDotChange}
            onClipboardPaste={handleVncClipboardPaste}
          />
          {!previewVncViewOnly ? (
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={paste}
              title={t('console.vncConsoleDisplay.pasteFromClipboard')}
              aria-label={t('console.vncConsoleDisplay.pasteFromClipboard')}
              data-action="console-paste"
            >
              <FaPaste aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => handleVncConsole(name)}
            disabled={loading || loadingVnc}
            title={t('console.vncConsoleDisplay.expandConsole')}
            aria-label={t('console.vncConsoleDisplay.expandConsole')}
            data-action="console-expand"
          >
            <FaExpand aria-hidden="true" />
          </button>
          <ConsoleSwitchButtons
            prefix={PREFIX}
            server={server}
            current="vnc"
            held={{ zlogin: hasZlogin, ssh: hasSsh, rdp: hasRdp }}
            loading={loading}
            loadingVnc={loadingVnc}
            onSwitch={setActiveConsoleType}
            onStart={start}
          />
        </div>
      </div>
      <div className="hw-console-content">{content}</div>
    </div>
  );
};

VncConsoleDisplay.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
  running: PropTypes.bool.isRequired,
  turn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  machineDetails: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  previewVncViewOnly: PropTypes.bool.isRequired,
  vncReconnectKey: PropTypes.number.isRequired,
  vncSettings: PropTypes.object.isRequired,
  vncRef: PropTypes.object.isRequired,
  hasZlogin: PropTypes.bool.isRequired,
  hasRdp: PropTypes.bool.isRequired,
  hasSsh: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setPreviewVncViewOnly: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  setActiveConsoleType: PropTypes.func.isRequired,
  startZloginSessionExplicitly: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  handleKillVncSession: PropTypes.func.isRequired,
  handleVncQualityChange: PropTypes.func.isRequired,
  handleVncCompressionChange: PropTypes.func.isRequired,
  handleVncResizeChange: PropTypes.func.isRequired,
  handleVncShowDotChange: PropTypes.func.isRequired,
  handleVncClipboardPaste: PropTypes.func.isRequired,
};

export default memo(VncConsoleDisplay);
