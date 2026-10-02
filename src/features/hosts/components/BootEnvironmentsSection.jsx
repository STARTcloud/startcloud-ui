import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import {
  activateBootEnvironment,
  createBootEnvironment,
  deleteBootEnvironment,
  mountBootEnvironment,
  unmountBootEnvironment,
} from '../api/bootEnvironments';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';

import { BOOT_ENVIRONMENT_COLUMNS, BootEnvironmentRowActions } from './BootEnvironmentTable';
import ConfirmActionModal from './ConfirmActionModal';
import CreateBEModal from './CreateBEModal';
import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';

const rowKey = row => row.name;

const DONE_KEYS = {
  activate: 'hosts.manage.bootEnvironments.activated',
  mount: 'hosts.manage.bootEnvironments.mounted',
  unmount: 'hosts.manage.bootEnvironments.unmounted',
  delete: 'hosts.manage.bootEnvironments.deleted',
};

const requestOf = ({ status, id, name, action, options }) => {
  switch (action) {
    case 'activate':
      return activateBootEnvironment(status, id, name, options.temporary);
    case 'mount':
      return mountBootEnvironment(status, id, name, options);
    case 'unmount':
      return unmountBootEnvironment(status, id, name, options.force);
    default:
      return deleteBootEnvironment(status, id, name, options);
  }
};

/**
 * Create boot environment in the section's heading, hyperweaver-ui's
 * button, which opens the create dialog.
 */
export const CreateBootEnvironmentButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="boot-environment-create"
      onClick={onClick}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('host.bootEnvironmentManagement.createBootEnvironment')}
    </button>
  );
};

CreateBootEnvironmentButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * The boot environments of a host, hyperweaver-ui's
 * `BootEnvironmentManagement` as the body of the Manage page's Boot
 * environments section: the one table over the rows the page's binding
 * left, the detail and snapshots switches in the navbar's panel, Create
 * in the heading, and on each row Activate, Mount or Unmount and Delete,
 * each behind hyperweaver-ui's confirmation with its options; every
 * write one request and one notice, the list read again on a success
 * and again when a queued task ends. Nothing polls.
 */
const BootEnvironmentsSection = ({ id, ctx, table, reading, filtering, creating, onCreating }) => {
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const follow = useTaskFollow({ id, onEnd: reading.refresh });
  const [dialog, setDialog] = useState(null);

  const write = async ({ call, doneKey, values, close }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.bootEnvironments.failed',
    });
    if (!error) {
      follow(answer);
      close();
      reading.refresh();
    }
  };

  return (
    <>
      <ManageTable
        name="boot-environments"
        columns={BOOT_ENVIRONMENT_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={BootEnvironmentRowActions}
        actionsProps={{ busy, onAction: (action, row) => setDialog({ action, environment: row }) }}
        ctx={ctx}
        emptyKey="host.bootEnvironmentTable.empty"
        reading={reading}
        filtering={filtering}
      />
      {creating ? (
        <CreateBEModal
          busy={busy}
          onClose={onCreating}
          onConfirm={body =>
            write({
              call: () => createBootEnvironment(status, id, body),
              doneKey: 'hosts.manage.bootEnvironments.created',
              values: { name: body.name },
              close: onCreating,
            })
          }
        />
      ) : null}
      {dialog ? (
        <ConfirmActionModal
          bootEnvironment={dialog.environment}
          action={dialog.action}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(name, action, options) =>
            write({
              call: () => requestOf({ status, id, name, action, options }),
              doneKey: DONE_KEYS[action],
              values: { name },
              close: () => setDialog(null),
            })
          }
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

BootEnvironmentsSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  creating: PropTypes.bool.isRequired,
  onCreating: PropTypes.func.isRequired,
};

export default BootEnvironmentsSection;
