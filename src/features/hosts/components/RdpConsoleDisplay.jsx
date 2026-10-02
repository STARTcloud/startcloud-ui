import PropTypes from 'prop-types';
import { memo, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaExpand, FaKeyboard, FaPaste, FaRotate, FaSliders, FaStop } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { standaloneConsoleRoute } from '../utils/consoles';
import { isServerRole } from '../utils/hosts';

import { startConsole } from './consoleActions';
import ConsoleLaunchers from './ConsoleLaunchers';
import ConsoleSwitchButtons from './ConsoleSwitchButtons';
import RdpConnectionPanel from './RdpConnectionPanel';
import RdpSessionHost from './RdpSessionHost';

const PREFIX = 'console.rdpConsoleDisplay';

const NEW_TAB = 'width=1280,height=800,scrollbars=no,resizable=yes';

const DEFAULT_SETTINGS = {
  colorDepth: 16,
  lossy: true,
  audio: true,
  clipboard: true,
  scale: 'fit',
  resizeMode: 'follow-guest',
};

const RdpSettingsDropdown = ({ settings, onChange, onApply, applyDisabled }) => {
  const { t } = useTranslation();
  return (
    <Dropdown autoClose="outside" align="end">
      <Dropdown.Toggle
        variant="secondary"
        size="sm"
        title={t('console.rdpSettingsDropdown.title')}
        data-action="rdp-settings"
      >
        <FaSliders aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3 hw-rdp-settings-menu" data-menu="rdp-settings">
        <label className="form-label small mb-1" htmlFor="rdp-color-depth">
          {t('console.rdpSettingsDropdown.colorQuality')}
        </label>
        <select
          id="rdp-color-depth"
          className="form-select form-select-sm mb-2"
          value={settings.colorDepth}
          onChange={event => onChange({ colorDepth: Number(event.target.value) })}
        >
          <option value={16}>{t('console.rdpSettingsDropdown.colorDepth16')}</option>
          <option value={32}>{t('console.rdpSettingsDropdown.colorDepth32')}</option>
          <option value={24}>{t('console.rdpSettingsDropdown.colorDepth24')}</option>
          <option value={15}>{t('console.rdpSettingsDropdown.colorDepth15')}</option>
        </select>
        <div className="form-check form-switch mb-1">
          <input
            className="form-check-input"
            type="checkbox"
            id="rdp-lossy"
            checked={settings.lossy}
            onChange={event => onChange({ lossy: event.target.checked })}
          />
          <label className="form-check-label small" htmlFor="rdp-lossy">
            {t('console.rdpSettingsDropdown.lossyCompression')}
          </label>
        </div>
        <div className="form-check form-switch mb-1">
          <input
            className="form-check-input"
            type="checkbox"
            id="rdp-audio"
            checked={settings.audio}
            onChange={event => onChange({ audio: event.target.checked })}
          />
          <label className="form-check-label small" htmlFor="rdp-audio">
            {t('console.rdpSettingsDropdown.sound')}
          </label>
        </div>
        <div className="small text-muted mb-2">
          {t('console.rdpSettingsDropdown.applyAtNextConnect')}
        </div>
        <label className="form-label small mb-1" htmlFor="rdp-scale">
          {t('console.rdpSettingsDropdown.scale')}
        </label>
        <select
          id="rdp-scale"
          className="form-select form-select-sm mb-2"
          value={settings.scale}
          onChange={event => onChange({ scale: event.target.value })}
        >
          <option value="fit">{t('console.rdpSettingsDropdown.scaleFit')}</option>
          <option value="real">{t('console.rdpSettingsDropdown.scaleReal')}</option>
          <option value="full">{t('console.rdpSettingsDropdown.scaleFull')}</option>
        </select>
        <label className="form-label small mb-1" htmlFor="rdp-resize-mode">
          {t('console.rdpSettingsDropdown.resolution')}
        </label>
        <select
          id="rdp-resize-mode"
          className="form-select form-select-sm mb-2"
          value={settings.resizeMode}
          onChange={event => onChange({ resizeMode: event.target.value })}
        >
          <option value="follow-guest">
            {t('console.rdpSettingsDropdown.resolutionFollowGuest')}
          </option>
          <option value="fit-client">{t('console.rdpSettingsDropdown.resolutionFitClient')}</option>
        </select>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="rdp-clipboard"
            checked={settings.clipboard}
            onChange={event => onChange({ clipboard: event.target.checked })}
          />
          <label className="form-check-label small" htmlFor="rdp-clipboard">
            {t('console.rdpSettingsDropdown.clipboardSharing')}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary w-100"
          onClick={onApply}
          disabled={applyDisabled}
          data-action="rdp-apply"
        >
          <FaRotate className="me-2" aria-hidden="true" />
          <span>{t('console.rdpSettingsDropdown.applyAndReconnect')}</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
};

RdpSettingsDropdown.propTypes = {
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
    clipboard: PropTypes.bool,
    scale: PropTypes.string,
    resizeMode: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  applyDisabled: PropTypes.bool.isRequired,
};

/**
 * The browser-RDP console, hyperweaver-ui's fourth console in the same
 * section with the same header: the connection details panel, the
 * settings menu, colour depth, lossy compression and sound applied at
 * the next connect and scale and clipboard live, Send clipboard,
 * Ctrl+Alt+Del, Open in new tab, the full-window page, the
 * switch-or-start buttons of the other consoles the host's row lists,
 * the launchers of a host that lists `host-launchers` and Stop RDP; the
 * session itself is `RdpSessionHost`, the target the start chose,
 * `console` for the hypervisor's remote display and `guest` for the
 * guest's own.
 */
const RdpConsoleDisplay = ({
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
  hasSsh,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const uiRef = useRef(null);
  const isDirect = !isServerRole(status);
  const target = machineDetails.rdp_session?.target || 'console';
  const isGuest = target === 'guest';
  const [phase, setPhase] = useState('connecting');
  const [connectKey, setConnectKey] = useState(0);
  const [rdpSettings, setRdpSettings] = useState(DEFAULT_SETTINGS);
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

  const handleSettingsChange = patch => {
    setRdpSettings(prev => ({ ...prev, ...patch }));
    if (patch.scale) {
      uiRef.current?.setScale(patch.scale);
    }
    if (patch.clipboard !== undefined) {
      uiRef.current?.setEnableClipboard(patch.clipboard);
    }
  };

  const handleReconnect = () => setConnectKey(key => key + 1);

  const handleStop = () => {
    setMachineDetails(prev => ({ ...prev, rdp_session: null }));
    setActiveConsoleType(hasVnc ? 'vnc' : 'zlogin');
  };

  const sendClipboard = async () => {
    try {
      await uiRef.current?.sendClipboardData();
    } catch (error) {
      log.component.warn('RDP clipboard send', { error: error.message });
    }
  };

  const clipboardLabel = rdpSettings.clipboard
    ? t('console.rdpConsoleDisplay.sendClipboard')
    : t('console.rdpConsoleDisplay.clipboardOff');

  return (
    <div className="hw-console-container hw-console-container-flex" data-console="rdp">
      <div className="hw-console-header flex-shrink-0">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {isGuest
              ? t('console.rdpConsoleDisplay.rdpLabel')
              : t('console.rdpConsoleDisplay.vrdpLabel')}{' '}
            — {name}
          </h6>
          <p className="small text-white-50 mb-0">
            {isGuest
              ? t('console.rdpConsoleDisplay.guestDescription')
              : t('console.rdpConsoleDisplay.hypervisorDescription')}
          </p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <RdpConnectionPanel
            uiRef={uiRef}
            connected={phase === 'connected'}
            id={id}
            machineName={name}
            settings={rdpSettings}
            guestFacts={machineDetails.rdp_session}
          />
          <RdpSettingsDropdown
            settings={rdpSettings}
            onChange={handleSettingsChange}
            onApply={handleReconnect}
            applyDisabled={loading}
          />
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={sendClipboard}
            disabled={phase !== 'connected' || !rdpSettings.clipboard}
            title={clipboardLabel}
            aria-label={clipboardLabel}
            data-action="console-paste"
          >
            <FaPaste aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => uiRef.current?.ctrlAltDel()}
            disabled={phase !== 'connected'}
            title={t('console.rdpConsoleDisplay.sendCtrlAltDel')}
            aria-label={t('console.rdpConsoleDisplay.sendCtrlAltDel')}
            data-action="console-ctrl-alt-del"
          >
            <FaKeyboard aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() =>
              window.open(standaloneConsoleRoute(id, name, 'rdp', target), '_blank', NEW_TAB)
            }
            title={t('console.rdpConsoleDisplay.openInNewTab')}
            aria-label={t('console.rdpConsoleDisplay.openInNewTab')}
            data-action="console-expand"
          >
            <FaExpand aria-hidden="true" />
          </button>
          <ConsoleSwitchButtons
            prefix={PREFIX}
            server={server}
            current="rdp"
            held={{ vnc: hasVnc, zlogin: hasZlogin, ssh: hasSsh }}
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
            title={t('console.rdpConsoleDisplay.closeConsole')}
            data-action="console-stop"
          >
            <FaStop className="me-2" aria-hidden="true" />
            <span>{t('console.rdpConsoleDisplay.stopRdp')}</span>
          </button>
        </div>
      </div>
      <div className="hw-console-content">
        <RdpSessionHost
          id={id}
          machineName={name}
          settings={rdpSettings}
          target={target}
          uiRef={uiRef}
          connectKey={connectKey}
          onPhase={setPhase}
          onReconnect={handleReconnect}
        />
      </div>
    </div>
  );
};

RdpConsoleDisplay.propTypes = {
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
  hasSsh: PropTypes.bool.isRequired,
};

export default memo(RdpConsoleDisplay);
