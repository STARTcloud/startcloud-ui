import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleUp } from 'react-icons/fa6';

import ConfigPage from '../../../components/common/ConfigPage';
import ConfirmModal from '../../../components/common/ConfirmModal';
import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import TabStrip from '../../../components/common/TabStrip';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { applyAgentUpdate, checkAgentUpdate, hostConfig } from '../api/agentSettings';
import { ManageRefreshContext, useManageRead } from '../hooks/useHostManage';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostHasSettings, updateOf } from '../utils/agentSettings';
import { hostHasFeature } from '../utils/capabilities';
import { configNamesOf } from '../utils/configNodes';
import { hostLabel, isServerRole } from '../utils/hosts';
import { canManageSettings } from '../utils/permissions';

import AgentSecretsTab from './AgentSecretsTab';
import ApiKeysTab from './ApiKeysTab';
import HostTabs from './HostTabs';
import RefreshButton from './RefreshButton';

const TOKEN_LABEL = 'hypervisors';

const API_TAB = 'api_management';

const SECRETS_TAB = 'secrets';

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const tabsOf = ({ secrets, t }) => [
  { key: API_TAB, label: t('agentSettings.agentSettings.apiManagementTab') },
  ...(secrets
    ? [{ key: SECRETS_TAB, label: t('agentSettings.agentSettings.globalSecretsTab') }]
    : []),
];

const UpdateButton = ({ update, busy, onUpdate }) => {
  const { t } = useTranslation();
  if (!update) {
    return null;
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-success"
      data-action="settings-update"
      onClick={onUpdate}
      disabled={busy}
      title={t('agentSettings.agentSettings.updateAvailableTooltip', { version: update.latest })}
    >
      <FaCircleUp className="me-2" aria-hidden="true" />
      {t('agentSettings.agentSettings.updateToButton', { version: update.latest })}
    </button>
  );
};

UpdateButton.propTypes = {
  update: PropTypes.shape({ current: PropTypes.string, latest: PropTypes.string }),
  busy: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

/**
 * The Agent settings page of a host, for a super-admin alone: the heading
 * with, while `GET app/updates/check` says one is available, Update
 * behind the typed confirmation, `POST app/updates/apply`, one request
 * and one notice, then Refresh; the tab row of the host's pages; then
 * the API management tab and Global secrets behind `secrets`. The
 * agent's own configuration is the config contract's, drawn by the
 * shared configuration pages at `/admin/config/<name>` from
 * `status.config`, and is not read here. Every read is once as the page
 * draws, again when the stream opens fresh or answers `reset`, and on
 * Refresh, which reads the list of servers, the host's stats and every
 * read of the page again; nothing polls.
 */
const SettingsFrame = ({ id, server, context, presses, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const folds = useFolds(`${context.prefsPrefix}_agent_settings`);
  const updateCheck = useManageRead(
    useCallback(() => checkAgentUpdate(status, id), [status, id]),
    true
  );
  const [tab, setTab] = useState(API_TAB);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const available = updateCheck.failed ? null : updateOf(updateCheck.data);
  const label = labelOf({ status, server, id, stats });
  const secrets = hostHasFeature(server, 'secrets');
  const tabs = tabsOf({ secrets, t });
  const active = tab === SECRETS_TAB && !secrets ? API_TAB : tab;

  useEffect(() => {
    document.title = `${t('navbar.contextTabs.agent')} · ${label}`;
  }, [t, label]);

  const refresh = () => {
    refreshServers();
    refreshStats();
    onRefresh();
  };

  const applyUpdate = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const answer = await applyAgentUpdate(status, id);
      notify(
        'success',
        t('agentSettings.agentSettings.updateQueuedDetail', {
          message: answer?.message || t('agentSettings.agentSettings.updateQueuedFallback'),
          taskId: answer?.task_id,
          targetVersion: answer?.target_version,
        })
      );
    } catch (error) {
      notify(
        'danger',
        t('agentSettings.agentSettings.failedQueueUpdate', { message: error.message })
      );
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <>
      <UpdateButton update={available} busy={busy} onUpdate={() => setConfirming(true)} />
      <RefreshButton onRefresh={refresh} />
    </>
  );

  return (
    <div className="list row" data-page="agent-settings" data-refreshes={presses}>
      <PageHeader
        title={t('agentSettings.agentSettings.pageHeading')}
        subtitle={label}
        actions={actions}
      />
      <HostTabs id={id} />
      <TabStrip tabs={tabs} active={active} onSelect={setTab} className="mb-3" />
      <div data-settings-tab={active}>
        {active === API_TAB ? <ApiKeysTab id={id} folds={folds} /> : null}
        {active === SECRETS_TAB ? <AgentSecretsTab id={id} folds={folds} /> : null}
      </div>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={applyUpdate}
        title={t('agentSettings.agentSettings.updateAgentTitle')}
        message={t('agentSettings.agentSettings.updateAgentMessage', {
          currentVersion: available?.current,
          latestVersion: available?.latest,
        })}
        confirmText={t('agentSettings.agentSettings.updateNowButton')}
        variant="restart"
        keyword="update"
      />
    </div>
  );
};

SettingsFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  presses: PropTypes.number.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * One configuration file of a host at `/hosts/{id}/settings/<name>`, the
 * second mount of the shared `ConfigPage` engine: the tab row of the
 * host's pages, then the file's page heading with Update, the restart
 * card and the sections exactly as `/admin/config/<name>` draws them,
 * over `hostConfig`, the adapter bound to this host through the path the
 * role fixes, the names the row's `capabilities.config`; the document
 * title is the agent tab's name and the host's label, as `SettingsFrame`
 * sets it.
 */
const ConfigFrame = ({ id, server, name }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { stats } = useHostStats(id);
  const config = useMemo(() => hostConfig(status, id), [status, id]);
  const label = labelOf({ status, server, id, stats });

  useEffect(() => {
    document.title = `${t('navbar.contextTabs.agent')} · ${label}`;
  }, [t, label]);

  return (
    <div className="list row" data-page="agent-config" data-config={name}>
      <HostTabs id={id} />
      <ConfigPage config={config} names={configNamesOf(server)} name={name} />
    </div>
  );
};

ConfigFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
};

const UnknownHost = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
  };

  return (
    <div className="list row" data-page="agent-settings-unknown">
      <PageHeader
        title={t('agentSettings.agentSettings.pageHeading')}
        subtitle={labelOf({ status, server: null, id, stats })}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
    </div>
  );
};

UnknownHost.propTypes = {
  id: PropTypes.string.isRequired,
};

/**
 * The Agent settings route of one host at `/hosts/{id}/settings`: the
 * page for a super-admin alone, hyperweaver-ui's gate, the access-denied
 * line otherwise; offered to a host whose own row names a hypervisor,
 * because hyperweaver-ui drew the door behind no token, a row that names
 * none drawing the not-available stub with nothing asked of it; an id
 * the list of servers does not hold draws what the host page draws for
 * it. The page provides the count of its Refresh presses to every read
 * under it, so one press reads the whole page again. With a `name`, the
 * segment of `/hosts/{id}/settings/:name`, the same gates stand and the
 * page is `ConfigFrame`, the named configuration file of the host over
 * the shared engine.
 */
const AgentSettings = ({ id, context, name = '' }) => {
  const { t } = useTranslation();
  const { loaded: listed } = useServers();
  const server = useHostRow(id);
  const [presses, setPresses] = useState(0);

  if (!listed) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (!server) {
    return <UnknownHost id={id} />;
  }

  if (!hostHasSettings(server)) {
    return (
      <NotAvailableStub
        title={t('agentSettings.agentSettings.pageHeading')}
        tokenLabel={TOKEN_LABEL}
      />
    );
  }

  if (!canManageSettings(context.user?.role)) {
    return (
      <div className="list row" data-page="agent-settings-denied">
        <PageHeader
          title={t('agentSettings.agentSettings.pageHeading')}
          subtitle={hostLabel(server)}
        />
        <div className="alert alert-danger" role="alert" data-note="access-denied">
          {t('agentSettings.agentSettings.accessDenied')}
        </div>
      </div>
    );
  }

  if (name) {
    return <ConfigFrame id={id} server={server} name={name} />;
  }

  return (
    <ManageRefreshContext.Provider value={presses}>
      <SettingsFrame
        id={id}
        server={server}
        context={context}
        presses={presses}
        onRefresh={() => setPresses(current => current + 1)}
      />
    </ManageRefreshContext.Provider>
  );
};

AgentSettings.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  name: PropTypes.string,
};

export default AgentSettings;
