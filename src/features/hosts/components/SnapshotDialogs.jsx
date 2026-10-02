import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { deleteSnapshot, modifySnapshot, restoreSnapshot, takeSnapshot } from '../api/snapshots';
import { exportTemplate, publishTemplate } from '../api/templates';
import { useHostRow } from '../hooks/useHostRow';
import { useRestoreStart } from '../hooks/useMachineRestore';

import SnapshotEditDialog from './SnapshotEditDialog';
import SnapshotHoldsDialog from './SnapshotHoldsDialog';
import SnapshotTakeDialog from './SnapshotTakeDialog';
import SnapshotTemplateDialog from './SnapshotTemplateDialog';
import TaskDialog from './TaskDialog';

const CONFIRMED = ['restore', 'restore-start', 'delete'];

const TEMPLATES = ['export', 'publish'];

const CONFIRM_TITLES = {
  restore: 'machine.machineSnapshots.confirmRestoreTitle',
  'restore-start': 'machine.machineSnapshots.confirmRestoreStartTitle',
  delete: 'machine.machineSnapshots.confirmDeleteTitle',
};

const CONFIRM_ACTIONS = {
  restore: 'machine.machineSnapshots.confirmRestoreAction',
  'restore-start': 'machine.machineSnapshots.confirmRestoreStartAction',
  delete: 'machine.machineSnapshots.confirmDeleteAction',
};

const CONFIRM_WORDS = {
  restore: 'machine.machineSnapshots.restoreWord',
  'restore-start': 'machine.machineSnapshots.restoreWord',
  delete: 'machine.machineSnapshots.deleteWord',
};

const DONE = {
  restore: 'hosts.snapshots.done.restore',
  'restore-start': 'hosts.snapshots.done.restore',
  delete: 'hosts.snapshots.done.delete',
  export: 'machine.snapshotTemplateModal.exportQueuedFallback',
  publish: 'machine.snapshotTemplateModal.publishQueuedFallback',
};

const sentenceOf = ({ kind, snapshot, name, t }) => {
  if (kind === 'delete') {
    return t('machine.machineSnapshots.confirmDeleteMessage', { snapshotName: snapshot.name });
  }
  const restore = t('machine.machineSnapshots.confirmRestoreMessage', {
    machineName: name,
    snapshotName: snapshot.name,
  });
  return kind === 'restore-start'
    ? `${restore} ${t('machine.machineSnapshots.confirmRestoreStartSuffix')}`
    : restore;
};

const ConfirmMessage = ({ kind, snapshot, name, rollback }) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="mb-0">{sentenceOf({ kind, snapshot, name, t })}</p>
      {rollback && kind !== 'delete' ? (
        <p className="text-danger mt-2 mb-0" data-note="restore-destroys-later">
          {t('hosts.snapshots.confirm.destroysLater', { snapshotName: snapshot.name })}
        </p>
      ) : null}
    </>
  );
};

ConfirmMessage.propTypes = {
  kind: PropTypes.oneOf(CONFIRMED).isRequired,
  snapshot: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  name: PropTypes.string.isRequired,
  rollback: PropTypes.bool.isRequired,
};

const FormDialogs = ({ id, name, open, utm, running, busy, onClose, onSend }) => {
  const status = useStatus();
  if (open.kind === 'take') {
    return (
      <SnapshotTakeDialog
        name={name}
        utm={utm}
        running={running}
        busy={busy}
        onClose={onClose}
        onTake={body =>
          onSend({
            call: () => takeSnapshot(status, id, name, body),
            doneKey: 'hosts.snapshots.done.take',
            failKey: 'machine.machineSnapshots.snapshotFailed',
          })
        }
      />
    );
  }
  if (open.kind === 'edit') {
    return (
      <SnapshotEditDialog
        snapshot={open.snapshot}
        busy={busy}
        onClose={onClose}
        onSave={body =>
          onSend({
            call: () => modifySnapshot(status, id, name, open.snapshot.name, body),
            doneKey: 'hosts.snapshots.done.edit',
            failKey: 'machine.machineSnapshots.editFailed',
            values: { snapshot: open.snapshot.name },
          })
        }
      />
    );
  }
  if (!TEMPLATES.includes(open.kind)) {
    return null;
  }
  return (
    <SnapshotTemplateDialog
      id={id}
      name={name}
      snapshot={open.snapshot.name}
      mode={open.kind}
      busy={busy}
      onClose={onClose}
      onSubmit={(mode, body) =>
        onSend({
          call: () => (mode === 'publish' ? publishTemplate : exportTemplate)(status, id, body),
          doneKey: DONE[mode],
          values: { snapshotName: open.snapshot.name },
        })
      }
    />
  );
};

FormDialogs.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  open: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    snapshot: PropTypes.object,
  }).isRequired,
  utm: PropTypes.bool.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
};

/**
 * The dialogs of a machine's snapshots, each opened by `open`, the kind
 * and the snapshot it is for: the take, the edit and the template made
 * of a snapshot as form dialogs; the restore, the restore that starts
 * the machine after it and the delete behind the typed confirmation,
 * each with hyperweaver-ui's own title, sentence and button and the word
 * of its own to type, `restore` or `delete`; and the holds as a list
 * dialog, the snapshots read again as it closes. On a host whose restore
 * is a rollback, `gates.rollback`, the confirmation of a restore says
 * under its sentence that every snapshot taken after the one restored is
 * destroyed. Every write is one request through `tools`, one notice, the
 * held copies read again once and the task dialog opened on the queued
 * task, which draws here and outlives the dialog that queued it; a
 * success closes the dialog and a refusal leaves it open. The start that
 * follows a restore is handed to the hosts feature's provider through
 * `useRestoreStart`, so it is kept when the person leaves the page.
 */
const SnapshotDialogs = ({ id, name, open, gates, running, tools, onClose, onHoldsClosed }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const server = useHostRow(id);
  const follow = useRestoreStart();
  const confirming = CONFIRMED.includes(open.kind);

  const send = async request => {
    const result = await tools.send({ id, name, watch: true, ...request });
    if (!result.error) {
      onClose();
    }
    return result;
  };

  const confirm = async () => {
    const { kind, snapshot } = open;
    const call = kind === 'delete' ? deleteSnapshot : restoreSnapshot;
    const { answer, error } = await send({
      call: () => call(status, id, name, snapshot.name),
      doneKey: DONE[kind],
      failKey: 'machine.machineSnapshots.confirmActionFailed',
      values: { snapshot: snapshot.name, action: t(CONFIRM_WORDS[kind]) },
    });
    if (kind === 'restore-start' && !error) {
      follow({ id, name, snapshot: snapshot.name, server, answer });
    }
  };

  const closeHolds = () => {
    onClose();
    onHoldsClosed();
  };

  return (
    <>
      <FormDialogs
        id={id}
        name={name}
        open={open}
        utm={gates.utm}
        running={running}
        busy={tools.busy}
        onClose={onClose}
        onSend={send}
      />
      {open.kind === 'holds' ? (
        <SnapshotHoldsDialog id={id} snapshot={open.snapshot} onClose={closeHolds} />
      ) : null}
      <ConfirmModal
        show={confirming}
        handleClose={onClose}
        handleConfirm={confirm}
        title={confirming ? t(CONFIRM_TITLES[open.kind]) : ''}
        message={
          confirming ? (
            <ConfirmMessage
              kind={open.kind}
              snapshot={open.snapshot}
              name={name}
              rollback={gates.rollback}
            />
          ) : (
            ''
          )
        }
        keyword={confirming ? t(CONFIRM_WORDS[open.kind]).toLowerCase() : ''}
        confirmText={confirming ? t(CONFIRM_ACTIONS[open.kind]) : ''}
      />
      {tools.task ? (
        <TaskDialog
          status={status}
          id={tools.task.id}
          task={tools.task.row}
          onHide={tools.closeTask}
        />
      ) : null}
    </>
  );
};

SnapshotDialogs.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  open: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    snapshot: PropTypes.object,
  }).isRequired,
  gates: PropTypes.shape({
    utm: PropTypes.bool.isRequired,
    rollback: PropTypes.bool.isRequired,
  }).isRequired,
  running: PropTypes.bool.isRequired,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
    task: PropTypes.object,
    closeTask: PropTypes.func.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onHoldsClosed: PropTypes.func.isRequired,
};

export default SnapshotDialogs;
