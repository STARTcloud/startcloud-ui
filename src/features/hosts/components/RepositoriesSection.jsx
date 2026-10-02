import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import {
  addRepository,
  deleteRepository,
  toggleRepository,
  updateRepository,
} from '../api/repositories';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { repositoryKey } from '../utils/repositories';

import AddRepositoryModal from './AddRepositoryModal';
import EditRepositoryModal from './EditRepositoryModal';
import ManageTable from './ManageTable';
import { REPOSITORY_COLUMNS, RepositoryRowActions } from './RepositoryTable';
import TaskDialog from './TaskDialog';

/**
 * Add repository in the section's heading, hyperweaver-ui's button,
 * which opens the add dialog.
 */
export const AddRepositoryButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="repository-add"
      onClick={onClick}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('host.repositorySection.addRepository')}
    </button>
  );
};

AddRepositoryButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * The package repositories of a host, hyperweaver-ui's
 * `RepositorySection` as the body of the Manage page's Repositories
 * section: the one table over the publishers the page's binding left,
 * the enabled-only switch in the navbar's panel and the type as a filter
 * group, Add in the heading, and on each row Enable or Disable, Edit and
 * Delete, the delete behind the typed confirmation; every write one
 * request and one notice, the list read again on a success and again
 * when a queued task ends. Nothing polls.
 */
const RepositoriesSection = ({ id, ctx, table, reading, filtering, creating, onCreating }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const follow = useTaskFollow({ id, onEnd: reading.refresh });
  const [dialog, setDialog] = useState(null);
  const deleteMessage =
    dialog?.kind === 'delete' ? (
      <p className="mb-0" data-dialog="repository-delete">
        {t('host.repositorySection.deleteMessage', { name: dialog.repository.name })}
      </p>
    ) : null;

  const write = async ({ call, doneKey, values, close = () => null }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.repositories.failed',
    });
    if (!error) {
      follow(answer);
      close();
      reading.refresh();
    }
  };

  const onAction = (action, row) => {
    if (action === 'enable' || action === 'disable') {
      write({
        call: () => toggleRepository(status, id, row.name, action === 'enable'),
        doneKey: `hosts.manage.repositories.${action}d`,
        values: { name: row.name },
      });
    } else {
      setDialog({ kind: action, repository: row });
    }
  };

  return (
    <>
      <ManageTable
        name="repositories"
        columns={REPOSITORY_COLUMNS}
        table={table}
        rowKey={repositoryKey}
        RowActions={RepositoryRowActions}
        actionsProps={{ busy, onAction }}
        ctx={ctx}
        emptyKey="host.repositoryTable.noRepositoriesFound"
        reading={reading}
        filtering={filtering}
      />
      {creating ? (
        <AddRepositoryModal
          busy={busy}
          onClose={onCreating}
          onConfirm={body =>
            write({
              call: () => addRepository(status, id, body),
              doneKey: 'hosts.manage.repositories.added',
              values: { name: body.name },
              close: onCreating,
            })
          }
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <EditRepositoryModal
          repository={dialog.repository}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={body =>
            write({
              call: () => updateRepository(status, id, dialog.repository.name, body),
              doneKey: 'hosts.manage.repositories.updated',
              values: { name: dialog.repository.name },
              close: () => setDialog(null),
            })
          }
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <ConfirmModal
          show
          handleClose={() => setDialog(null)}
          handleConfirm={() =>
            write({
              call: () => deleteRepository(status, id, dialog.repository.name),
              doneKey: 'hosts.manage.repositories.deleted',
              values: { name: dialog.repository.name },
              close: () => setDialog(null),
            })
          }
          title={t('host.repositorySection.deleteTitle')}
          message={deleteMessage}
          confirmText={t('host.repositorySection.delete')}
          variant="delete"
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

RepositoriesSection.propTypes = {
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

export default RepositoriesSection;
