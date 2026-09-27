import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaFilter, FaRotate, FaTableColumns } from 'react-icons/fa6';

import { requestTasksRefresh, useTaskPrefs } from '../hooks/useTasks';
import { DEFAULT_FLOOR, PRIORITY_OPTIONS, TASK_COLUMNS } from '../utils/tasks';

const REFRESH = 'refresh';
const PRIORITY = 'priority';
const COLUMNS = 'columns';

const toggled = (name, next) => current => {
  if (next) {
    return name;
  }
  return current === name ? '' : current;
};

const optionOf = floor =>
  PRIORITY_OPTIONS.find(option => option.value === floor) ||
  PRIORITY_OPTIONS.find(option => option.value === DEFAULT_FLOOR);

/**
 * The tasks view's own tools in the footer's right cluster, drawn while
 * the tasks pane shows: Refresh, one press reading the tasks again, the
 * read a person asks for; the priority filter, a drop-up of the five
 * floors whose title names the one in force, and the Columns picker, a
 * drop-up of the eleven columns that stays open while columns are
 * toggled and never lets the last one go; both write through
 * `useTaskPrefs`, so the table follows at once and reads again with the
 * new floor.
 */
const TasksTools = () => {
  const { t } = useTranslation();
  const { columns, floor, setFloor, toggleColumn } = useTaskPrefs();
  const [shown, setShown] = useState('');
  const priorityTitle = `${t('footer.pane.priorityFilter')}: ${t(optionOf(floor).labelKey)}`;
  const columnsTitle = t('footer.pane.toggleColumns');
  const refreshTitle = t('footer.pane.refresh');

  return (
    <>
      <button
        type="button"
        className="footer-tool"
        title={refreshTitle}
        aria-label={refreshTitle}
        data-tool={REFRESH}
        onClick={requestTasksRefresh}
      >
        <FaRotate />
      </button>
      <Dropdown
        drop="up"
        align="end"
        show={shown === PRIORITY}
        onToggle={next => setShown(toggled(PRIORITY, next))}
      >
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix="footer-tool"
          className={shown === PRIORITY ? 'on' : ''}
          title={priorityTitle}
          aria-label={priorityTitle}
          data-tool={PRIORITY}
        >
          <FaFilter />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {PRIORITY_OPTIONS.map(option => (
            <Dropdown.Item
              as="button"
              type="button"
              key={option.value}
              active={floor === option.value}
              data-value={option.value}
              onClick={() => setFloor(option.value)}
            >
              {t(option.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
      <Dropdown
        drop="up"
        align="end"
        autoClose="outside"
        show={shown === COLUMNS}
        onToggle={next => setShown(toggled(COLUMNS, next))}
      >
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix="footer-tool"
          className={shown === COLUMNS ? 'on' : ''}
          title={columnsTitle}
          aria-label={columnsTitle}
          data-tool={COLUMNS}
        >
          <FaTableColumns />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {TASK_COLUMNS.map(column => (
            <label
              key={column.key}
              className="dropdown-item d-flex align-items-center gap-2 mb-0 cursor-pointer"
            >
              <input
                type="checkbox"
                className="form-check-input m-0"
                checked={columns.includes(column.key)}
                onChange={() => toggleColumn(column.key)}
              />
              {t(column.labelKey)}
            </label>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
};

export default TasksTools;
