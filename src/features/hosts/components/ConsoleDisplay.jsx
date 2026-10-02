import PropTypes from 'prop-types';
import { Suspense, lazy, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import InactiveConsoleDisplay from './InactiveConsoleDisplay';
import SshConsoleDisplay from './SshConsoleDisplay';
import VncConsoleDisplay from './VncConsoleDisplay';
import ZloginConsoleDisplay from './ZloginConsoleDisplay';

const RdpConsoleDisplay = lazy(() => import('./RdpConsoleDisplay'));

/**
 * Which console the section draws, hyperweaver-ui's rule: the RDP
 * console while one was started and it is chosen or no other is active,
 * the SSH console while one was started and it is chosen or neither VNC
 * nor zlogin is active, zlogin alone while it alone is active, VNC alone
 * while it alone is active, the chosen one while both are, VNC by
 * default, and the inactive display while none is.
 *
 * @param {Object} options - Which consoles are active and which is chosen
 * @returns {string} `rdp`, `ssh`, `zlogin`, `vnc` or `inactive`
 */
export const consoleShown = ({ hasVnc, hasZlogin, hasSsh, hasRdp, activeConsoleType }) => {
  if (hasRdp && (activeConsoleType === 'rdp' || (!hasVnc && !hasZlogin && !hasSsh))) {
    return 'rdp';
  }
  if (hasSsh && (activeConsoleType === 'ssh' || (!hasVnc && !hasZlogin))) {
    return 'ssh';
  }
  if (hasZlogin && !hasVnc) {
    return 'zlogin';
  }
  if (hasVnc && !hasZlogin) {
    return 'vnc';
  }
  if (hasVnc && hasZlogin) {
    return activeConsoleType === 'zlogin' ? 'zlogin' : 'vnc';
  }
  return 'inactive';
};

/**
 * The console section of the machine page, hyperweaver-ui's console
 * display: the active console, VNC, zlogin, SSH or RDP, by
 * `consoleShown`, or the inactive display with the start buttons; the
 * RDP client is loaded only when an RDP console opens, its WASM never
 * with the page.
 */
const ConsoleDisplay = ({
  id,
  name,
  server,
  user,
  running,
  turn,
  machineDetails,
  activeConsoleType,
  loading,
  loadingVnc,
  previewReadOnly,
  previewVncViewOnly,
  previewReconnectKey,
  vncReconnectKey,
  vncSettings,
  setActiveConsoleType,
  setLoading,
  setLoadingVnc,
  setError,
  setPreviewReadOnly,
  setPreviewVncViewOnly,
  setMachineDetails,
  startVncSession,
  startZloginSessionExplicitly,
  waitForVncSessionReady,
  forceZoneSessionCleanup,
  pasteTextToZone,
  handleVncConsole,
  handleZloginConsole,
  handleKillVncSession,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
  setShowZloginConsole,
}) => {
  const { t } = useTranslation();
  const previewVncRef = useRef(null);
  const hasVnc = Boolean(machineDetails.active_vnc_session);
  const hasZlogin = Boolean(machineDetails.zlogin_session?.id);
  const hasSsh = Boolean(machineDetails.ssh_session?.id);
  const hasRdp = Boolean(machineDetails.rdp_session);
  const shown = consoleShown({ hasVnc, hasZlogin, hasSsh, hasRdp, activeConsoleType });

  const common = {
    id,
    name,
    server,
    user,
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
    startZloginSessionExplicitly,
    waitForVncSessionReady,
  };

  if (shown === 'rdp') {
    const fallback = (
      <div
        className="hw-console-container d-flex align-items-center justify-content-center"
        data-console="rdp-loading"
      >
        <div className="text-center text-white-50">
          <span className="spinner-border" role="status" aria-hidden="true" />
          <p className="mt-2 small">{t('console.consoleDisplay.rdpLoading')}</p>
        </div>
      </div>
    );
    return (
      <Suspense fallback={fallback}>
        <RdpConsoleDisplay {...common} hasVnc={hasVnc} hasZlogin={hasZlogin} hasSsh={hasSsh} />
      </Suspense>
    );
  }
  if (shown === 'ssh') {
    return <SshConsoleDisplay {...common} hasVnc={hasVnc} hasZlogin={hasZlogin} hasRdp={hasRdp} />;
  }
  if (shown === 'zlogin') {
    return (
      <ZloginConsoleDisplay
        {...common}
        previewReadOnly={previewReadOnly}
        previewReconnectKey={previewReconnectKey}
        setPreviewReadOnly={setPreviewReadOnly}
        setShowZloginConsole={setShowZloginConsole}
        forceZoneSessionCleanup={forceZoneSessionCleanup}
        pasteTextToZone={pasteTextToZone}
        handleZloginConsole={handleZloginConsole}
        hasVnc={hasVnc}
        hasSsh={hasSsh}
        hasRdp={hasRdp}
      />
    );
  }
  if (shown === 'vnc') {
    return (
      <VncConsoleDisplay
        {...common}
        previewVncViewOnly={previewVncViewOnly}
        vncReconnectKey={vncReconnectKey}
        vncSettings={vncSettings}
        vncRef={previewVncRef}
        setPreviewVncViewOnly={setPreviewVncViewOnly}
        handleVncConsole={handleVncConsole}
        handleKillVncSession={handleKillVncSession}
        handleVncQualityChange={handleVncQualityChange}
        handleVncCompressionChange={handleVncCompressionChange}
        handleVncResizeChange={handleVncResizeChange}
        handleVncShowDotChange={handleVncShowDotChange}
        handleVncClipboardPaste={handleVncClipboardPaste}
        hasZlogin={hasZlogin}
        hasSsh={hasSsh}
        hasRdp={hasRdp}
      />
    );
  }
  return <InactiveConsoleDisplay {...common} />;
};

ConsoleDisplay.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
  running: PropTypes.bool.isRequired,
  turn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  machineDetails: PropTypes.object.isRequired,
  activeConsoleType: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  previewReadOnly: PropTypes.bool.isRequired,
  previewVncViewOnly: PropTypes.bool.isRequired,
  previewReconnectKey: PropTypes.number.isRequired,
  vncReconnectKey: PropTypes.number.isRequired,
  vncSettings: PropTypes.object.isRequired,
  setActiveConsoleType: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
  setLoadingVnc: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setPreviewReadOnly: PropTypes.func.isRequired,
  setPreviewVncViewOnly: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  startVncSession: PropTypes.func.isRequired,
  startZloginSessionExplicitly: PropTypes.func.isRequired,
  waitForVncSessionReady: PropTypes.func.isRequired,
  forceZoneSessionCleanup: PropTypes.func.isRequired,
  pasteTextToZone: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  handleZloginConsole: PropTypes.func.isRequired,
  handleKillVncSession: PropTypes.func.isRequired,
  handleVncQualityChange: PropTypes.func.isRequired,
  handleVncCompressionChange: PropTypes.func.isRequired,
  handleVncResizeChange: PropTypes.func.isRequired,
  handleVncShowDotChange: PropTypes.func.isRequired,
  handleVncClipboardPaste: PropTypes.func.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
};

export default memo(ConsoleDisplay);
