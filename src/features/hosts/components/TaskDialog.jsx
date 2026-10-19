import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBan, FaDownload, FaListCheck, FaUpload } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import CopyButton from '../../../components/common/CopyButton';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useCssVar } from '../../../hooks/useCssVar';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { cancelTask, getTask, getTaskOutput, listTasks } from '../api/tasks';
import { requestTasksRefresh } from '../hooks/useTasks';
import { useTaskStream } from '../hooks/useTaskStream';
import { parseAnsi, stripAnsi } from '../utils/ansi';
import { agentIdOf, withoutAgentId } from '../utils/hosts';
import { taskMachineOf } from '../utils/machines';
import {
  ACTIVE_TASK_STATUSES,
  formatPercent,
  formatTaskDate,
  priorityKey,
  taskOperationLabel,
  taskProgressInfo,
  transferProgressLine,
} from '../utils/tasks';

import { DialogTable } from './ManageTable';

const SUBTASK_LIMIT = 100;

const TASK_ROW = [{ key: 'task' }];

const PRIORITY_BADGES = {
  critical: { labelKey: 'footer.task.priorityCritical', tone: 'text-bg-danger' },
  high: { labelKey: 'footer.task.priorityHigh', tone: 'text-bg-warning' },
  medium: { labelKey: 'footer.task.priorityMedium', tone: 'text-bg-info' },
  service: { labelKey: 'footer.task.priorityService', tone: 'text-bg-primary' },
  low: { labelKey: 'footer.task.priorityLow', tone: 'text-bg-light' },
  background: { labelKey: 'footer.task.priorityBackground', tone: 'text-bg-light' },
};

const STATUS_TONES = {
  completed: 'text-bg-success',
  completed_with_errors: 'text-bg-warning',
  failed: 'text-bg-danger',
  running: 'text-bg-warning',
  pending: 'text-bg-light',
  cancelled: 'text-bg-dark',
};

const hasPercent = value => value !== null && value !== undefined;

const logFailure = error => log.api.error('Error reading task', { error: error.message });

const entriesOf = data =>
  (Array.isArray(data?.output) ? data.output : []).map((entry, position) => ({
    ...entry,
    uid: `read-${position}`,
  }));

const withSubtask = (subtasks, row) =>
  subtasks.some(subtask => subtask.id === row.id)
    ? subtasks.map(subtask => (subtask.id === row.id ? { ...subtask, ...row } : subtask))
    : [...subtasks, row];

const metadataText = metadata => {
  if (!metadata) {
    return '';
  }
  return typeof metadata === 'string' ? metadata : JSON.stringify(metadata, null, 2);
};

/**
 * A task's progress as the shell's own progress element, the bar's width
 * set through a custom property.
 */
export const TaskProgress = ({ percent, className = '' }) => {
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${percent}%`);
  return (
    <div className={className ? `progress task-progress ${className}` : 'progress task-progress'}>
      <div
        ref={bar}
        className="progress-bar progress-fill bg-primary"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  );
};

TaskProgress.propTypes = {
  percent: PropTypes.number.isRequired,
  className: PropTypes.string,
};

const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_TONES[status] || 'text-bg-light'}`}>{status}</span>
);

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

const PriorityBadge = ({ priority }) => {
  const { t } = useTranslation();
  const { labelKey, tone } = PRIORITY_BADGES[priorityKey(priority)];
  return <span className={`badge ${tone}`}>{t(labelKey)}</span>;
};

PriorityBadge.propTypes = {
  priority: PropTypes.number,
};

const fact = (key, labelKey, text, value = text, kind = 'text') => ({
  key,
  labelKey,
  kind,
  text: String(text ?? ''),
  value,
});

const optionalFacts = row =>
  [
    ['error', 'footer.task.labelError', row.error_message, 'text-danger'],
    ['dependsOn', 'footer.task.labelDependsOn', row.depends_on, ''],
    ['parent', 'footer.task.labelParentTask', row.parent_task_id, ''],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value, tone]) =>
      fact(key, labelKey, value, <span className={tone || undefined}>{value}</span>)
    );

const GuestStep = ({ info }) => {
  const { t } = useTranslation();
  const guest = hasPercent(info.ansible_percent)
    ? ` — ${info.ansible_percent}% ${t('footer.task.inGuest')}`
    : '';
  return (
    <span className="d-block small">
      <FaListCheck className="me-2" />
      {info.message}
      {guest ? <span className="text-body-secondary">{guest}</span> : null}
    </span>
  );
};

GuestStep.propTypes = {
  info: PropTypes.shape({
    message: PropTypes.string,
    ansible_percent: PropTypes.number,
  }).isRequired,
};

const hasProgress = row => Boolean(row.progress_percent) && row.progress_percent > 0;

const ProgressDetail = ({ info, transfer }) => {
  const TransferIcon = info?.status === 'uploading' ? FaUpload : FaDownload;
  return (
    <>
      {transfer ? (
        <span className="d-block small">
          <TransferIcon className="me-2" />
          {transfer}
        </span>
      ) : null}
      {info?.message ? <GuestStep info={info} /> : null}
      {info && !info.message && !transfer ? (
        <pre className="small mb-0">{JSON.stringify(info, null, 2)}</pre>
      ) : null}
    </>
  );
};

ProgressDetail.propTypes = {
  info: PropTypes.object,
  transfer: PropTypes.string.isRequired,
};

const progressFacts = row => {
  if (!hasProgress(row)) {
    return [];
  }
  const info = taskProgressInfo(row);
  const transfer = transferProgressLine(row);
  const text = transfer || info?.message || (info ? JSON.stringify(info) : '');
  if (!text) {
    return [];
  }
  const detail = <ProgressDetail info={info} transfer={transfer} />;
  return [fact('progress', 'footer.task.progress', text, detail)];
};

const factsOf = (row, t) => [
  fact('id', 'footer.task.labelId', row.id, row.id, 'name'),
  fact('operation', 'footer.task.labelOperation', taskOperationLabel(row.operation, t)),
  fact('target', 'footer.task.labelTarget', taskMachineOf(row)),
  fact(
    'status',
    'footer.task.labelStatus',
    row.status,
    <StatusBadge status={row.status} />,
    'badge'
  ),
  fact(
    'priority',
    'footer.task.labelPriority',
    priorityKey(row.priority),
    <PriorityBadge priority={row.priority} />,
    'badge'
  ),
  fact('createdBy', 'footer.task.labelCreatedBy', row.created_by || '-'),
  fact('created', 'footer.task.labelCreated', formatTaskDate(row.created_at)),
  fact('started', 'footer.task.labelStarted', formatTaskDate(row.started_at)),
  fact('completed', 'footer.task.labelCompleted', formatTaskDate(row.completed_at)),
  ...progressFacts(row),
  ...optionalFacts(row),
];

/**
 * The columns of the task's details table, one a fact of the task, the
 * fact's label the header and its value the one cell of the one row, so
 * the details read across and fold under the row where the dialog is
 * narrow.
 *
 * @param {Object} row - The task
 * @param {Function} t - The translator
 * @returns {Array<Object>} The columns
 */
const factColumns = (row, t) =>
  factsOf(row, t).map(entry => ({
    key: entry.key,
    kind: entry.kind,
    labelKey: entry.labelKey,
    prose: entry.key === 'progress' || entry.key === 'error',
    value: () => entry.text,
    render: () => entry.value,
  }));

const HeaderProgress = ({ row }) => {
  if (!hasProgress(row)) {
    return null;
  }
  const percent = row.progress_percent;
  return (
    <span className="d-flex align-items-center gap-2 flex-grow-1" data-panel="task-progress">
      <TaskProgress percent={percent} className="flex-grow-1" />
      <span className="small">{formatPercent(percent)}</span>
    </span>
  );
};

HeaderProgress.propTypes = {
  row: PropTypes.object.isRequired,
};

const OutputLine = ({ entry }) => {
  const runs = parseAnsi(entry.data).map((run, position) => ({ ...run, uid: `run-${position}` }));
  return (
    <div
      className={entry.stream === 'stderr' ? 'task-output-line text-danger' : 'task-output-line'}
    >
      {runs.length > 0
        ? runs.map(run => (
            <span key={run.uid} className={run.className || undefined}>
              {run.text}
            </span>
          ))
        : ' '}
    </div>
  );
};

OutputLine.propTypes = {
  entry: PropTypes.shape({
    stream: PropTypes.string,
    data: PropTypes.string,
  }).isRequired,
};

const OutputCard = ({ output, active }) => {
  const { t } = useTranslation();
  const box = useRef(null);

  useEffect(() => {
    const element = box.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [output]);

  return (
    <div className="card mb-3 task-output-card">
      <div className="card-body">
        <div className="d-flex align-items-center mb-2">
          <h6 className="fw-bold mb-0">{t('footer.task.output')}</h6>
          {active ? (
            <span className="spinner-border spinner-border-sm ms-2" aria-hidden="true" />
          ) : null}
          {output.length > 0 ? (
            <CopyButton
              text={output.map(entry => stripAnsi(entry.data)).join('\n')}
              label={t('footer.task.copy')}
              className="btn btn-sm btn-outline-secondary ms-auto"
            />
          ) : null}
        </div>
        <div ref={box} className="task-output">
          {output.length === 0 ? (
            <span className="task-output-empty">{t('footer.task.noOutput')}</span>
          ) : null}
          {output.map(entry => (
            <OutputLine key={entry.uid} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
};

OutputCard.propTypes = {
  output: PropTypes.arrayOf(PropTypes.object).isRequired,
  active: PropTypes.bool.isRequired,
};

const SubtasksCard = ({ subtasks, onSelect }) => {
  const { t } = useTranslation();
  if (subtasks.length === 0) {
    return null;
  }
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="fw-bold">{t('footer.task.subtasks', { count: subtasks.length })}</h6>
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th>{t('footer.task.columnOperation')}</th>
              <th>{t('footer.task.columnTarget')}</th>
              <th>{t('footer.task.columnStatus')}</th>
              <th>{t('footer.task.columnProgress')}</th>
            </tr>
          </thead>
          <tbody>
            {subtasks.map(subtask => (
              <tr key={subtask.id}>
                <td>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-start"
                    onClick={() => onSelect(subtask)}
                  >
                    {taskOperationLabel(subtask.operation, t)}
                  </button>
                </td>
                <td>{taskMachineOf(subtask)}</td>
                <td>
                  <StatusBadge status={subtask.status} />
                </td>
                <td>
                  {hasPercent(subtask.progress_percent)
                    ? formatPercent(subtask.progress_percent)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

SubtasksCard.propTypes = {
  subtasks: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelect: PropTypes.func.isRequired,
};

/**
 * What the task dialog reads over the agent's routes: the task's row,
 * its output and, for a task that is no subtask itself, its subtasks,
 * each read once as the dialog opens; `readStatus` reads the row and the
 * subtasks again and `readAll` all three, for the stream's `status`
 * frame, the person's own action and Refresh. Between reads the `tasks`
 * topic's `task-updated` event keeps the row and the subtasks: a pushed
 * row of this host that is the task replaces its members, one whose
 * `parent_task_id` names it joins the subtasks. Nothing reads on a timer.
 *
 * @param {Object} options - The status, the host's id and the task the dialog opened on
 * @returns {{ row: Object|null, output: Array<Object>, subtasks: Array<Object>, readStatus: Function, readAll: Function }} The reads
 */
const useTaskDetail = ({ status, id, task }) => {
  const [detail, setDetail] = useState({ row: null, output: [], subtasks: [] });
  const taskId = task.id;
  const parent = !task.parent_task_id;

  const readStatus = useCallback(() => {
    getTask(status, id, taskId)
      .then(row => setDetail(previous => ({ ...previous, row })))
      .catch(logFailure);
    if (parent) {
      listTasks(status, id, { parentTaskId: taskId, limit: SUBTASK_LIMIT })
        .then(subtasks => setDetail(previous => ({ ...previous, subtasks })))
        .catch(logFailure);
    }
  }, [status, id, taskId, parent]);

  const readAll = useCallback(() => {
    readStatus();
    getTaskOutput(status, id, taskId)
      .then(data => setDetail(previous => ({ ...previous, output: entriesOf(data) })))
      .catch(logFailure);
  }, [status, id, taskId, readStatus]);

  useEffect(() => {
    readAll();
  }, [readAll]);

  useEventStream('task-updated', data => {
    if (agentIdOf(data) !== String(id)) {
      return;
    }
    const row = withoutAgentId(data);
    if (row.id === taskId) {
      setDetail(previous => ({ ...previous, row: { ...previous.row, ...row } }));
    } else if (parent && row.parent_task_id === taskId) {
      setDetail(previous => ({ ...previous, subtasks: withSubtask(previous.subtasks, row) }));
    }
  });

  return { ...detail, readStatus, readAll };
};

/**
 * The task dialog a row of the tasks table opens, a list dialog of the
 * pages contract. Its header holds the title, the task's progress bar
 * with its percent, and Cancel task as a glyph while the task is pending
 * or running, behind the typed confirmation, a failed cancel raised as a
 * notice. Its body holds the task's details as one row of the one table,
 * a column a fact of the task, the transfer line and the guest's step
 * among them, the columns folding under the row where the dialog is
 * narrow and spreading as it widens;
 * its output in terminal colors with Copy, the output taking every line
 * of the dialog's height the details, the metadata and the subtasks
 * leave, never under twelve lines, so in the zoomed dialog the folds sit
 * at the foot and the body scrolls only past that; its metadata as a fold under
 * the output, folded until opened; and its subtasks, each opening a
 * dialog of its own. The row, the output and the subtasks are read once
 * on open, then the output follows the `/tasks/{id}/stream` WebSocket,
 * an `output` frame appended and a `status` frame reading the row and
 * the subtasks once. A stream that closed while the task is still active
 * says so beside Refresh, which reads again and opens a new stream;
 * nothing polls.
 */
const TaskDialog = ({ status, id, task, onHide }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const detail = useTaskDetail({ status, id, task });
  const stream = useTaskStream({ status, id, task, onStatus: detail.readStatus });
  const [child, setChild] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [metadataFolded, setMetadataFolded] = useState(true);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  const row = detail.row || task;
  const output = stream.frames || detail.output;
  const active = ACTIVE_TASK_STATUSES.includes(row.status);
  const metadata = metadataText(row.metadata);
  const subtaskCount = detail.subtasks.length;
  const cancelLabel = t(cancelling ? 'footer.task.cancelling' : 'footer.task.cancelTask');

  const refresh = () => {
    detail.readAll();
    stream.reopen();
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelTask(status, id, row.id);
      detail.readAll();
      requestTasksRefresh();
    } catch (error) {
      notify('danger', t('footer.task.cancelFailed', { message: error.message }));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Modal show onHide={onHide} dialogClassName="list-modal task-modal" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {t('footer.task.taskTitle')}: {taskOperationLabel(row.operation, t)}
          </Modal.Title>
          <span className="d-flex align-items-center gap-2 flex-grow-1 ms-3 me-2 task-dialog-tools">
            <HeaderProgress row={row} />
            {active ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger btn-glyph"
                title={cancelLabel}
                aria-label={cancelLabel}
                data-tool="cancel-task"
                onClick={() => setConfirming(true)}
                disabled={cancelling}
              >
                <FaBan aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </Modal.Header>
        <Modal.Body>
          {active && stream.state === 'closed' ? (
            <div className="alert alert-warning py-2 d-flex align-items-center gap-2" role="status">
              <span className="flex-grow-1">{t('footer.task.streamClosed')}</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refresh}>
                {t('footer.pane.refresh')}
              </button>
            </div>
          ) : null}
          <h6 className="fw-bold">{t('footer.task.details')}</h6>
          <DialogTable
            name="task-details"
            columns={factColumns(row, t)}
            rows={TASK_ROW}
            rowKey={entry => entry.key}
            ctx={ctx}
            emptyText={t('pages.empty')}
          />
          <OutputCard output={output} active={active} />
          {metadata ? (
            <div data-panel="task-metadata" data-folded={metadataFolded}>
              <SectionCard
                title={t('footer.task.metadata')}
                folded={metadataFolded}
                onFold={() => setMetadataFolded(current => !current)}
              >
                <pre className="small task-metadata mb-0">{metadata}</pre>
              </SectionCard>
            </div>
          ) : null}
          <SubtasksCard subtasks={detail.subtasks} onSelect={setChild} />
        </Modal.Body>
      </Modal>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={cancel}
        title={t('footer.task.confirmCancelTitle')}
        message={
          subtaskCount > 0
            ? t('footer.task.confirmCancelWithSubtasks', {
                status: row.status,
                count: subtaskCount,
              })
            : t('footer.task.confirmCancel', { status: row.status })
        }
        variant="delete"
      />
      {child ? (
        <TaskDialog status={status} id={id} task={child} onHide={() => setChild(null)} />
      ) : null}
    </>
  );
};

TaskDialog.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  task: PropTypes.object.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default TaskDialog;
