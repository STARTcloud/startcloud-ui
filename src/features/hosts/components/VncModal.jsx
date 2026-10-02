import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCompress,
  FaExpand,
  FaPaste,
  FaRotate,
  FaTerminal,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';

import { captureFileName, consoleAdmin, saveBlob } from '../utils/consoles';

import VncActionsDropdown from './VncActionsDropdown';
import VncViewerReact from './VncViewerReact';

/**
 * The VNC console dialog, hyperweaver-ui's VNC modal over the page: the
 * header with the machine's name, the VNC actions menu, Paste from the
 * browser's clipboard while interactive, the zlogin button, which
 * switches to the zlogin dialog or starts a zlogin session, Full
 * screen and Exit; under it the viewer over the session, or, when the
 * viewer failed to load, the error card offering the agent's direct
 * console and Retry.
 */
const VncModal = ({
  showVncConsole,
  closeVncConsole,
  isVncFullScreen,
  openVncFullScreen,
  vncLoadError,
  openDirectVncFallback,
  setVncLoadError,
  id,
  name,
  vncReconnectKey,
  modalVncRef,
  modalVncViewOnly,
  setModalVncViewOnly,
  handleVncModalPaste,
  handleVncConsole,
  handleKillVncSession,
  user,
  machineDetails,
  setShowZloginConsole,
  handleZloginConsole,
  setError,
  loading,
  loadingVnc,
  vncSettings,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
  zloginOffered,
}) => {
  const { t } = useTranslation();

  if (!showVncConsole) {
    return null;
  }

  const screenshot = () => {
    const canvas = document.querySelector('.hw-console-dialog .vnc-viewer-react canvas');
    canvas?.toBlob(blob => saveBlob(blob, captureFileName('vnc-screenshot', name, 'png')));
  };

  const switchToZlogin = async () => {
    closeVncConsole();
    if (machineDetails.zlogin_session) {
      setShowZloginConsole(true);
      return;
    }
    const result = await handleZloginConsole(name);
    if (!result.success) {
      setError(result.message);
    }
  };

  let body = null;
  if (vncLoadError) {
    body = (
      <div className="text-center p-5 hw-error-container" data-note="vnc-load-error">
        <div className="mb-3">
          <FaTriangleExclamation className="fs-1 text-warning" aria-hidden="true" />
        </div>
        <h4 className="fs-4 fw-bold">{t('machine.vncModal.vncConsoleLoadingError')}</h4>
        <p className="mb-4">{t('machine.vncModal.vncConsoleFailedToLoad')}</p>
        <div className="d-flex justify-content-center gap-2">
          <button type="button" className="btn btn-warning" onClick={openDirectVncFallback}>
            <FaArrowUpRightFromSquare className="me-2" aria-hidden="true" />
            <span>{t('machine.vncModal.openDirectVncConsole')}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setVncLoadError(false)}
          >
            <FaRotate className="me-2" aria-hidden="true" />
            <span>{t('machine.vncModal.retryEmbedded')}</span>
          </button>
        </div>
      </div>
    );
  } else if (loadingVnc && !machineDetails.active_vnc_session) {
    body = (
      <div className="text-center p-5 hw-loading-container" data-note="vnc-starting">
        <div>
          <span className="spinner-border hw-loading-spinner" role="status" aria-hidden="true" />
        </div>
        <p className="mt-3">{t('machine.vncModal.startingVncConsole')}</p>
      </div>
    );
  } else {
    body = (
      <VncViewerReact
        ref={modalVncRef}
        key={`vnc-modal-${name}-${modalVncViewOnly}-${vncReconnectKey}`}
        id={id}
        machineName={name}
        viewOnly={modalVncViewOnly}
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
  }

  return (
    <div
      className="hw-console-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t('machine.vncModal.closeConsole')}
      data-dialog="vnc-console"
    >
      <div
        className="hw-console-dialog-backdrop"
        onClick={closeVncConsole}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            closeVncConsole();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={t('machine.vncModal.closeModal')}
      />
      <div
        className={isVncFullScreen ? 'hw-modal-container-fullscreen' : 'hw-modal-container-normal'}
      >
        <header
          className={`d-flex align-items-center bg-dark text-white ${
            isVncFullScreen ? 'hw-modal-header-fullscreen' : 'hw-modal-header-normal'
          }`}
        >
          <p
            className={`flex-grow-1 mb-0 ${
              isVncFullScreen ? 'hw-modal-title-fullscreen' : 'hw-modal-title-normal'
            }`}
          >
            <FaTerminal className="me-2" aria-hidden="true" />
            <span>
              {t('chrome.sidebarMenu.vncConsole')} - {name}
            </span>
          </p>
          <div className="d-flex gap-1 m-0 flex-wrap">
            <VncActionsDropdown
              vncRef={modalVncRef}
              variant="button"
              onToggleReadOnly={() => setModalVncViewOnly(!modalVncViewOnly)}
              onScreenshot={screenshot}
              onNewTab={() => handleVncConsole(name, true)}
              onKillSession={() => handleKillVncSession(name)}
              isReadOnly={modalVncViewOnly}
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
            {!modalVncViewOnly ? (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={handleVncModalPaste}
                title={t('machine.vncModal.pasteFromBrowser')}
                aria-label={t('machine.vncModal.pasteFromBrowser')}
                data-action="console-paste"
              >
                <FaPaste aria-hidden="true" />
              </button>
            ) : null}
            {zloginOffered ? (
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={switchToZlogin}
                disabled={loading}
                title={
                  machineDetails.zlogin_session
                    ? t('machine.vncModal.switchToZlogin')
                    : t('machine.vncModal.startZlogin')
                }
                data-action="console-switch-zlogin"
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <FaTerminal className="me-2" aria-hidden="true" />
                )}
                <span>
                  {loading ? t('machine.vncModal.starting') : t('machine.vncModal.zlogin')}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={openVncFullScreen}
              title={
                isVncFullScreen
                  ? t('machine.vncModal.exitFullScreen')
                  : t('machine.vncModal.enterFullScreen')
              }
              data-action="console-full-screen"
            >
              {isVncFullScreen ? (
                <FaCompress className="me-2" aria-hidden="true" />
              ) : (
                <FaExpand className="me-2" aria-hidden="true" />
              )}
              <span>
                {isVncFullScreen
                  ? t('machine.vncModal.exitFullScreen')
                  : t('machine.vncModal.enterFullScreen')}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={closeVncConsole}
              title={t('machine.vncModal.closeConsole')}
              data-action="console-close"
            >
              <FaXmark className="me-2" aria-hidden="true" />
              <span>{t('machine.vncModal.exit')}</span>
            </button>
          </div>
        </header>
        <section className="p-0 hw-modal-body">{body}</section>
      </div>
    </div>
  );
};

VncModal.propTypes = {
  showVncConsole: PropTypes.bool.isRequired,
  closeVncConsole: PropTypes.func.isRequired,
  isVncFullScreen: PropTypes.bool.isRequired,
  openVncFullScreen: PropTypes.func.isRequired,
  vncLoadError: PropTypes.bool.isRequired,
  openDirectVncFallback: PropTypes.func.isRequired,
  setVncLoadError: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  vncReconnectKey: PropTypes.number.isRequired,
  modalVncRef: PropTypes.object.isRequired,
  modalVncViewOnly: PropTypes.bool.isRequired,
  setModalVncViewOnly: PropTypes.func.isRequired,
  handleVncModalPaste: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  handleKillVncSession: PropTypes.func.isRequired,
  user: PropTypes.object,
  machineDetails: PropTypes.object.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
  handleZloginConsole: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  vncSettings: PropTypes.object.isRequired,
  handleVncQualityChange: PropTypes.func.isRequired,
  handleVncCompressionChange: PropTypes.func.isRequired,
  handleVncResizeChange: PropTypes.func.isRequired,
  handleVncShowDotChange: PropTypes.func.isRequired,
  handleVncClipboardPaste: PropTypes.func.isRequired,
  zloginOffered: PropTypes.bool.isRequired,
};

export default VncModal;
