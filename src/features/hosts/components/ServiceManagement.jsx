import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchService, fetchServiceProperties, serviceAction } from '../api/manage';
import { useManageSend } from '../hooks/useHostManage';
import { serviceName } from '../utils/manage';

import ManageTable from './ManageTable';
import ServiceDetailsModal from './ServiceDetailsModal';
import ServicePropertiesModal from './ServicePropertiesModal';
import { SERVICE_COLUMNS, ServiceRowActions } from './ServiceTable';
import TaskDialog from './TaskDialog';

const rowKey = row => row.fmri;

/**
 * The services of a host, hyperweaver-ui's service management as the
 * body of the Manage page's Services section: the one table over the
 * rows the page's binding left, the request filters of the zone and the
 * disabled services in the navbar's panel, and on each row the actions
 * of `ServiceRowActions`. Enable, Disable, Restart and Refresh each
 * send `POST services/action`, raise one notice and read the services
 * again on a success; View details and View properties read the
 * service's own routes and open their dialogs, a failed read raised as
 * a notice. Nothing polls.
 */
const ServiceManagement = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const [opening, setOpening] = useState(false);

  const act = async (action, row) => {
    const { error } = await send({
      call: () => serviceAction(status, id, row.fmri, action),
      doneKey: 'hosts.manage.services.done',
      values: { name: serviceName(row.fmri), action: t(`host.serviceTable.actions.${action}`) },
      failKey: 'hosts.manage.services.failed',
    });
    if (!error) {
      reading.refresh();
    }
  };

  const open = async (kind, row) => {
    setOpening(true);
    try {
      if (kind === 'details') {
        const details = await fetchService(status, id, row.fmri);
        setDialog({ kind, service: { ...row, details } });
      } else {
        const properties = await fetchServiceProperties(status, id, row.fmri);
        setDialog({ kind, service: { ...row, properties } });
      }
    } catch (error) {
      notify('danger', t('hosts.manage.services.readFailed', { message: error.message }));
    } finally {
      setOpening(false);
    }
  };

  const onAction = (action, row) => {
    if (action === 'details' || action === 'properties') {
      open(action, row);
    } else {
      act(action, row);
    }
  };

  return (
    <>
      <ManageTable
        name="services"
        columns={SERVICE_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={ServiceRowActions}
        actionsProps={{ busy: busy || opening, onAction }}
        ctx={ctx}
        emptyKey="host.serviceTable.empty"
        reading={reading}
        filtering={filtering}
      />
      {dialog?.kind === 'details' ? (
        <ServiceDetailsModal service={dialog.service} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'properties' ? (
        <ServicePropertiesModal
          service={dialog.service}
          ctx={ctx}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

ServiceManagement.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default ServiceManagement;
