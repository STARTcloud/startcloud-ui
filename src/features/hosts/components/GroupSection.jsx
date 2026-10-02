import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { createGroup, deleteGroup } from '../api/manage';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';

import GroupCreateModal from './GroupCreateModal';
import GroupDetailsModal from './GroupDetailsModal';
import { GROUP_COLUMNS, GroupRowActions } from './GroupTable';
import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';

const rowKey = row => `${row.gid}-${row.groupname}`;

/**
 * Create group in the heading of the groups tab, hyperweaver-ui's
 * button, which opens the create dialog.
 */
export const CreateGroupButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="group-create"
      onClick={onClick}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('host.groupSection.createGroup')}
    </button>
  );
};

CreateGroupButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * The groups of a host, hyperweaver-ui's group section as the groups
 * tab of the Manage page's Users and groups section: the one table
 * over the rows the page's binding left, its request filters in the
 * navbar's panel, Create group in the tab's heading, and on each row
 * View details and Delete, the delete behind the typed confirmation;
 * the create and the delete each send one request, raise one notice
 * and read the groups again on a success, a queued task followed on
 * `task-updated`. Nothing polls.
 */
const GroupSection = ({ id, ctx, table, reading, filtering, creating, onCreating }) => {
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
      failKey: 'hosts.manage.groups.failed',
    });
    if (!error) {
      follow(answer);
      close();
      reading.refresh();
    }
  };

  const deleteMessage = dialog?.kind === 'delete' && (
    <>
      <p>
        {t('host.groupSection.deletePrompt')} <strong>{dialog.group.groupname}</strong>?
      </p>
      <p className="text-danger mb-0">{t('host.groupSection.cannotBeUndone')}</p>
    </>
  );

  return (
    <>
      <ManageTable
        name="groups"
        columns={GROUP_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={GroupRowActions}
        actionsProps={{ busy, onAction: (kind, row) => setDialog({ kind, group: row }) }}
        ctx={ctx}
        emptyKey="host.groupTable.noData"
        reading={reading}
        filtering={filtering}
      />
      {creating ? (
        <GroupCreateModal
          busy={busy}
          onClose={onCreating}
          onConfirm={body =>
            write({
              call: () => createGroup(status, id, body),
              doneKey: 'hosts.manage.groups.created',
              values: { name: body.groupname },
              close: onCreating,
            })
          }
        />
      ) : null}
      {dialog?.kind === 'details' ? (
        <GroupDetailsModal group={dialog.group} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <ConfirmModal
          show
          handleClose={() => setDialog(null)}
          handleConfirm={() =>
            write({
              call: () => deleteGroup(status, id, dialog.group.groupname),
              doneKey: 'hosts.manage.groups.deleted',
              values: { name: dialog.group.groupname },
              close: () => setDialog(null),
            })
          }
          title={t('host.groupSection.confirmDelete')}
          message={deleteMessage}
          confirmText={t('host.groupSection.deleteGroup')}
          variant="delete"
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

GroupSection.propTypes = {
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

export default GroupSection;
