import PropTypes from 'prop-types';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaKeyboard, FaPlay, FaPlug, FaRotate } from 'react-icons/fa6';
import { VncScreen } from 'react-vnc';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { vncSocketPath } from '../api/consoleAPI';
import { socketUrl, wsTicket } from '../api/terminal';
import {
  getStatusColorClass,
  performCtrlAltDel,
  performSendKey,
  performTyping,
} from '../utils/vncUtils';

const RETRY_MS = 5000;

const viewerUrl = (status, id, machineName, ticket) =>
  id && machineName && ticket ? socketUrl(status, id, vncSocketPath(machineName), ticket) : '';

const VncErrorDisplay = ({ className, message, onRetry = null }) => {
  const { t } = useTranslation();
  return (
    <div className={`vnc-viewer-error ${className}`} data-note="vnc-error">
      <div className="alert alert-danger">
        <h4 className="fs-5 fw-bold">{t('console.vncErrorDisplay.title')}</h4>
        <p>{message}</p>
        {onRetry ? (
          <div className="d-flex gap-2 mt-3">
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              <FaRotate className="me-2" aria-hidden="true" />
              <span>{t('console.vncErrorDisplay.retry')}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

VncErrorDisplay.propTypes = {
  className: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};

const VncControls = ({
  connected,
  connecting,
  machineName,
  onCtrlAltDel,
  onConnect,
  onDisconnect,
}) => {
  const { t } = useTranslation();
  return (
    <div className="vnc-controls hw-vnc-controls">
      <div className="vnc-status">
        <FaCircle className={getStatusColorClass(connected, connecting)} aria-hidden="true" />
        <span className="ms-1">
          {connected ? t('console.vncControls.connected') : null}
          {connecting && !connected ? t('console.vncControls.connecting') : null}
          {!connected && !connecting ? t('console.vncControls.disconnected') : null}
          {connected ? t('console.vncControls.machineNameSuffix', { machineName }) : null}
        </span>
      </div>
      <div className="vnc-actions">
        <div className="d-flex gap-1 m-0">
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={onCtrlAltDel}
            disabled={!connected}
            title={t('console.vncControls.sendCtrlAltDel')}
          >
            <FaKeyboard className="me-2" aria-hidden="true" />
            <span>{t('console.vncControls.ctrlAltDel')}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${connected ? 'btn-danger' : 'btn-success'}`}
            onClick={connected ? onDisconnect : onConnect}
            disabled={connecting}
            title={
              connected
                ? t('console.vncControls.disconnectFromVnc')
                : t('console.vncControls.connectToVnc')
            }
          >
            {connected ? (
              <FaPlug className="me-2" aria-hidden="true" />
            ) : (
              <FaPlay className="me-2" aria-hidden="true" />
            )}
            <span>
              {connected ? t('console.vncControls.disconnect') : null}
              {connecting && !connected ? t('console.vncControls.connecting') : null}
              {!connected && !connecting ? t('console.vncControls.connect') : null}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

VncControls.propTypes = {
  connected: PropTypes.bool.isRequired,
  connecting: PropTypes.bool.isRequired,
  machineName: PropTypes.string.isRequired,
  onCtrlAltDel: PropTypes.func.isRequired,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
};

const VncConnectingOverlay = () => {
  const { t } = useTranslation();
  return (
    <div className="has-z-index-overlay hw-vnc-connecting-overlay" data-note="vnc-connecting">
      <div className="text-center">
        <span className="spinner-border hw-loading-spinner" role="status" aria-hidden="true" />
        <p className="mt-2">{t('console.vncConnectingOverlay.connecting')}</p>
        <p className="small text-muted mt-1">{t('console.vncConnectingOverlay.usingReactVnc')}</p>
      </div>
    </div>
  );
};

const VncStage = ({
  className,
  showControls,
  controls,
  wsUrl,
  connected,
  connecting,
  children,
}) => (
  <div className={`vnc-viewer-react ${className}`} data-viewer="vnc">
    {showControls ? controls : null}
    <div className={showControls ? 'hw-vnc-display-with-controls' : 'hw-vnc-display-no-controls'}>
      {!wsUrl || (connecting && !connected) ? <VncConnectingOverlay /> : null}
      {wsUrl ? children : null}
    </div>
  </div>
);

VncStage.propTypes = {
  className: PropTypes.string.isRequired,
  showControls: PropTypes.bool.isRequired,
  controls: PropTypes.node.isRequired,
  wsUrl: PropTypes.string.isRequired,
  connected: PropTypes.bool.isRequired,
  connecting: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The VNC viewer, hyperweaver-ui's `react-vnc` viewer over the agent's
 * websockify socket, `machines/{name}/vnc/websockify` at the path the
 * role fixes: one ticket bound to the machine is asked for as the
 * viewer mounts and again after a real drop, so the viewer's own
 * reconnect always upgrades with a live one, and the screen mounts only
 * once the socket URL with its ticket is known, because the viewer
 * connects on mount alone. The optional control bar draws the status
 * dot, Ctrl+Alt+Del and Connect or Disconnect; the imperative handle
 * hands the console menus `sendKey`, `sendCtrlAltDel`, `clipboardPaste`,
 * which types the text key by key, `connect`, `disconnect`, `refresh`,
 * which asks a new ticket and remounts the screen, the connection state
 * and the underlying RFB object. A missing host or machine and a
 * security failure draw the error card with Retry.
 */
const VncViewerReact = forwardRef(
  (
    {
      id,
      machineName,
      viewOnly = false,
      autoConnect = true,
      quality = 6,
      compression = 2,
      resize = 'scale',
      showDot = true,
      showControls = true,
      resizeSession = false,
      onConnect = null,
      onDisconnect = null,
      onCtrlAltDel = null,
      onClipboard = null,
      className = '',
    },
    ref
  ) => {
    const { t } = useTranslation();
    const status = useStatus();
    const vncRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    const [ticket, setTicket] = useState('');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      let live = true;
      wsTicket(status, id, machineName)
        .then(answer => {
          if (live) {
            setTicket(answer?.ticket || '');
          }
        })
        .catch(ticketError => {
          log.api.error('Error fetching the VNC socket ticket', { error: ticketError.message });
          if (live) {
            setTicket('');
          }
        });
      return () => {
        live = false;
      };
    }, [status, id, machineName, attempt]);

    const wsUrl = viewerUrl(status, id, machineName, ticket);

    const handleRefresh = useCallback(() => {
      setError('');
      setConnected(false);
      setConnecting(true);
      setAttempt(value => value + 1);
    }, []);

    const handleConnect = useCallback(() => {
      if (vncRef.current && !connected && !connecting) {
        setConnecting(true);
        setError('');
        vncRef.current.connect();
      }
    }, [connected, connecting]);

    const handleDisconnect = useCallback(() => {
      if (vncRef.current && connected) {
        vncRef.current.disconnect();
      }
    }, [connected]);

    const handleCtrlAltDel = useCallback(() => {
      performCtrlAltDel(vncRef, connected);
      onCtrlAltDel?.();
    }, [connected, onCtrlAltDel]);

    const handleVncConnect = () => {
      setConnected(true);
      setConnecting(false);
      setError('');
      onConnect?.();
    };

    const handleVncDisconnect = event => {
      if (connected) {
        setAttempt(value => value + 1);
      }
      setConnected(false);
      setConnecting(false);
      onDisconnect?.(event);
    };

    const handleCredentialsRequired = () => {
      setError(t('console.vncViewerReact.authenticationRequired'));
    };

    const handleSecurityFailure = () => {
      setError(t('console.vncViewerReact.securityFailure'));
      setConnecting(false);
    };

    const simulateTyping = useCallback(text => performTyping(vncRef, connected, text), [connected]);

    useImperativeHandle(
      ref,
      () => ({
        sendKey: (keysym, code, down) => performSendKey(vncRef, connected, keysym, code, down),
        sendCtrlAltDel: () => performCtrlAltDel(vncRef, connected),
        clipboardPaste: simulateTyping,
        connect: handleConnect,
        disconnect: handleDisconnect,
        refresh: handleRefresh,
        connected,
        connecting,
        rfb: vncRef.current?.rfb || null,
      }),
      [connected, connecting, handleConnect, handleDisconnect, handleRefresh, simulateTyping]
    );

    if (!id || !machineName) {
      return (
        <VncErrorDisplay
          className={className}
          message={t('console.vncViewerReact.missingParameters')}
        />
      );
    }

    if (error) {
      return <VncErrorDisplay className={className} message={error} onRetry={handleRefresh} />;
    }

    const controls = (
      <VncControls
        connected={connected}
        connecting={connecting}
        machineName={machineName}
        onCtrlAltDel={handleCtrlAltDel}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    );

    return (
      <VncStage
        className={className}
        showControls={showControls}
        wsUrl={wsUrl}
        connected={connected}
        connecting={connecting}
        controls={controls}
      >
        <VncScreen
          key={`${attempt}|${wsUrl}`}
          ref={vncRef}
          url={wsUrl}
          viewOnly={viewOnly}
          scaleViewport={resize === 'scale' && !resizeSession}
          resizeSession={resizeSession}
          autoConnect={autoConnect}
          background="#000000"
          qualityLevel={quality}
          compressionLevel={compression}
          showDotCursor={showDot}
          retryDuration={RETRY_MS}
          className="hw-vnc-screen"
          onConnect={handleVncConnect}
          onDisconnect={handleVncDisconnect}
          onCredentialsRequired={handleCredentialsRequired}
          onSecurityFailure={handleSecurityFailure}
          onClipboard={onClipboard || undefined}
        />
      </VncStage>
    );
  }
);

VncViewerReact.displayName = 'VncViewerReact';

VncViewerReact.propTypes = {
  id: PropTypes.string.isRequired,
  machineName: PropTypes.string.isRequired,
  viewOnly: PropTypes.bool,
  autoConnect: PropTypes.bool,
  quality: PropTypes.number,
  compression: PropTypes.number,
  resize: PropTypes.string,
  showDot: PropTypes.bool,
  showControls: PropTypes.bool,
  resizeSession: PropTypes.bool,
  onConnect: PropTypes.func,
  onDisconnect: PropTypes.func,
  onCtrlAltDel: PropTypes.func,
  onClipboard: PropTypes.func,
  className: PropTypes.string,
};

export default VncViewerReact;
