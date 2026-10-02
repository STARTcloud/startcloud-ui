import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { createRole, deleteRole } from '../api/manage';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';

import ManageTable from './ManageTable';
import RoleCreateModal from './RoleCreateModal';
import RoleDetailsModal from './RoleDetailsModal';
import { ROLE_COLUMNS, RoleRowActions } from './RoleTable';
import TaskDialog from './TaskDialog';

const rowKey = row => row.rolename;

/**
 * Create role in the heading of the roles tab, hyperweaver-ui's button,
 * which opens the create dialog.
 */
export const CreateRoleButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="role-create"
      onClick={onClick}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('host.roleSection.createRole')}
    </button>
  );
};

CreateRoleButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * The roles of a host, hyperweaver-ui's role section as the roles tab
 * of the Manage page's Users and groups section: the one table over
 * the rows the page's binding left, its request filter in the navbar's
 * panel, Create role in the tab's heading, and on each row View
 * details and Delete, the delete behind the typed confirmation; the
 * create and the delete each send one request, raise one notice and
 * read the roles again on a success, a queued task followed on
 * `task-updated`. Nothing polls.
 */
const RoleSection = ({ id, ctx, table, reading, filtering, creating, onCreating }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const follow = useTaskFollow({ id, onEnd: reading.refresh });
  const [dialog, setDialog] = useState(null);

  const write = async ({ call, doneKey, values, close }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.roles.failed',
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
        name="roles"
        columns={ROLE_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={RoleRowActions}
        actionsProps={{ busy, onAction: (kind, row) => setDialog({ kind, role: row }) }}
        ctx={ctx}
        emptyKey="host.roleTable.noRolesFound"
        reading={reading}
        filtering={filtering}
      />
      {creating ? (
        <RoleCreateModal
          busy={busy}
          onClose={onCreating}
          onConfirm={body =>
            write({
              call: () => createRole(status, id, body),
              doneKey: 'hosts.manage.roles.created',
              values: { name: body.rolename },
              close: onCreating,
            })
          }
        />
      ) : null}
      {dialog?.kind === 'details' ? (
        <RoleDetailsModal role={dialog.role} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <ConfirmModal
          show
          handleClose={() => setDialog(null)}
          handleConfirm={() =>
            write({
              call: () => deleteRole(status, id, dialog.role.rolename),
              doneKey: 'hosts.manage.roles.deleted',
              values: { name: dialog.role.rolename },
              close: () => setDialog(null),
            })
          }
          title={t('host.roleSection.deleteRoleTitle')}
          message={t('host.roleSection.deleteRoleMessage', { rolename: dialog.role.rolename })}
          confirmText={t('host.roleSection.delete')}
          variant="delete"
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

RoleSection.propTypes = {
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

export default RoleSection;
