import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBroom, FaMagnifyingGlassChart, FaTrashArrowUp } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { runDatabaseMaintenance } from '../api/database';
import { useManageSend } from '../hooks/useHostManage';
import { MAINTENANCE_ACTIONS, formatDatabaseBytes, reclaimedText } from '../utils/database';

import {
  DATABASE_COLUMNS,
  DatabaseRowActions,
  DatabaseTables,
  TableBrowserModal,
} from './DatabasePanel';
import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';

const ACTIONS = {
  vacuum: { Icon: FaBroom, tone: 'primary' },
  analyze: { Icon: FaMagnifyingGlassChart, tone: 'primary' },
  cleanup: { Icon: FaTrashArrowUp, tone: 'warning' },
};

/**
 * The agent's databases, hyperweaver-ui's `DatabasePanel` as the body of
 * the Manage page's Database section: Vacuum, Analyze and Cleanup, each
 * one request and one notice, the vacuum's naming the space reclaimed;
 * the totals of the statistics; the one table over the databases the
 * page's binding left, a row's Explore opening its tables under the
 * table with Browse into the row browser; the statistics read again on
 * a success. Nothing polls.
 */
const DatabaseSection = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [expanded, setExpanded] = useState(null);
  const [browser, setBrowser] = useState(null);
  const stats = reading.data;

  const maintain = async action => {
    const { answer, error } = await send({
      call: () => runDatabaseMaintenance(status, id, action),
      doneKey: 'hosts.manage.database.done',
      values: { action },
      failKey: 'hosts.manage.database.failed',
    });
    if (!error) {
      if (action === 'vacuum' && Array.isArray(answer?.databases)) {
        notify(
          'info',
          t('host.databasePanel.vacuumComplete', {
            reclaimed: formatDatabaseBytes(answer.total_reclaimed),
            perDb: reclaimedText(answer.databases),
          })
        );
      }
      reading.refresh();
    }
  };

  return (
    <div data-panel="database">
      <div className="d-flex flex-wrap gap-2 mb-3">
        {MAINTENANCE_ACTIONS.map(action => {
          const { Icon, tone } = ACTIONS[action];
          return (
            <button
              key={action}
              type="button"
              className={`btn btn-sm btn-outline-${tone}`}
              data-action={`database-${action}`}
              title={t(`host.databasePanel.${action}Title`)}
              onClick={() => maintain(action)}
              disabled={busy || !reading.loaded}
            >
              <Icon className="me-1" aria-hidden="true" />
              {t(`host.databasePanel.${action}`)}
            </button>
          );
        })}
      </div>
      {stats ? (
        <p className="form-text text-muted mt-0" data-note="database-totals">
          {typeof stats.total_size === 'number' ? (
            <span className="me-3">
              {t('host.databasePanel.totalSize')}{' '}
              <strong>{formatDatabaseBytes(stats.total_size)}</strong>
            </span>
          ) : null}
          {typeof stats.total_tables === 'number' ? (
            <span className="me-3">
              {t('host.databasePanel.tables')} <strong>{stats.total_tables}</strong>
            </span>
          ) : null}
          {typeof stats.total_rows === 'number' ? (
            <span>
              {t('host.databasePanel.rows')}{' '}
              <strong>{stats.total_rows.toLocaleString(ctx.language)}</strong>
            </span>
          ) : null}
        </p>
      ) : null}
      <ManageTable
        name="databases"
        columns={DATABASE_COLUMNS}
        table={table}
        rowKey={row => row.name}
        RowActions={DatabaseRowActions}
        actionsProps={{
          expanded,
          onToggle: name => setExpanded(current => (current === name ? null : name)),
        }}
        ctx={ctx}
        emptyKey="host.databasePanel.noStats"
        reading={reading}
        filtering={filtering}
      />
      {expanded ? (
        <DatabaseTables
          id={id}
          database={expanded}
          ctx={ctx}
          onBrowse={(database, name) => setBrowser({ database, table: name })}
        />
      ) : null}
      {browser ? (
        <TableBrowserModal
          id={id}
          database={browser.database}
          table={browser.table}
          onClose={() => setBrowser(null)}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

DatabaseSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default DatabaseSection;
