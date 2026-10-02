import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import {
  createUser,
  deleteUser,
  fetchUserAttributes,
  lockUser,
  setUserPassword,
  updateUser,
} from '../api/manage';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';

import ManageTable from './ManageTable';
import SetPasswordModal from './SetPasswordModal';
import TaskDialog from './TaskDialog';
import UserCreateModal from './UserCreateModal';
import UserDetailsModal from './UserDetailsModal';
import UserEditModal from './UserEditModal';
import { USER_COLUMNS, UserRowActions } from './UserTable';

const rowKey = row => row.username;

/**
 * Create user in the heading of the users tab, hyperweaver-ui's button,
 * which opens the create dialog.
 */
export const CreateUserButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="user-create"
      onClick={onClick}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('host.userSection.createUser')}
    </button>
  );
};

CreateUserButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const CONFIRMS = {
  delete: {
    titleKey: 'host.userTable.deleteUserTitle',
    messageKey: 'host.userTable.deleteUserConfirm',
    confirmKey: 'host.userTable.delete',
    variant: 'delete',
    keyword: 'delete',
  },
  lock: {
    titleKey: 'host.userTable.lockUserAccountTitle',
    messageKey: 'host.userTable.lockUserConfirm',
    confirmKey: 'host.userTable.lock',
    variant: 'restart',
    keyword: 'lock',
  },
};

/**
 * The users of a host, hyperweaver-ui's user section as the users tab
 * of the Manage page's Users and groups section: the one table over
 * the rows the page's binding left, its request filters in the
 * navbar's panel, Create user in the tab's heading, and on each row
 * Edit, Set password, Lock account, View details and Delete. The
 * create, the edit, the password and the delete each open their dialog
 * over the pages contract's form or typed confirmation, send one
 * request, raise one notice and read the users again on a success; a
 * write the agent queues as a task is followed on `task-updated` and
 * the users read again when it ends. Nothing polls.
 */
const UserSection = ({
  id,
  ctx,
  table,
  reading,
  filtering,
  groups,
  roles,
  creating,
  onCreating,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const follow = useTaskFollow({ id, onEnd: reading.refresh });
  const [dialog, setDialog] = useState(null);
  const [opening, setOpening] = useState(false);

  const write = async ({ call, doneKey, values, close }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.users.failed',
    });
    if (!error) {
      follow(answer);
      close();
      reading.refresh();
    }
  };

  const openDetails = async row => {
    setOpening(true);
    try {
      const attributes = await fetchUserAttributes(status, id, row.username);
      setDialog({ kind: 'details', user: { ...row, attributes } });
    } catch (error) {
      notify('danger', t('host.userSection.errorLoadingUserDetails', { message: error.message }));
    } finally {
      setOpening(false);
    }
  };

  const onAction = (action, row) => {
    if (action === 'details') {
      openDetails(row);
    } else {
      setDialog({ kind: action, user: row });
    }
  };

  const confirm = dialog && CONFIRMS[dialog.kind] ? CONFIRMS[dialog.kind] : null;

  return (
    <>
      <ManageTable
        name="users"
        columns={USER_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={UserRowActions}
        actionsProps={{ busy: busy || opening, onAction }}
        ctx={ctx}
        emptyKey="host.userTable.noUsersFound"
        reading={reading}
        filtering={filtering}
      />
      {creating ? (
        <UserCreateModal
          groups={groups}
          roles={roles}
          busy={busy}
          onClose={onCreating}
          onConfirm={body =>
            write({
              call: () => createUser(status, id, body),
              doneKey: 'hosts.manage.users.created',
              values: { name: body.username },
              close: onCreating,
            })
          }
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <UserEditModal
          id={id}
          user={dialog.user}
          groups={groups}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={body =>
            write({
              call: () => updateUser(status, id, dialog.user.username, body),
              doneKey: 'hosts.manage.users.updated',
              values: { name: dialog.user.username },
              close: () => setDialog(null),
            })
          }
        />
      ) : null}
      {dialog?.kind === 'password' ? (
        <SetPasswordModal
          user={dialog.user}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={body =>
            write({
              call: () => setUserPassword(status, id, dialog.user.username, body),
              doneKey: 'hosts.manage.users.passwordSet',
              values: { name: dialog.user.username },
              close: () => setDialog(null),
            })
          }
        />
      ) : null}
      {dialog?.kind === 'details' ? (
        <UserDetailsModal user={dialog.user} onClose={() => setDialog(null)} />
      ) : null}
      {confirm ? (
        <ConfirmModal
          show
          handleClose={() => setDialog(null)}
          handleConfirm={() =>
            write({
              call: () =>
                dialog.kind === 'delete'
                  ? deleteUser(status, id, dialog.user.username)
                  : lockUser(status, id, dialog.user.username),
              doneKey: `hosts.manage.users.${dialog.kind === 'delete' ? 'deleted' : 'locked'}`,
              values: { name: dialog.user.username },
              close: () => setDialog(null),
            })
          }
          title={t(confirm.titleKey)}
          message={t(confirm.messageKey, { username: dialog.user.username })}
          confirmText={t(confirm.confirmKey)}
          variant={confirm.variant}
          keyword={confirm.keyword}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

UserSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  creating: PropTypes.bool.isRequired,
  onCreating: PropTypes.func.isRequired,
};

export default UserSection;
