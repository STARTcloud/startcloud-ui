import PropTypes from 'prop-types';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDesktop,
  FaDisplay,
  FaFileArrowDown,
  FaFolderOpen,
  FaRotate,
  FaTerminal,
  FaWindows,
} from 'react-icons/fa6';

import { useFallbackSrc } from '../../../components/common/useFallbackSrc';
import { brandLogoUrl, brandMarkUrl } from '../../../config/brand';
import { useStatus } from '../../../contexts/StatusContext';
import { useChosenTheme } from '../../../hooks/useTheme';
import { useConsoleScreenshot } from '../hooks/useConsoleScreenshot';
import { hostHasConsole, hostHasFeature } from '../utils/capabilities';
import { guestIpsOf, sshReady } from '../utils/consoles';
import { isServerRole } from '../utils/hosts';

import {
  launchDirectoryOrFtp,
  launchRdp,
  startRdpPreview,
  startSshPreview,
  startVncPreview,
  startZloginPreview,
} from './consoleActions';

const RdpStartButtons = ({
  rdpAvailable,
  launchersAvailable,
  guestRdpIp,
  running,
  loading,
  onStartVrdp,
  onStartGuestRdp,
  onNativeRdp,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {rdpAvailable || launchersAvailable ? (
        <button
          type="button"
          className="btn btn-sm btn-info"
          onClick={rdpAvailable ? onStartVrdp : onNativeRdp}
          onContextMenu={event => {
            event.preventDefault();
            if (launchersAvailable && running) {
              onNativeRdp();
            }
          }}
          disabled={loading || !running}
          title={
            running
              ? t('console.rdpStartButtons.vrdpHint')
              : t('console.rdpStartButtons.machineMustBeRunning')
          }
          data-action="console-start-rdp"
        >
          <FaDisplay className="me-2" aria-hidden="true" />
          <span>
            {loading ? t('console.rdpStartButtons.starting') : t('console.rdpStartButtons.vrdp')}
          </span>
        </button>
      ) : null}
      {rdpAvailable && guestRdpIp ? (
        <button
          type="button"
          className="btn btn-sm btn-info"
          onClick={onStartGuestRdp}
          onContextMenu={event => {
            event.preventDefault();
            if (launchersAvailable) {
              onNativeRdp();
            }
          }}
          disabled={loading}
          title={t('console.rdpStartButtons.rdpHint', { address: guestRdpIp })}
          data-action="console-start-guest-rdp"
        >
          <FaWindows className="me-2" aria-hidden="true" />
          <span>
            {loading ? t('console.rdpStartButtons.starting') : t('console.rdpStartButtons.rdp')}
          </span>
        </button>
      ) : null}
    </>
  );
};

RdpStartButtons.propTypes = {
  rdpAvailable: PropTypes.bool.isRequired,
  launchersAvailable: PropTypes.bool.isRequired,
  guestRdpIp: PropTypes.string,
  running: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onStartVrdp: PropTypes.func.isRequired,
  onStartGuestRdp: PropTypes.func.isRequired,
  onNativeRdp: PropTypes.func.isRequired,
};

const sshTitle = ({ running, ready, address, t }) => {
  if (!running) {
    return t('console.inactiveConsoleDisplay.machineMustBeRunning');
  }
  if (!ready) {
    return t('console.inactiveConsoleDisplay.sshNotReady');
  }
  return t('console.inactiveConsoleDisplay.startSsh', { address });
};

/**
 * The console section while no console is active, hyperweaver-ui's
 * inactive display: the start buttons of every console the host's row
 * lists, VNC behind the `vnc` console token, zlogin behind `zlogin`, SSH
 * behind the `ssh` feature while the machine runs and its guest reports
 * an address, the hypervisor's remote display behind `rdp` and the
 * guest's own desktop beside it while the guest reports an address, a
 * right-click on either opening the native client on a host that lists
 * `host-launchers`, whose working directory and SFTP buttons draw too;
 * under them one frame of the screen on a host that lists
 * `machine-screenshot` while the machine runs, Refresh screenshot beside
 * the buttons reading a new one, and the placeholder otherwise.
 */
const InactiveConsoleDisplay = ({
  id,
  name,
  server,
  running,
  turn,
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
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { theme, themes } = useChosenTheme();
  const mark = useFallbackSrc(
    brandMarkUrl(status.brand, theme, themes),
    brandLogoUrl(status.brand)
  );
  const isDirect = !isServerRole(status);
  const [own, setOwn] = useState(0);
  const screenshotAvailable = hostHasFeature(server, 'machine-screenshot') && running;
  const vncAvailable = hostHasConsole(server, 'vnc');
  const zloginAvailable = hostHasConsole(server, 'zlogin');
  const sshAvailable = hostHasFeature(server, 'ssh');
  const rdpAvailable = hostHasConsole(server, 'rdp');
  const launchersAvailable = hostHasFeature(server, 'host-launchers');
  const ips = guestIpsOf(machineDetails);
  const [guestRdpIp = null] = ips;
  const ready = sshReady({ running, ips });
  const url = useConsoleScreenshot({
    status,
    id,
    name,
    asked: screenshotAvailable,
    turn: `${turn}-${own}`,
  });
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

  return (
    <div className="hw-console-container" data-console="inactive">
      <div className="hw-console-header">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {t('console.inactiveConsoleDisplay.consoleManagement')}
          </h6>
          <p className="small text-white-50 mb-0">
            {t('console.inactiveConsoleDisplay.noActiveSessions')}
          </p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          {vncAvailable ? (
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={() =>
                startVncPreview({
                  ...starters,
                  setLoadingVnc,
                  startVncSession,
                  waitForVncSessionReady,
                })
              }
              disabled={loading || loadingVnc || !running}
              title={
                running
                  ? t('console.inactiveConsoleDisplay.startVnc')
                  : t('console.inactiveConsoleDisplay.machineMustBeRunning')
              }
              data-action="console-start-vnc"
            >
              <FaDesktop className="me-2" aria-hidden="true" />
              <span>
                {loadingVnc
                  ? t('console.inactiveConsoleDisplay.starting')
                  : t('console.inactiveConsoleDisplay.vnc')}
              </span>
            </button>
          ) : null}
          {zloginAvailable ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => startZloginPreview({ ...starters, startZloginSessionExplicitly })}
              disabled={loading}
              title={t('console.inactiveConsoleDisplay.startZlogin')}
              data-action="console-start-zlogin"
            >
              <FaTerminal className="me-2" aria-hidden="true" />
              <span>
                {loading
                  ? t('console.inactiveConsoleDisplay.starting')
                  : t('console.inactiveConsoleDisplay.zlogin')}
              </span>
            </button>
          ) : null}
          {sshAvailable ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => startSshPreview(starters)}
              disabled={loading || !ready}
              title={sshTitle({ running, ready, address: guestRdpIp, t })}
              data-action="console-start-ssh"
            >
              <FaTerminal className="me-2" aria-hidden="true" />
              <span>
                {loading
                  ? t('console.inactiveConsoleDisplay.starting')
                  : t('console.inactiveConsoleDisplay.ssh')}
              </span>
            </button>
          ) : null}
          <RdpStartButtons
            rdpAvailable={rdpAvailable}
            launchersAvailable={launchersAvailable}
            guestRdpIp={guestRdpIp}
            running={running}
            loading={loading}
            onStartVrdp={() => startRdpPreview(starters)}
            onStartGuestRdp={() => startRdpPreview({ ...starters, target: 'guest' })}
            onNativeRdp={() => launchRdp(launchers)}
          />
          {screenshotAvailable ? (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setOwn(value => value + 1)}
              title={t('console.inactiveConsoleDisplay.refreshScreenshot')}
              aria-label={t('console.inactiveConsoleDisplay.refreshScreenshot')}
              data-action="console-screenshot"
            >
              <FaRotate aria-hidden="true" />
            </button>
          ) : null}
          {launchersAvailable ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => launchDirectoryOrFtp({ ...launchers, kind: 'directory' })}
                disabled={!isDirect}
                title={
                  isDirect
                    ? t('console.inactiveConsoleDisplay.openWorkingDirectory')
                    : t('console.inactiveConsoleDisplay.directModeOnly')
                }
                aria-label={
                  isDirect
                    ? t('console.inactiveConsoleDisplay.openWorkingDirectory')
                    : t('console.inactiveConsoleDisplay.directModeOnly')
                }
                data-action="console-directory"
              >
                <FaFolderOpen aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => launchDirectoryOrFtp({ ...launchers, kind: 'ftp' })}
                title={t('console.inactiveConsoleDisplay.openSftpClient')}
                aria-label={t('console.inactiveConsoleDisplay.openSftpClient')}
                data-action="console-ftp"
              >
                <FaFileArrowDown aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="hw-inactive-console-content">
        {screenshotAvailable && url ? (
          <div className="text-center h-100 w-100 d-flex flex-column align-items-center justify-content-center">
            <img
              src={url}
              alt={t('machine.machineScreenshot.consoleScreenshotAlt', { machineName: name })}
              className="img-fluid hw-console-frame"
              data-note="console-screenshot"
            />
            <div className="small text-white-50 mt-1">
              {t('console.inactiveConsoleDisplay.liveScreenshotHint')}
            </div>
          </div>
        ) : (
          <div className="hw-text-placeholder text-center" data-note="console-placeholder">
            <div className="mb-3">
              <img
                src={mark.src}
                onError={mark.onError}
                alt={t('console.inactiveConsoleDisplay.startConsoleAlt')}
                className="hw-startup-icon"
              />
            </div>
            <div className="fs-6 fw-medium mb-2">
              <strong>{t('console.inactiveConsoleDisplay.noActiveConsoleSession')}</strong>
            </div>
            <div className="small">{t('console.inactiveConsoleDisplay.clickButtonsToStart')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

InactiveConsoleDisplay.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  running: PropTypes.bool.isRequired,
  turn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
};

export default memo(InactiveConsoleDisplay);
