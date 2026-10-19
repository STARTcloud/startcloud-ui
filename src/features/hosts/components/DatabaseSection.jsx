import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBroom, FaMagnifyingGlassChart, FaSliders, FaTrashArrowUp } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import SectionHeading from '../../../components/common/SectionHeading';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { runDatabaseMaintenance } from '../api/database';
import { useManageSend } from '../hooks/useHostManage';
import { configNamesOf, configPath } from '../utils/configNodes';
import { MAINTENANCE_ACTIONS, formatDatabaseBytes, reclaimedText } from '../utils/database';
import { isServerRole } from '../utils/hosts';

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

const DB_CONFIG = 'db';

const dbConfigRouteOf = ({ status, server, id }) => {
  if (isServerRole(status)) {
    return configNamesOf(server).includes(DB_CONFIG) ? configPath(id, DB_CONFIG) : null;
  }
  return Array.isArray(status?.config) && status.config.includes(DB_CONFIG)
    ? `/admin/config/${DB_CONFIG}`
    : null;
};

/**
 * The agent's databases, the body of the Database page under its one
 * heading: `title`, the totals of the statistics as the count once they
 * are read, and in the pane Edit settings, the config engine's page of the
 * agent's `db` file, `/hosts/{id}/agent/config/db` on the server role
 * while the host's row lists the file and `/admin/config/db` on an agent
 * role while the status lists it, then Vacuum, Analyze and Cleanup, each
 * one request and one notice, the vacuum's naming the space reclaimed,
 * then `actions`; under it the one table over the databases the page's search
 * leaves, a row's Explore opening its tables in the detail row under that
 * row, with Browse into the row browser; the statistics read again on a
 * success.
 */
const DatabaseSection = ({ id, ctx, table, reading, filtering, title, actions = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const navigate = useNavigate();
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

  const totals = stats ? (
    <span data-note="database-totals">
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
    </span>
  ) : null;

  const settings = dbConfigRouteOf({ status, server: ctx.server, id });

  const pane = (
    <>
      {settings ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="database-settings"
          title={t('host.databasePanel.editSettingsTitle')}
          onClick={() => navigate(settings)}
        >
          <FaSliders className="me-1" aria-hidden="true" />
          {t('host.databasePanel.editSettings')}
        </button>
      ) : null}
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
      {actions}
    </>
  );

  return (
    <div data-panel="database">
      <SectionHeading title={title} count={totals} actions={pane} />
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
        Detail={DatabaseTables}
        detailProps={{
          id,
          ctx,
          onBrowse: (database, name) => setBrowser({ database, table: name }),
        }}
        expandedKeys={new Set(expanded ? [expanded] : [])}
        ctx={ctx}
        emptyKey="host.databasePanel.noStats"
        reading={reading}
        filtering={filtering}
      />
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
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default DatabaseSection;
