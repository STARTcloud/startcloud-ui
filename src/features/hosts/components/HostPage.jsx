import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import RecordRows from '../../../components/common/RecordRows';
import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { pageContextShape } from '../../../utils/itemShape';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostLabel, isRunning, isServerRole } from '../utils/hosts';

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
 * The label of one host: the registry row's on the server role, the
 * agent's own reported hostname on an agent role, the id while neither
 * has answered.
 *
 * @param {Object} options - The status, the servers, the id and the stats
 * @returns {string} The label
 */
const labelOf = ({ status, servers, id, stats }) => {
  if (isServerRole(status)) {
    const server = servers.find(row => String(row.id) === String(id));
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const factRows = (stats, t) =>
  [
    ['hostname', stats.hostname],
    ['platform', stats.platform],
    ['arch', stats.arch],
    ['uptime', stats.uptime],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, label: t(`hosts.host.${key}`), value: String(value) }));

/**
 * One host at `/hosts/{id}`: the host's label as the title, the agent's
 * hostname, platform, architecture and uptime as record rows when its
 * stats carry them with the machine count under them, then the machines
 * of `stats.allmachines` sorted in the one `SubTable` over Name and
 * State, running or stopped from `stats.runningmachines`, narrowed by
 * the navbar binding of `useDetailSearch` under `table_prefs_host`,
 * Refresh in the heading's actions reading the list of servers and the
 * host's stats again; the loading line while the stats have not
 * answered and the danger alert when they failed, the stats the copy
 * `useHostStats` shares with the Controls menu and the tree.
 */
const HostPage = ({ id, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { servers, refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);
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
  const label = labelOf({ status, servers, id, stats });

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
  };

  return (
    <div className="list row">
      <PageHeader title={label} actions={<RefreshButton onRefresh={refresh} />} />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
      {stats ? (
        <RecordRows
          rows={[
            ...factRows(stats, t),
            {
              key: 'machines',
              label: t('hosts.page.machines'),
              value: t('hosts.host.machines', { running, total: machines.length }),
            },
          ]}
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
    </div>
  );
};

HostPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default HostPage;
