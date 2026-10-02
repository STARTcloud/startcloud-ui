import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCompress, FaDesktop, FaExpand, FaPaste, FaTerminal, FaXmark } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchZloginSessions, stopZloginSession } from '../api/consoleAPI';
import { captureFileName, consoleAdmin, saveBlob } from '../utils/consoles';

import ZloginActionsDropdown from './ZloginActionsDropdown';
import ZoneShell from './ZoneShell';

/**
 * The zlogin console dialog, hyperweaver-ui's zlogin modal over the
 * page: the header with the zone's name, the zlogin actions menu, whose
 * Kill session stops the agent's active session of the zone and cleans
 * the terminal up, Paste down the zone's socket while interactive, the
 * VNC button, which switches to the VNC dialog or starts a VNC session,
 * Full screen and Exit; under it the zone's terminal.
 */
const ZloginModal = ({
  showZloginConsole,
  setShowZloginConsole,
  isZloginFullScreen,
  setIsZloginFullScreen,
  id,
  name,
  handleZloginModalPaste,
  user,
  machineDetails,
  setShowVncConsole,
  handleVncConsole,
  loadingVnc,
  setLoading,
  forceZoneSessionCleanup,
  refreshZloginSessionStatus,
  setError,
  modalReadOnly,
  setModalReadOnly,
  vncOffered,
}) => {
  const { t } = useTranslation();
  const status = useStatus();

  if (!showZloginConsole) {
    return null;
  }

  const close = () => setShowZloginConsole(false);

  const kill = async () => {
    try {
      setLoading(true);
      const active = (await fetchZloginSessions(status, id)).find(
        session => session.machine_name === name && session.status === 'active'
      );
      if (active) {
        await stopZloginSession(status, id, active.id);
        await forceZoneSessionCleanup(id, name);
        await refreshZloginSessionStatus(name);
      }
    } catch (error) {
      setError(`Failed to kill zlogin session: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const capture = () => {
    const screen = document.querySelector('.hw-console-dialog .xterm-screen');
    if (screen) {
      const text = screen.textContent || screen.innerText;
      saveBlob(
        new Blob([text], { type: 'text/plain' }),
        captureFileName('zlogin-output', name, 'txt')
      );
    }
  };

  const switchToVnc = async () => {
    close();
    if (machineDetails.active_vnc_session) {
      setShowVncConsole(true);
      return;
    }
    const message = await handleVncConsole(name);
    if (message) {
      setError(message);
    }
  };

  return (
    <div
      className="hw-console-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t('chrome.sidebarMenu.zloginConsole')}
      data-dialog="zlogin-console"
    >
      <div
        className="hw-console-dialog-backdrop"
        onClick={close}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            close();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={t('machine.zloginModal.closeModal')}
      />
      <div
        className={
          isZloginFullScreen ? 'hw-modal-container-fullscreen' : 'hw-modal-container-normal'
        }
      >
        <header
          className={`d-flex align-items-center bg-dark text-white ${
            isZloginFullScreen ? 'hw-modal-header-fullscreen' : 'hw-modal-header-normal'
          }`}
        >
          <p
            className={`flex-grow-1 mb-0 ${
              isZloginFullScreen ? 'hw-modal-title-fullscreen' : 'hw-modal-title-normal'
            }`}
          >
            <FaTerminal className="me-2" aria-hidden="true" />
            <span>
              {t('chrome.sidebarMenu.zloginConsole')} - {name}
            </span>
          </p>
          <div className="d-flex gap-1 m-0 flex-wrap">
            <ZloginActionsDropdown
              variant="button"
              onToggleReadOnly={() => setModalReadOnly(!modalReadOnly)}
              onKillSession={kill}
              onScreenshot={capture}
              isReadOnly={modalReadOnly}
              isAdmin={consoleAdmin(user)}
            />
            {!modalReadOnly ? (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={handleZloginModalPaste}
                title={t('machine.vncModal.pasteFromBrowser')}
                aria-label={t('machine.vncModal.pasteFromBrowser')}
                data-action="console-paste"
              >
                <FaPaste aria-hidden="true" />
              </button>
            ) : null}
            {vncOffered ? (
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={switchToVnc}
                disabled={loadingVnc}
                title={
                  machineDetails.active_vnc_session
                    ? t('console.zloginConsoleDisplay.switchToVnc')
                    : t('console.zloginConsoleDisplay.startVnc')
                }
                data-action="console-switch-vnc"
              >
                {loadingVnc ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <FaDesktop className="me-2" aria-hidden="true" />
                )}
                <span>
                  {loadingVnc
                    ? t('machine.vncModal.starting')
                    : t('console.inactiveConsoleDisplay.vnc')}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={() => setIsZloginFullScreen(!isZloginFullScreen)}
              title={
                isZloginFullScreen
                  ? t('machine.vncModal.exitFullScreen')
                  : t('machine.vncModal.enterFullScreen')
              }
              data-action="console-full-screen"
            >
              {isZloginFullScreen ? (
                <FaCompress className="me-2" aria-hidden="true" />
              ) : (
                <FaExpand className="me-2" aria-hidden="true" />
              )}
              <span>
                {isZloginFullScreen
                  ? t('machine.vncModal.exitFullScreen')
                  : t('machine.vncModal.enterFullScreen')}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={close}
              title={t('machine.vncModal.closeConsole')}
              data-action="console-close"
            >
              <FaXmark className="me-2" aria-hidden="true" />
              <span>{t('machine.vncModal.exit')}</span>
            </button>
          </div>
        </header>
        <section className="p-0 hw-modal-body">
          <ZoneShell
            key={`zlogin-modal-${name}-${modalReadOnly ? 'ro' : 'rw'}`}
            id={id}
            zoneName={name}
            readOnly={modalReadOnly}
          />
        </section>
      </div>
    </div>
  );
};

ZloginModal.propTypes = {
  showZloginConsole: PropTypes.bool.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
  isZloginFullScreen: PropTypes.bool.isRequired,
  setIsZloginFullScreen: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  handleZloginModalPaste: PropTypes.func.isRequired,
  user: PropTypes.object,
  machineDetails: PropTypes.object.isRequired,
  setShowVncConsole: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  forceZoneSessionCleanup: PropTypes.func.isRequired,
  refreshZloginSessionStatus: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  modalReadOnly: PropTypes.bool.isRequired,
  setModalReadOnly: PropTypes.func.isRequired,
  vncOffered: PropTypes.bool.isRequired,
};

export default ZloginModal;
