import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { fetchTimeSyncConfig, saveTimeSyncConfig, serviceAction } from '../../api/manage';
import { useManageRead, useManageSend } from '../../hooks/useHostManage';
import { configServers, isConfigValid, withServer, withoutServer } from '../../utils/manage';
import NTPConfirmActionModal from '../NTPConfirmActionModal';
import TaskDialog from '../TaskDialog';

import ConfigActions from './Config/Actions';
import ConfigEditor from './Config/Editor';
import ConfigInfo from './Config/Info';
import ServerManagement from './Config/ServerManagement';
import ConfigTemplates from './Config/Templates';

const serviceDescriptionKey = service => {
  if (service === 'ntp') {
    return 'hostTime.timeSyncConfig.usingNtpService';
  }
  return service === 'chrony'
    ? 'hostTime.timeSyncConfig.usingChronyService'
    : 'hostTime.timeSyncConfig.autoDetectService';
};

/**
 * The time synchronization configuration of a host, hyperweaver-ui's
 * configuration tab of the Manage page's Time and NTP section: the
 * information of `GET system/time-sync/config`, the template the agent
 * suggests, the servers the text names with a box that adds one and a
 * cross that drops one, the editor with its backup switch, and Save,
 * Reset and Restart service. The save sends `PUT system/time-sync/config`
 * and the restart `POST services/action` on the FMRI the status names,
 * each behind the typed confirmation, raising one notice and reading
 * the configuration and the status again on a success; the text the
 * editor holds follows a fresh read of the file. Nothing polls.
 */
const TimeSyncConfig = ({ id, hostname, statusReading }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const config = useManageRead(
    useCallback(() => fetchTimeSyncConfig(status, id), [status, id]),
    true
  );
  const [content, setContent] = useState('');
  const [backup, setBackup] = useState(false);
  const [template, setTemplate] = useState('');
  const [newServer, setNewServer] = useState('');
  const [action, setAction] = useState('');
  const [seen, setSeen] = useState('');
  const configInfo = config.data;
  const fileText = configInfo?.current_config || '';

  if (fileText !== seen) {
    setSeen(fileText);
    setContent(fileText);
  }

  const loadTemplate = () => {
    const text = configInfo?.suggested_defaults?.config_template;
    if (!text) {
      notify('danger', t('hosts.manage.time.noTemplate'));
      return;
    }
    setContent(text);
  };

  const confirm = async () => {
    if (action === 'restart' && !statusReading.data?.service_details?.fmri) {
      notify('danger', t('hosts.manage.time.noFmri'));
      setAction('');
      return;
    }
    const { error } = await send({
      call:
        action === 'save'
          ? () => saveTimeSyncConfig(status, id, { content, backup })
          : () => serviceAction(status, id, statusReading.data.service_details.fmri, 'restart'),
      doneKey: `hosts.manage.time.${action === 'save' ? 'saved' : 'restart'}`,
      failKey: 'hosts.manage.time.failed',
    });
    setAction('');
    if (!error) {
      config.refresh();
      statusReading.refresh();
    }
  };

  const valid = isConfigValid(content);

  return (
    <div data-tab="time-config">
      <p className="text-muted">
        {t('hostTime.timeSyncConfig.description', { hostname })}{' '}
        {t(serviceDescriptionKey(configInfo?.service))}
      </p>
      {config.loaded ? null : <p>{t('pages.loading')}</p>}
      {config.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      <ConfigInfo configInfo={configInfo} />
      <ConfigTemplates
        configInfo={configInfo}
        selectedTemplate={template}
        setSelectedTemplate={setTemplate}
        onLoadTemplate={loadTemplate}
        busy={busy}
      />
      <ServerManagement
        serverList={configServers(content)}
        newServer={newServer}
        setNewServer={setNewServer}
        onAddServer={() => {
          setContent(withServer(content, newServer));
          setNewServer('');
        }}
        onRemoveServer={server => setContent(withoutServer(content, server))}
        busy={busy}
      />
      <ConfigEditor
        configContent={content}
        setConfigContent={setContent}
        backupConfig={backup}
        setBackupConfig={setBackup}
        valid={valid}
        busy={busy}
      />
      <ConfigActions
        onSave={() => setAction('save')}
        onReset={() => setContent(fileText)}
        onRestart={() => setAction('restart')}
        hasChanges={content !== fileText}
        valid={valid}
        busy={busy}
      />
      {action ? (
        <NTPConfirmActionModal
          service={configInfo}
          action={action}
          onClose={() => setAction('')}
          onConfirm={confirm}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

TimeSyncConfig.propTypes = {
  id: PropTypes.string.isRequired,
  hostname: PropTypes.string.isRequired,
  statusReading: PropTypes.shape({
    data: PropTypes.object,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
};

export default TimeSyncConfig;
