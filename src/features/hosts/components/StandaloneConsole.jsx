import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../../components/common/PageHeader';
import { useHostRow } from '../hooks/useHostRow';
import { useServers } from '../hooks/useServers';
import { hostHasConsole } from '../utils/capabilities';
import { hostLabel } from '../utils/hosts';

import VncViewerReact from './VncViewerReact';

/**
 * The full-window VNC console of one machine at
 * `/hosts/{id}/machines/{name}/console/vnc`, hyperweaver-ui's standalone
 * console, opened in its own tab by the console's Open in new tab: the
 * viewer with its control bar over the running session, the tab sharing
 * the origin's session. It draws the loading line while the list of
 * servers has not answered, the placard for a host the list does not
 * name and the not-available placard for a host whose row lists no
 * `vnc` console token.
 */
const StandaloneConsole = ({ id, name }) => {
  const { t } = useTranslation();
  const { loaded } = useServers();
  const server = useHostRow(id);

  useEffect(() => {
    document.title = `${t('chrome.sidebarMenu.vncConsole')} · ${name}`;
  }, [name, t]);

  if (!loaded) {
    return (
      <div className="list row" data-page="console">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  let body = null;
  if (!server) {
    body = (
      <div className="alert alert-danger" role="alert" data-note="unknown-host">
        {t('console.standaloneConsole.unknownHost', { agentId: id })}
      </div>
    );
  } else if (!hostHasConsole(server, 'vnc')) {
    body = (
      <div className="alert alert-info" role="status" data-note="no-console">
        {t('pages.machines.noConsoleAvailable')}
      </div>
    );
  } else {
    body = (
      <div className="hw-standalone-console">
        <VncViewerReact
          id={id}
          machineName={name}
          autoConnect
          showControls
          resize="scale"
          className="hw-standalone-console-viewer"
        />
      </div>
    );
  }

  return (
    <div className="list row" data-page="console">
      <PageHeader
        title={`${t('chrome.sidebarMenu.vncConsole')} · ${name}`}
        subtitle={server ? hostLabel(server) : String(id)}
      />
      {body}
    </div>
  );
};

StandaloneConsole.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default StandaloneConsole;
