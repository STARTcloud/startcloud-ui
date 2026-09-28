import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { sortItems } from '../../../utils/sort';
import { useFocus } from '../hooks/useFocus';
import { useTaskPrefs, useTasks } from '../hooks/useTasks';
import {
  TASK_COLUMNS,
  formatTaskDate,
  priorityKey,
  taskOperationLabel,
  taskRowClass,
  transferProgressLine,
} from '../utils/tasks';

import TaskDialog, { TaskProgress } from './TaskDialog';

const PREFS_KEY = 'table_prefs_tasks';

const HOST_COLUMN = {
  key: 'host',
  kind: 'name',
  labelKey: 'footer.tasks.columnHost',
  value: task => task.host || '',
};

const NO_PROGRESS = ['completed', 'prepared', 'pending'];

const ERROR_LENGTH = 40;

const PRIORITY_WORDS = {
  critical: { labelKey: 'footer.tasks.priorityCritical', tone: 'text-danger' },
  high: { labelKey: 'footer.tasks.priorityHigh', tone: 'text-warning' },
  medium: { labelKey: 'footer.tasks.priorityMedium', tone: '' },
  service: { labelKey: 'footer.tasks.priorityService', tone: '' },
  low: { labelKey: 'footer.tasks.priorityLow', tone: 'text-body-secondary' },
  background: { labelKey: 'footer.tasks.priorityBg', tone: 'text-body-secondary' },
};

const truncated = text => {
  if (!text) {
    return '-';
  }
  return text.length > ERROR_LENGTH ? `${text.substring(0, ERROR_LENGTH)}...` : text;
};

const StatusCell = ({ status }) =>
  status === 'running' ? (
    <span>
      <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
      {status}
    </span>
  ) : (
    status
  );

StatusCell.propTypes = {
  status: PropTypes.string.isRequired,
};

const ProgressCell = ({ task }) => {
  const percent = task.progress_percent;
  const known = percent !== null && percent !== undefined;
  if (NO_PROGRESS.includes(task.status)) {
    return '-';
  }
  if (task.status !== 'running') {
    return known ? `${percent}%` : '-';
  }
  const transfer = transferProgressLine(task);
  if (!known) {
    return transfer || task.status;
  }
  return (
    <div>
      <div className="d-flex align-items-center gap-2">
        <TaskProgress percent={percent} className="flex-grow-1" />
        <span className="small">{percent}%</span>
      </div>
      {transfer ? <span className="small text-body-secondary">{transfer}</span> : null}
    </div>
  );
};

ProgressCell.propTypes = {
  task: PropTypes.object.isRequired,
};

const PriorityWord = ({ priority }) => {
  const { t } = useTranslation();
  const { labelKey, tone } = PRIORITY_WORDS[priorityKey(priority)];
  return <span className={tone || undefined}>{t(labelKey)}</span>;
};

PriorityWord.propTypes = {
  priority: PropTypes.number,
};

const CELLS = {
  host: task => task.host || '-',
  id: task => task.id,
  operation: (task, t) => taskOperationLabel(task.operation, t),
  machine_name: task => task.machine_name,
  status: task => <StatusCell status={task.status} />,
  progress: task => <ProgressCell task={task} />,
  priority: task => <PriorityWord priority={task.priority} />,
  created_by: task => task.created_by || '-',
  created_at: task => formatTaskDate(task.created_at),
  started_at: task => formatTaskDate(task.started_at),
  completed_at: task => formatTaskDate(task.completed_at),
  error_message: task => truncated(task.error_message),
};

const OpenTask = ({ task, onOpen }) => {
  const { t } = useTranslation();
  const title = `${t('footer.task.taskTitle')}: ${taskOperationLabel(task.operation, t)}`;
  return (
    <button
      type="button"
      className="task-open"
      title={title}
      aria-label={title}
      onClick={() => onOpen(task)}
    />
  );
};

OpenTask.propTypes = {
  task: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const LeadCell = ({ columnKey, task, onOpen = null }) => {
  const { t } = useTranslation();
  return (
    <>
      {CELLS[columnKey](task, t)}
      {onOpen ? <OpenTask task={task} onOpen={onOpen} /> : null}
    </>
  );
};

LeadCell.propTypes = {
  columnKey: PropTypes.string.isRequired,
  task: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
};

const plainCell = column => (task, ctx) => CELLS[column.key](task, ctx.t);

/**
 * The columns the tasks table hands the one `SubTable`: the Host column
 * first while every host is in focus, then the eleven, each drawing its
 * cell; the first column shown never folds and carries the button that
 * opens the task's dialog over the whole row, so a row opens whatever
 * the columns folded.
 *
 * @param {Object} options - Whether `every` host is in focus, the `hidden` column keys and `onOpen`, null where a row opens nothing
 * @returns {Array<Object>} The columns
 */
const columnsFor = ({ every, hidden, onOpen }) => {
  const all = every ? [HOST_COLUMN, ...TASK_COLUMNS] : TASK_COLUMNS;
  const lead = all.find(column => !hidden.has(column.key));
  return all.map(column =>
    column === lead
      ? {
          ...column,
          priority: 1,
          render: task => <LeadCell columnKey={column.key} task={task} onOpen={onOpen} />,
        }
      : { ...column, render: plainCell(column) }
  );
};

const hiddenOf = shown =>
  new Set(TASK_COLUMNS.map(column => column.key).filter(key => !shown.includes(key)));

const rowClassOf = task => taskRowClass(task.status) || undefined;

const rowKeyOf = task => task.rowKey;

/**
 * The tasks view of the footer's pane: the one `SubTable` over the tasks
 * of the host in focus above the priority floor, the columns the Columns
 * picker shows of the eleven, every header sorting and carrying the
 * resize handle, the sort and the widths kept under `table_prefs_tasks`,
 * and the columns the pane has no room for folded by their priority
 * under a fold cell, so the table never scrolls sideways; a failed row
 * tinted danger and a running one warning, the priority a word from its
 * number and the progress of a running task the shell's progress element
 * with its transfer line; a row opens the task dialog. With every host
 * in focus, the server role with no host in the route, the Host column
 * draws first and a row opens nothing. While nothing is sorted the rows
 * keep the order they were read in, the newest first. The rows are read
 * through `useTasks` while the view shows, `active`, the columns and the
 * floor through `useTaskPrefs`.
 */
const TasksPane = ({ active }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const focus = useFocus();
  const { columns: shown, floor } = useTaskPrefs();
  const { tasks, loaded, failed, messageKey } = useTasks({
    status,
    focus,
    open: active,
    minPriority: floor,
  });
  const [selected, setSelected] = useState(null);
  const every = focus.kind === 'all';
  const hidden = useMemo(() => hiddenOf(shown), [shown]);
  const columns = useMemo(
    () => columnsFor({ every, hidden, onOpen: every ? null : setSelected }),
    [every, hidden]
  );
  const prefs = useTablePrefs(PREFS_KEY, columns);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  const rows = useMemo(
    () => sortItems(tasks, prefs.sort, columns, ctx),
    [tasks, prefs.sort, columns, ctx]
  );

  return (
    <div className="footer-tasks">
      {failed ? (
        <p className="small text-danger m-2" role="alert">
          {t(messageKey)}
        </p>
      ) : null}
      {loaded ? (
        <SubTable
          columns={columns}
          rows={rows}
          rowKey={rowKeyOf}
          rowClass={rowClassOf}
          sort={prefs.sort}
          onSort={prefs.setSort}
          hiddenColumns={hidden}
          widths={prefs.widths}
          onResize={prefs.setColumnWidth}
          ctx={ctx}
          emptyText={t('pages.empty')}
        />
      ) : (
        <p className="small m-2">{t('footer.tasks.loading')}</p>
      )}
      {selected ? (
        <TaskDialog
          status={status}
          id={focus.id}
          task={selected}
          onHide={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
};

TasksPane.propTypes = {
  active: PropTypes.bool.isRequired,
};

export default TasksPane;
