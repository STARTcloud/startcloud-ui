import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { fetchTimeSyncSystems, serviceAction, switchTimeSync, syncTime } from '../../api/manage';
import { useManageRead, useManageSend } from '../../hooks/useHostManage';
import ManageTable from '../ManageTable';
import NTPConfirmActionModal from '../NTPConfirmActionModal';
import TaskDialog from '../TaskDialog';

import TimeSyncActions from './Actions';
import { PEER_COLUMNS, PeerLegend } from './PeerTable';
import TimeSyncServiceInfo from './ServiceInfo';
import TimeSyncServiceManagement from './ServiceManagement';

const rowKey = row => row.remote || row.name;

const SWITCH = 'switch-';

/**
 * The time synchronization status of a host, hyperweaver-ui's status
 * tab of the Manage page's Time and NTP section: the service
 * information, the peers over the one table narrowed by the page's
 * binding with hyperweaver-ui's legend, Force sync now and Restart
 * service, and the systems the host offers with their switch buttons.
 * A sync sends `POST system/time-sync/sync`, a restart
 * `POST services/action` on the service's FMRI, a switch
 * `POST system/time-sync/switch`, each behind the typed confirmation,
 * raising one notice and reading the status and the systems again on
 * a success. Nothing polls.
 */
const TimeSyncStatus = ({ id, hostname, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const systems = useManageRead(
    useCallback(() => fetchTimeSyncSystems(status, id), [status, id]),
    true
  );
  const [action, setAction] = useState('');
  const statusInfo = reading.data;

  const callOf = () => {
    if (action === 'sync') {
      return () => syncTime(status, id);
    }
    if (action.startsWith(SWITCH)) {
      return () => switchTimeSync(status, id, action.slice(SWITCH.length));
    }
    return () => serviceAction(status, id, statusInfo.service_details.fmri, 'restart');
  };

  const confirm = async () => {
    if (action === 'restart' && !statusInfo?.service_details?.fmri) {
      notify('danger', t('hosts.manage.time.noFmri'));
      setAction('');
      return;
    }
    const { error } = await send({
      call: callOf(),
      doneKey: `hosts.manage.time.${action.startsWith(SWITCH) ? 'switched' : action}`,
      values: { service: action.slice(SWITCH.length) },
      failKey: 'hosts.manage.time.failed',
    });
    setAction('');
    if (!error) {
      reading.refresh();
      systems.refresh();
    }
  };

  return (
    <div data-tab="time-status">
      <p className="text-muted">{t('hostTime.timeSyncStatus.description', { hostname })}</p>
      {statusInfo ? <TimeSyncServiceInfo statusInfo={statusInfo} /> : null}
      <h6 className="fw-bold">
        {t('hostTime.timeSyncPeerTable.heading', { count: table.rows.length })}
      </h6>
      <ManageTable
        name="peers"
        columns={PEER_COLUMNS}
        table={table}
        rowKey={rowKey}
        ctx={ctx}
        emptyKey="hosts.manage.time.noPeers"
        reading={reading}
        filtering={filtering}
      />
      <PeerLegend />
      <h6 className="fw-bold mt-3">{t('hostTime.timeSyncActions.heading')}</h6>
      <TimeSyncActions
        onAction={setAction}
        busy={busy}
        statusAvailable={Boolean(statusInfo?.available)}
      />
      <TimeSyncServiceManagement
        availableSystems={systems.data}
        loaded={systems.loaded}
        busy={busy}
        onSwitch={key => setAction(`${SWITCH}${key}`)}
      />
      {action ? (
        <NTPConfirmActionModal
          service={statusInfo}
          action={action}
          onClose={() => setAction('')}
          onConfirm={confirm}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

TimeSyncStatus.propTypes = {
  id: PropTypes.string.isRequired,
  hostname: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default TimeSyncStatus;
