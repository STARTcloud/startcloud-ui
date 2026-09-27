import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
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

const HOST_COLUMN = { key: 'host', labelKey: 'footer.tasks.columnHost' };

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

const TaskRow = ({ task, columns, onOpen = null }) => {
  const { t } = useTranslation();
  const [first, ...rest] = columns;
  const title = `${t('footer.task.taskTitle')}: ${taskOperationLabel(task.operation, t)}`;
  return (
    <tr className={taskRowClass(task.status) || undefined}>
      <td>
        {CELLS[first.key](task, t)}
        {onOpen ? (
          <button
            type="button"
            className="task-open"
            title={title}
            aria-label={title}
            onClick={() => onOpen(task)}
          />
        ) : null}
      </td>
      {rest.map(column => (
        <td key={column.key}>{CELLS[column.key](task, t)}</td>
      ))}
    </tr>
  );
};

const columnShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
});

TaskRow.propTypes = {
  task: PropTypes.object.isRequired,
  columns: PropTypes.arrayOf(columnShape).isRequired,
  onOpen: PropTypes.func,
};

/**
 * The tasks view of the footer's pane: one table of the tasks of the
 * host in focus above the priority floor, the columns the Columns picker
 * shows of the eleven, a failed row tinted danger and a running one
 * warning, the priority a word from its number and the progress of a
 * running task the shell's progress element with its transfer line; a
 * row opens the task dialog. With every host in focus, the server role
 * with no host in the route, the Host column draws first and a row opens
 * nothing. The rows are read through `useTasks` while the view shows,
 * `active`, the columns and the floor through `useTaskPrefs`.
 */
const TasksPane = ({ active }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const focus = useFocus();
  const { columns, floor } = useTaskPrefs();
  const { tasks, loaded, failed, messageKey } = useTasks({
    status,
    focus,
    open: active,
    minPriority: floor,
  });
  const [selected, setSelected] = useState(null);
  const every = focus.kind === 'all';
  const shown = [
    ...(every ? [HOST_COLUMN] : []),
    ...TASK_COLUMNS.filter(column => columns.includes(column.key)),
  ];

  return (
    <div className="footer-tasks">
      {failed ? (
        <p className="small text-danger m-2" role="alert">
          {t(messageKey)}
        </p>
      ) : null}
      {loaded ? (
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              {shown.map(column => (
                <th key={column.key} data-column={column.key}>
                  {t(column.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <TaskRow
                key={task.rowKey}
                task={task}
                columns={shown}
                onOpen={every ? null : setSelected}
              />
            ))}
          </tbody>
        </table>
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
