import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostSeriesRefresh } from '../hooks/useHostSeries';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { hostLabel, isRunning, isServerRole } from '../utils/hosts';

import HostOverview from './HostOverview';
import MonitoringDatabase from './MonitoringDatabase';
import NetworkStorageSummary from './NetworkStorageSummary';
import PerformanceCharts from './PerformanceCharts';
import RefreshButton from './RefreshButton';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const machinePath = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

const stateWord = (machine, ctx) =>
  ctx.t(machine.running ? 'hosts.state.running' : 'hosts.state.stopped');

const matches = (machine, needle) => machine.name.toLowerCase().includes(needle);

/**
 * The machines table's columns: the name linking to the machine's page
 * and the state badge, running or stopped, each sorting by its text.
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
 * The label of one host: the registry row's on the server role, found
 * among every row the server answered, the agent's own reported hostname
 * on an agent role, the id while neither has answered.
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
 * One host at `/hosts/{id}`, hyperweaver-ui's host overview in its
 * order: the host's label as the title; the host overview card, the
 * system information beside the resource utilization; the machines of
 * `stats.allmachines` sorted in the one `SubTable` over Name and State,
 * running or stopped from `stats.runningmachines`, under a heading that
 * counts them, narrowed by the navbar binding of `useDetailSearch` under
 * `table_prefs_host`, the heading's View all the link to the machines of
 * the host at `/hosts/{id}/machines` while the host's own row lists
 * `machines`; then, on a host whose own row lists `monitoring`,
 * the network and storage summary, the performance charts and the
 * monitoring database, each gated by the host's own tokens. The folds of
 * the page's cards are kept under the same `table_prefs_host`. Refresh
 * in the heading's actions reads again the list of servers, the host's
 * stats, every answer the panels hold of the host and the history of
 * every series its charts draw, and nothing reads on a clock; the
 * loading line while the stats have not answered and the danger alert
 * when they failed, the stats the copy `useHostStats` shares with the
 * Controls menu and the tree.
 */
const HostPage = ({ id, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { held, refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_host`);
  const listed = hostHasFeature(useHostRow(id), 'machines');
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

  return (
    <div className="list row">
      <PageHeader title={label} actions={<RefreshButton onRefresh={refresh} />} />
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
    </div>
  );
};

HostPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default HostPage;
