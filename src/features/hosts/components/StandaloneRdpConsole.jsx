import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaKeyboard, FaPaste } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import { log } from '../../../lib/logger';
import { useHostRow } from '../hooks/useHostRow';
import { useServers } from '../hooks/useServers';
import { hostHasConsole } from '../utils/capabilities';
import { hostLabel } from '../utils/hosts';

import RdpConnectionPanel from './RdpConnectionPanel';
import RdpSessionHost from './RdpSessionHost';

const SETTINGS = {
  colorDepth: 16,
  lossy: true,
  audio: true,
  clipboard: true,
  scale: 'fit',
  resizeMode: 'follow-guest',
};

/**
 * The full-window browser-RDP console of one machine at
 * `/hosts/{id}/machines/{name}/console/rdp`, hyperweaver-ui's standalone
 * RDP console, opened in its own tab by the RDP console's Open in new
 * tab, `?target=guest` for the guest's own RDP server in place of the
 * hypervisor's remote display: the strip with the connection details
 * panel, Send clipboard and Ctrl+Alt+Del over the session host, the
 * session this tab's own with the console's default settings. It draws
 * the loading line while the list of servers has not answered, the
 * placard for a host the list does not name and the not-available
 * placard for a host whose row lists no `rdp` console token.
 */
const StandaloneRdpConsole = ({ id, name }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { loaded } = useServers();
  const server = useHostRow(id);
  const target = searchParams.get('target') === 'guest' ? 'guest' : 'console';
  const uiRef = useRef(null);
  const [phase, setPhase] = useState('connecting');
  const [connectKey, setConnectKey] = useState(0);
  const label =
    target === 'guest'
      ? t('console.standaloneRdpConsole.rdpLabel')
      : t('console.standaloneRdpConsole.vrdpLabel');

  useEffect(() => {
    document.title = `${label} · ${name}`;
  }, [label, name]);

  if (!loaded) {
    return (
      <div className="list row" data-page="console">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const sendClipboard = async () => {
    try {
      await uiRef.current?.sendClipboardData();
    } catch (error) {
      log.component.warn('RDP clipboard send', { error: error.message });
    }
  };

  let body = null;
  if (!server) {
    body = (
      <div className="alert alert-danger" role="alert" data-note="unknown-host">
        {t('console.standaloneRdpConsole.unknownHost', { agentId: id })}
      </div>
    );
  } else if (!hostHasConsole(server, 'rdp')) {
    body = (
      <div className="alert alert-info" role="status" data-note="no-console">
        {t('pages.machines.noConsoleAvailable')}
      </div>
    );
  } else {
    body = (
      <div className="hw-standalone-console">
        <div className="hw-console-header flex-shrink-0 px-3 py-2">
          <h6 className="fs-6 fw-bold text-white mb-0">
            {label} — {name}
          </h6>
          <div className="d-flex gap-1 m-0">
            <RdpConnectionPanel
              uiRef={uiRef}
              connected={phase === 'connected'}
              id={id}
              machineName={name}
              settings={SETTINGS}
            />
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={sendClipboard}
              disabled={phase !== 'connected'}
              title={t('console.standaloneRdpConsole.sendClipboard')}
              aria-label={t('console.standaloneRdpConsole.sendClipboard')}
              data-action="console-paste"
            >
              <FaPaste aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => uiRef.current?.ctrlAltDel()}
              disabled={phase !== 'connected'}
              title={t('console.standaloneRdpConsole.sendCtrlAltDel')}
              aria-label={t('console.standaloneRdpConsole.sendCtrlAltDel')}
              data-action="console-ctrl-alt-del"
            >
              <FaKeyboard aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="hw-standalone-console-viewer position-relative">
          <RdpSessionHost
            id={id}
            machineName={name}
            settings={SETTINGS}
            target={target}
            uiRef={uiRef}
            connectKey={connectKey}
            onPhase={setPhase}
            onReconnect={() => setConnectKey(key => key + 1)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="list row" data-page="console">
      <PageHeader title={`${label} · ${name}`} subtitle={server ? hostLabel(server) : String(id)} />
      {body}
    </div>
  );
};

StandaloneRdpConsole.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default StandaloneRdpConsole;
