import PropTypes from 'prop-types';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { rdpBridgePath, rdpTargetQuery } from '../api/consoleAPI';
import { socketUrl, wsTicket } from '../api/terminal';

const DESKTOP = { minWidth: 640, maxWidth: 4096, minHeight: 480, maxHeight: 2160 };

const rdpClient = () => import('./rdpClient').then(module => module.loadRdpClient());

const ironErrorText = error => {
  if (error && typeof error.backtrace === 'function' && typeof error.kind === 'function') {
    return error.backtrace();
  }
  return String(error?.message || error);
};

const even = value => 2 * Math.round(value / 2);

/**
 * The desktop size asked of the session in the fit-client resize mode,
 * the pane's size in even numbers held between 640 by 480 and 4096 by
 * 2160; the follow-guest mode ignores the request.
 *
 * @param {{ width: number, height: number }} rect - The pane's box
 * @returns {{ width: number, height: number }} The size
 */
export const paneDesktopSize = rect => ({
  width: Math.min(DESKTOP.maxWidth, Math.max(DESKTOP.minWidth, even(rect.width))),
  height: Math.min(DESKTOP.maxHeight, Math.max(DESKTOP.minHeight, even(rect.height))),
});

/**
 * The RDP session host, hyperweaver-ui's piece both RDP surfaces share,
 * the console pane and the full-window page: it draws its screen box at
 * once, fetches the client of `rdpClient` into it, the WASM initialized
 * once per page and never loaded with the page, asks a ticket bound to the machine and connects over the agent's
 * RDCleanPath bridge, `machines/{name}/rdp-bridge` at the path the role
 * fixes, `&target=guest` for the guest's own RDP server; the parent owns
 * the header, the settings, read at connect time, the target and the
 * reconnect, a bump of `connectKey`, and reads the live user interaction
 * through `uiRef` for its own buttons. The overlay draws the connecting,
 * ended and failed states with Reconnect.
 */
const RdpSessionHost = ({
  id,
  machineName,
  settings,
  target = 'console',
  uiRef,
  connectKey,
  onPhase = null,
  onReconnect = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const containerRef = useRef(null);
  const [phase, setPhaseState] = useState('connecting');
  const [detail, setDetail] = useState('');
  const settingsRef = useRef(settings);
  const onPhaseRef = useRef(onPhase);

  useEffect(() => {
    settingsRef.current = settings;
    onPhaseRef.current = onPhase;
  });

  const setPhase = useCallback(value => {
    setPhaseState(value);
    onPhaseRef.current?.(value);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !id || !machineName) {
      return undefined;
    }
    let cancelled = false;
    let client = null;

    const connectSession = async ui => {
      try {
        const { ticket } = await wsTicket(status, id, machineName);
        if (cancelled) {
          return;
        }
        if (!ticket) {
          setPhase('failed');
          setDetail(t('console.rdpSessionHost.noWsTicket'));
          return;
        }
        const proxy = `${socketUrl(status, id, rdpBridgePath(machineName), ticket)}${rdpTargetQuery(
          target
        )}`;
        const builder = ui
          .configBuilder()
          .withUsername('')
          .withPassword('')
          .withExtension(client.resizeMode(settingsRef.current.resizeMode));
        if (settingsRef.current.resizeMode === 'fit-client') {
          builder.withDesktopSize(paneDesktopSize(container.getBoundingClientRect()));
        }
        const config = builder
          .withDestination('127.0.0.1:3389')
          .withProxyAddress(proxy)
          .withAuthToken(ticket)
          .withExtension(client.displayControl(true))
          .withExtension(client.colorDepth(settingsRef.current.colorDepth))
          .withExtension(client.lossyCompression(settingsRef.current.lossy))
          .withExtension(client.enableAudio(settingsRef.current.audio))
          .build();
        const sessionInfo = await ui.connect(config);
        if (cancelled) {
          ui.shutdown();
          return;
        }
        ui.setVisibility(true);
        ui.setScale(settingsRef.current.scale);
        setPhase('connected');
        const termination = await sessionInfo.run();
        if (!cancelled) {
          try {
            ui.setVisibility(false);
          } catch (visibilityError) {
            log.component.warn('RDP setVisibility after the session ended', {
              error: visibilityError.message,
            });
          }
          setPhase('ended');
          setDetail(termination.reason());
        }
      } catch (error) {
        if (!cancelled) {
          log.component.error('RDP connect failed', { error: ironErrorText(error) });
          setPhase('failed');
          setDetail(ironErrorText(error));
        }
      }
    };

    const handleReady = event => {
      const ui = event.detail.irgUserInteraction;
      uiRef.current = ui;
      ui.setEnableAutoClipboard(false);
      ui.setEnableClipboard(settingsRef.current.clipboard);
      connectSession(ui);
    };
    container.addEventListener('ready', handleReady);

    setPhase('connecting');
    setDetail('');

    const element = document.createElement('iron-remote-desktop');
    element.setAttribute('scale', settingsRef.current.scale);
    element.setAttribute('flexcenter', 'true');
    let appended = false;
    rdpClient()
      .then(loaded => {
        if (cancelled) {
          return;
        }
        client = loaded;
        container.appendChild(element);
        appended = true;
        element.module = loaded.Backend;
      })
      .catch(error => {
        if (!cancelled) {
          setPhase('failed');
          setDetail(
            t('console.rdpSessionHost.clientFailedToLoad', { error: ironErrorText(error) })
          );
        }
      });

    return () => {
      cancelled = true;
      container.removeEventListener('ready', handleReady);
      try {
        uiRef.current?.shutdown();
      } catch (error) {
        log.component.warn('RDP shutdown on unmount', { error: error.message });
      }
      uiRef.current = null;
      if (appended) {
        container.removeChild(element);
      }
    };
  }, [status, id, machineName, target, connectKey, uiRef, setPhase, t]);

  return (
    <>
      <div ref={containerRef} className="hw-rdp-screen" data-viewer="rdp" />
      {phase !== 'connected' ? (
        <div className="hw-rdp-overlay" data-note={`rdp-${phase}`}>
          <div className="text-center p-4">
            {phase === 'connecting' ? (
              <>
                <span
                  className="spinner-border hw-loading-spinner"
                  role="status"
                  aria-hidden="true"
                />
                <p className="mt-2">{t('console.rdpSessionHost.connectingOverBridge')}</p>
              </>
            ) : null}
            {phase === 'ended' ? (
              <>
                <div className="fs-6 fw-medium mb-2">
                  {t('console.rdpSessionHost.sessionEnded')}
                </div>
                {detail ? <div className="small mb-3">{detail}</div> : null}
              </>
            ) : null}
            {phase === 'failed' ? (
              <>
                <div className="fs-6 fw-medium mb-2">
                  {t('console.rdpSessionHost.connectionFailed')}
                </div>
                {detail ? <div className="small mb-2">{detail}</div> : null}
              </>
            ) : null}
            {phase !== 'connecting' && onReconnect ? (
              <div className="d-flex gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={onReconnect}
                  data-action="rdp-reconnect"
                >
                  <FaRotate className="me-2" aria-hidden="true" />
                  <span>{t('console.rdpSessionHost.reconnect')}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

RdpSessionHost.propTypes = {
  id: PropTypes.string.isRequired,
  machineName: PropTypes.string.isRequired,
  target: PropTypes.oneOf(['console', 'guest']),
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
    clipboard: PropTypes.bool,
    scale: PropTypes.string,
    resizeMode: PropTypes.string,
  }).isRequired,
  uiRef: PropTypes.object.isRequired,
  connectKey: PropTypes.number.isRequired,
  onPhase: PropTypes.func,
  onReconnect: PropTypes.func,
};

export default memo(RdpSessionHost);
