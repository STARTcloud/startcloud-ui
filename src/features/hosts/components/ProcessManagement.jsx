import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleStop } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { batchKill, fetchProcess, killProcess, signalProcess } from '../api/manage';
import { useManageSend } from '../hooks/useHostManage';
import { ALL_SIGNALS, BATCH_SIGNALS, signalsFor } from '../utils/manage';

import ManageTable from './ManageTable';
import { BatchKillModal, KillProcessModal, SendSignalModal } from './ProcessActionModals';
import ProcessDetailsModal from './ProcessDetailsModal';
import { PROCESS_COLUMNS, ProcessRowActions } from './ProcessTable';
import TaskDialog from './TaskDialog';

const rowKey = row => String(row.pid);

/**
 * Batch kill in the heading of the Manage page's Processes section,
 * hyperweaver-ui's button, which opens the batch kill dialog.
 */
export const BatchKillButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-warning"
      data-action="batch-kill"
      onClick={onClick}
    >
      <FaCircleStop className="me-1" aria-hidden="true" />
      {t('host.processManagement.batchKill')}
    </button>
  );
};

BatchKillButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * The processes of a host, hyperweaver-ui's process management as the
 * body of the Manage page's Processes section: the one table over the
 * rows the page's binding left, its request filters in the navbar's
 * panel, and on each row View details, Send signal and Kill process,
 * each dialog over the form dialog of the pages contract; a kill, a
 * signal and a batch kill each send their request, raise one notice
 * and read the processes again on a success. The signals offered are
 * the ones the host delivers, TERM and KILL alone on a Windows host,
 * and the zones of the batch kill the host's machines. Nothing polls.
 */
const ProcessManagement = ({
  id,
  server,
  ctx,
  table,
  reading,
  filtering,
  zones,
  batch,
  onBatch,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const [opening, setOpening] = useState(false);

  const done = () => {
    setDialog(null);
    reading.refresh();
  };

  const kill = async ({ force }) => {
    const { error } = await send({
      call: () => killProcess(status, id, dialog.process.pid, force),
      doneKey: 'hosts.manage.processes.killed',
      values: { pid: dialog.process.pid },
      failKey: 'hosts.manage.processes.failed',
    });
    if (!error) {
      done();
    }
  };

  const signal = async ({ signal: name }) => {
    const { error } = await send({
      call: () => signalProcess(status, id, dialog.process.pid, name),
      doneKey: 'hosts.manage.processes.signalled',
      values: { pid: dialog.process.pid, signal: name },
      failKey: 'hosts.manage.processes.failed',
    });
    if (!error) {
      done();
    }
  };

  const killMany = async body => {
    const { error } = await send({
      call: () => batchKill(status, id, body),
      doneKey: 'hosts.manage.processes.batchKilled',
      values: { pattern: body.pattern },
      failKey: 'hosts.manage.processes.failed',
    });
    if (!error) {
      onBatch();
      reading.refresh();
    }
  };

  const openDetails = async row => {
    setOpening(true);
    try {
      const details = await fetchProcess(status, id, row.pid);
      setDialog({ kind: 'details', process: { ...row, details } });
    } catch (error) {
      notify(
        'danger',
        t('host.processManagement.errors.loadDetailsError', { message: error.message })
      );
    } finally {
      setOpening(false);
    }
  };

  const onAction = (action, row) => {
    if (action === 'details') {
      openDetails(row);
    } else {
      setDialog({ kind: action, process: row });
    }
  };

  return (
    <>
      <ManageTable
        name="processes"
        columns={PROCESS_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={ProcessRowActions}
        actionsProps={{ busy: busy || opening, onAction }}
        ctx={ctx}
        emptyKey="host.processTable.noProcessesFound"
        reading={reading}
        filtering={filtering}
      />
      {dialog?.kind === 'details' ? (
        <ProcessDetailsModal
          id={id}
          process={dialog.process}
          ctx={ctx}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'kill' ? (
        <KillProcessModal
          process={dialog.process}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={kill}
        />
      ) : null}
      {dialog?.kind === 'signal' ? (
        <SendSignalModal
          process={dialog.process}
          signals={signalsFor(server, ALL_SIGNALS)}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={signal}
        />
      ) : null}
      {batch ? (
        <BatchKillModal
          zones={zones}
          signals={signalsFor(server, BATCH_SIGNALS)}
          busy={busy}
          onClose={onBatch}
          onConfirm={killMany}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

ProcessManagement.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  zones: PropTypes.arrayOf(PropTypes.string).isRequired,
  batch: PropTypes.bool.isRequired,
  onBatch: PropTypes.func.isRequired,
};

export default ProcessManagement;
