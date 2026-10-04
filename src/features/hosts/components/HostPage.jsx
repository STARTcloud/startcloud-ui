import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { getTask } from '../api/tasks';
import { useHostReading, useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostSeriesQuery, useHostSeriesRefresh } from '../hooks/useHostSeries';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { hostLabel, isRunning, isServerRole } from '../utils/hosts';
import { createSeedOf, hostCreates, withoutCreateSeed } from '../utils/machineCreate';
import { SERIES, hostOffers } from '../utils/monitoring';
import { uptimeParts } from '../utils/resources';

import HostNav from './HostNav';
import HostOverview from './HostOverview';
import MachineCreateModal from './MachineCreateModal';
import MonitoringDatabase from './MonitoringDatabase';
import NetworkStorageSummary from './NetworkStorageSummary';
import PerformanceCharts from './PerformanceCharts';
import QuerySelects from './QuerySelects';
import RefreshButton from './RefreshButton';
import TaskDialog from './TaskDialog';

const SEPARATOR = ' · ';

const TASK_PARAM = 'task';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const machinePath = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

const stateWord = (machine, ctx) =>
  ctx.t(machine.running ? 'hosts.state.running' : 'hosts.state.stopped');

const matches = (machine, needle) => machine.name.toLowerCase().includes(needle);

/**
 * The machines table's columns: the name linking to the machine's page
 * and the running or stopped badge.
 */
const columnsFor = id => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hosts.page.name',
    value: machine => machine.name,
    render: machine => (
      <Link to={machinePath(id, machine.name)} className="fw-semibold">
        {machine.name}
      </Link>
    ),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'hosts.machine.state',
    value: stateWord,
    render: (machine, ctx) => (
      <span className={`badge ${machine.running ? 'text-bg-success' : 'text-bg-secondary'}`}>
        {stateWord(machine, ctx)}
      </span>
    ),
  },
];

const machinesOf = stats =>
  [...(stats?.allmachines || [])].sort().map(name => ({ name, running: isRunning(stats, name) }));

/**
 * The label of one host: the registry row's on the server role, the
 * agent's hostname on an agent role, the id while neither has answered.
 *
 * @param {Object} options - The status, the held rows, the id and the stats
 * @returns {string} The label
 */
const labelOf = ({ status, held, id, stats }) => {
  if (isServerRole(status)) {
    const server = held.find(row => String(row.id) === String(id));
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

/**
 * The muted text after the host's title: the health word, the uptime and
 * the machines running of all, joined by a middle dot.
 *
 * @param {Object} options - The health answer, the stats, the running and total counts and `t`
 * @returns {string|null} The text, null while nothing has answered
 */
const stateTextOf = ({ health, stats, running, total, t }) => {
  const parts = uptimeParts(stats?.uptime);
  return (
    [
      health?.status || '',
      parts ? t('hosts.overview.uptimeValue', parts) : '',
      stats ? t('hosts.host.machines', { running, total }) : '',
    ]
      .filter(Boolean)
      .join(SEPARATOR) || null
  );
};

/**
 * The task the route's `task` query names, read once for the host, null
 * while none is named or it has not answered.
 *
 * @param {Object} options - The status, the host's id and the task's id
 * @returns {Object|null} The task's row
 */
const useArrivedTask = ({ status, id, taskId }) => {
  const [held, setHeld] = useState(null);

  useEffect(() => {
    if (!taskId) {
      return undefined;
    }
    let live = true;
    getTask(status, id, taskId)
      .then(row => {
        if (live) {
          setHeld(row);
        }
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [status, id, taskId]);

  return taskId && held?.id === taskId ? held : null;
};

const withoutTask = params => {
  const next = new URLSearchParams(params);
  next.delete(TASK_PARAM);
  return next;
};

/**
 * One host at `/hosts/{id}` inside its column: the heading with the
 * health, uptime and running machines, the overview card, the machines
 * table, the network and storage summary, the performance charts and the
 * monitoring database; the route's `create=machine` query opens the
 * create wizard and its `task` query opens that task's dialog.
 */
const HostPage = ({ id, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { held, refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const health = useHostReading(id, 'monitoring-health');
  const folds = useFolds(`${context.prefsPrefix}_host`);
  const server = useHostRow(id);
  const listed = hostHasFeature(server, 'machines');
  const charted = hostOffers(server, SERIES.cpu.tokens);
  const [searchParams, setSearchParams] = useSearchParams();
  const seed = createSeedOf(searchParams);
  const arrivedTask = useArrivedTask({ status, id, taskId: searchParams.get(TASK_PARAM) || '' });
  const columns = useMemo(() => columnsFor(id), [id]);
  const machines = useMemo(() => machinesOf(stats), [stats]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useDetailSearch({
    rows: machines,
    matches,
    placeholderKey: 'hosts.host.search',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_host`,
    defaultSort: DEFAULT_SORT,
  });
  const label = labelOf({ status, held, id, stats });

  usePageName(label);

  useEffect(() => {
    document.title = label;
  }, [label]);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const running = machines.filter(machine => machine.running).length;

  const refresh = () => {
    refreshServers();
    refreshStats();
    refreshReadings(id);
    refreshSeries(id);
  };

  const actions = (
    <>
      {charted ? <QuerySelects query={query} onChange={setQuery} scope="hostHeader" /> : null}
      <RefreshButton onRefresh={refresh} />
    </>
  );

  return (
    <HostNav id={id}>
      <div className="list row">
        <SectionHeading
          title={label}
          count={stateTextOf({ health: health.data, stats, running, total: machines.length, t })}
          actions={actions}
        />
        {failed ? (
          <div className="alert alert-danger" role="alert">
            {t('hosts.host.loadError')}
          </div>
        ) : null}
        {stats ? <HostOverview id={id} stats={stats} folds={folds} /> : null}
        {stats ? (
          <SectionHeading
            title={t('hosts.page.machines')}
            count={t('hosts.host.machines', { running, total: machines.length })}
            actions={
              listed ? (
                <Link
                  to={`/hosts/${id}/machines`}
                  className="btn btn-sm btn-outline-secondary"
                  data-link="machines"
                >
                  {t('hosts.machines.viewAll')}
                </Link>
              ) : null
            }
          />
        ) : null}
        {stats ? (
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={machine => machine.name}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            widths={search.widths}
            onResize={search.setColumnWidth}
            ctx={ctx}
            emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
          />
        ) : null}
        <NetworkStorageSummary id={id} />
        <PerformanceCharts id={id} host={label} folds={folds} />
        <MonitoringDatabase id={id} />
        <MachineCreateModal
          status={status}
          id={id}
          open={Boolean(seed) && hostCreates(server, context.user?.role)}
          user={context.user}
          seed={seed}
          onClose={() => setSearchParams(withoutCreateSeed(searchParams), { replace: true })}
        />
        {arrivedTask ? (
          <TaskDialog
            status={status}
            id={id}
            task={arrivedTask}
            onHide={() => setSearchParams(withoutTask(searchParams), { replace: true })}
          />
        ) : null}
      </div>
    </HostNav>
  );
};

HostPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default HostPage;
