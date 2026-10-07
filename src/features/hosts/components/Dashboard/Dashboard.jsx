import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ButtonGroup, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTableColumns } from 'react-icons/fa6';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import PageHeader from '../../../../components/common/PageHeader';
import { useStatus } from '../../../../contexts/StatusContext';
import { useDetailSearch } from '../../../../hooks/useDetailSearch';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { useHostStats, useHostStatsRefresh } from '../../hooks/useHostStats';
import { useServers } from '../../hooks/useServers';
import { hostHasFeature } from '../../utils/capabilities';
import { isServerRole } from '../../utils/hosts';
import { createRouteOf, createSeedOf, hostCreates } from '../../utils/machineCreate';
import { nounKeyOf } from '../../utils/machines';
import { hostHasNetworking } from '../../utils/networking';
import TopologyPanel from '../NetworkTopology/TopologyPanel';
import { useTopologyHostGraph } from '../NetworkTopology/useTopologyFeed';
import RefreshButton from '../RefreshButton';

import DashboardCharts, { dashboardTiles } from './DashboardCharts';
import DashboardHealthModal from './DashboardHealthModal';
import DashboardQuickActions from './DashboardQuickActions';
import DashboardServerCards from './DashboardServerCards';
import DashboardSummaryCards from './DashboardSummaryCards';
import {
  calculateInfrastructureSummary,
  getServerHealthStatus,
  serverResultOf,
} from './dashboardUtils';
import DashboardWidget from './DashboardWidget';
import useDashboardLayout from './useDashboardLayout';

const SERVER_SETTINGS = '/admin/config';

const ADD_HOST = '/?add=host';

const NO_GRAPHS = {};

const NO_COLUMNS = [];

const hostMatches = (result, needle) =>
  [result.server.entity_name || '', result.data?.hostname || '', result.server.hostname || ''].some(
    text => text.toLowerCase().includes(needle)
  );

const HOST_GROUPS = [
  {
    key: 'health',
    labelKey: 'dashboard.serverCards.health',
    values: result => [getServerHealthStatus(result)],
    order: ['healthy', 'warning', 'offline'],
    activeClass: 'bg-success',
    labelFor: (value, t) => t(`dashboard.serverCards.healthOf.${value}`),
  },
];

/**
 * One host's feed of the dashboard: draws nothing and hands the page the
 * host's result, its stats and, where the host lists `monitoring`, its
 * health, each the copy the hosts feature's context holds, through
 * `onHost` whenever it changes; and the host's topology graph where its
 * row lists a networking token, so the host's card can draw the strip.
 */
const DashboardHostFeed = ({ server, onHost, onGraph }) => {
  const { t } = useTranslation();
  const id = String(server.id);
  const { stats, loaded, failed } = useHostStats(id);
  const health = useHostReading(id, 'monitoring-health');
  const networked = hostHasNetworking(server);
  const topology = useTopologyHostGraph(id);
  const result = useMemo(
    () =>
      serverResultOf({
        server,
        stats,
        loaded,
        failed,
        health: health.data,
        error: failed ? t('dashboard.serverCards.connectionFailed') : null,
      }),
    [server, stats, loaded, failed, health.data, t]
  );

  useEffect(() => {
    onHost(id, { result, loaded });
  }, [id, result, loaded, onHost]);

  useEffect(() => {
    onGraph(id, networked ? topology.graph : null);
  }, [id, networked, topology.graph, onGraph]);

  useEffect(
    () => () => {
      onHost(id, null);
      onGraph(id, null);
    },
    [id, onHost, onGraph]
  );

  return null;
};

DashboardHostFeed.propTypes = {
  server: PropTypes.object.isRequired,
  onHost: PropTypes.func.isRequired,
  onGraph: PropTypes.func.isRequired,
};

const WidgetMenu = ({ layout, onToggleHidden }) => {
  const { t } = useTranslation();
  return (
    <Dropdown as={ButtonGroup} align="end" autoClose="outside">
      <Dropdown.Toggle variant="outline-secondary" size="sm" data-action="widgets">
        <FaTableColumns className="me-2" aria-hidden="true" />
        {t('dashboard.widgets.menu')}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {layout.map(row => (
          <label
            key={row.id}
            className="dropdown-item d-flex align-items-center gap-2 mb-0 cursor-pointer"
          >
            <input
              type="checkbox"
              className="form-check-input m-0"
              checked={!row.hidden}
              onChange={() => onToggleHidden(row.id)}
              data-widget-toggle={row.id}
            />
            {t(`dashboard.widgets.${row.id}`)}
          </label>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

WidgetMenu.propTypes = {
  layout: PropTypes.arrayOf(PropTypes.object).isRequired,
  onToggleHidden: PropTypes.func.isRequired,
};

const useHeld = () => {
  const [held, setHeld] = useState({});
  const set = useCallback((id, value) => {
    setHeld(current => {
      if (value === null) {
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== id));
      }
      return current[id] === value ? current : { ...current, [id]: value };
    });
  }, []);
  return [held, set];
};

/**
 * The dashboard, hyperweaver-ui's infrastructure overview, the home of
 * an agent role at `/`: the heading with how many hosts and machines it
 * manages, the widget menu and Refresh; then the widgets in the saved
 * order, each folding and hiding, the summary tiles, the charts of every
 * host that offers them, the quick actions, one card a host and, on the
 * server role alone, the network topology.
 * The navbar search is bound over the hosts' names, the Health `toggle`
 * group narrowing the host cards client-side under
 * `<prefix>_dashboard_hosts` through `useDetailSearch`, the summary
 * tiles and the quick actions over every host still.
 * Every host's stats and health are the copies the hosts feature's
 * context holds, read once as the page draws, again when the stream
 * opens fresh or answers `reset`, renewed by the `hosts` topic between
 * reads and on Refresh, which reads the list of servers, every host's
 * stats, its held reads and the series its charts draw again; hyperweaver-ui's thirty-second timer
 * is not carried over. View details opens the host's page, New machine
 * the create wizard of the first host that offers it, Manage machines
 * the machines of the first host that lists them, Add host the hosts
 * page with the registry panel's form open and Settings the agent's
 * API keys page, the first page of its Agent group, on an agent role
 * and the server's own configuration at `/admin/config` on the server
 * role. The `create=machine`
 * query, the Deploy hand-off landing on `/`, moves to the page of the
 * first host that offers a create, `hostCreates`, the query and its seed
 * kept, the way the hosts page moves it on the server role, and stays on
 * the dashboard while no host does.
 */
const Dashboard = ({ context }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seed = createSeedOf(searchParams);
  const { servers, loaded, failed, refresh: refreshServers } = useServers();
  const refreshStats = useHostStatsRefresh();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_dashboard`);
  const { layout, draggingId, setDraggingId, moveWidget, toggleCollapsed, toggleHidden } =
    useDashboardLayout();
  const [held, setHost] = useHeld();
  const [graphs, setGraph] = useHeld();
  const [healthOpen, setHealthOpen] = useState(false);
  const [stamp, setStamp] = useState({ answered: false, at: null });
  const serverRole = isServerRole(status);
  const results = useMemo(
    () => servers.map(server => held[String(server.id)]?.result).filter(Boolean),
    [servers, held]
  );
  const answered = loaded && servers.every(server => held[String(server.id)]?.loaded === true);
  if (stamp.answered !== answered) {
    setStamp({ answered, at: answered ? new Date() : stamp.at });
  }
  const updatedAt = stamp.at;
  const summary = useMemo(() => calculateInfrastructureSummary(results), [results]);
  const search = useDetailSearch({
    rows: results,
    matches: hostMatches,
    placeholderKey: 'dashboard.search',
    columns: NO_COLUMNS,
    ctx: { t },
    prefsKey: `${context.prefsPrefix}_dashboard_hosts`,
    filterGroups: HOST_GROUPS,
  });
  const plural = t(nounKeyOf(servers, true));
  const machines = servers.some(server => hostHasFeature(server, 'machines'));
  const firstMachines = servers.find(server => hostHasFeature(server, 'machines'));
  const firstCreates = servers.find(server => hostCreates(server, context.user?.role));

  useEffect(() => {
    document.title = `${t('dashboard.dashboard.infrastructureOverview')} · ${context.appName}`;
  }, [t, context.appName]);

  const refresh = () => {
    refreshServers();
    servers.forEach(server => {
      refreshStats(String(server.id));
      refreshReadings(String(server.id));
      refreshSeries(String(server.id));
    });
    setStamp(current => ({ ...current, at: new Date() }));
  };

  const widgetAvailable = id => {
    if (id === 'topology') {
      return serverRole && servers.length > 0;
    }
    return id === 'charts' ? dashboardTiles(servers).length > 0 : true;
  };

  const openSettings = () =>
    navigate(serverRole ? SERVER_SETTINGS : `/hosts/${servers[0].id}/agent/api-keys`);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('dashboard.dashboard.loadingOverview')}</div>
      </div>
    );
  }

  if (seed && firstCreates) {
    return <Navigate to={createRouteOf(firstCreates.id, seed)} replace />;
  }

  if (servers.length === 0) {
    return (
      <div className="list row" data-page="dashboard-empty">
        <PageHeader title={t('dashboard.dashboard.infrastructureOverview')} />
        {failed ? (
          <div className="alert alert-danger" role="alert">
            {t('hosts.page.loadError')}
          </div>
        ) : null}
        <div className="alert alert-info">
          <h2 className="h4">{t('dashboard.dashboard.welcome')}</h2>
          <p className="mb-4">{t('dashboard.dashboard.welcomeDescription')}</p>
          <button
            type="button"
            className="btn btn-primary"
            data-action="add-host"
            onClick={() => navigate(ADD_HOST)}
          >
            <FaPlus className="me-2" aria-hidden="true" />
            {t('dashboard.dashboard.addServer')}
          </button>
        </div>
      </div>
    );
  }

  const subtitle = [
    t('dashboard.dashboard.managing', { totalServers: summary.totalServers }),
    machines
      ? t('dashboard.dashboard.with', {
          totalZones: summary.totalZones,
          resource: plural.toLowerCase(),
        })
      : '',
    updatedAt
      ? `• ${t('dashboard.dashboard.lastUpdated', { time: updatedAt.toLocaleTimeString() })}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const widgetBody = id => {
    if (id === 'summary') {
      return (
        <DashboardSummaryCards
          summary={summary}
          servers={servers}
          onShowHealthModal={() => setHealthOpen(true)}
        />
      );
    }
    if (id === 'charts') {
      return <DashboardCharts servers={servers} />;
    }
    if (id === 'quickActions') {
      return (
        <DashboardQuickActions
          results={results}
          summary={summary}
          servers={servers}
          role={context.user?.role}
          addHost={serverRole}
          onNavigateCreate={() => navigate(createRouteOf(firstCreates?.id ?? servers[0].id))}
          onNavigateMachines={() =>
            navigate(`/hosts/${firstMachines?.id ?? servers[0].id}/machines`)
          }
          onNavigateAddHost={() => navigate(ADD_HOST)}
          onNavigateSettings={openSettings}
        />
      );
    }
    if (id === 'serverCards') {
      return (
        <DashboardServerCards
          results={search.rows}
          graphs={graphs || NO_GRAPHS}
          onNavigateToServer={server => navigate(`/hosts/${server.id}`)}
        />
      );
    }
    return (
      <TopologyPanel
        id={String(servers[0].id)}
        fold={{
          folded: folds.folded('topology'),
          onFold: () => folds.toggle('topology'),
          title: t('pages.toggle'),
        }}
      />
    );
  };

  const actions = (
    <>
      <WidgetMenu
        layout={layout.filter(row => widgetAvailable(row.id))}
        onToggleHidden={toggleHidden}
      />
      <RefreshButton onRefresh={refresh} />
    </>
  );
  const widgets = answered ? layout.filter(row => widgetAvailable(row.id) && !row.hidden) : [];

  return (
    <div className="list row" data-page="dashboard" data-answered={answered}>
      {servers.map(server => (
        <DashboardHostFeed
          key={String(server.id)}
          server={server}
          onHost={setHost}
          onGraph={setGraph}
        />
      ))}
      <PageHeader
        title={t('dashboard.dashboard.infrastructureOverview')}
        subtitle={subtitle}
        actions={actions}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.page.loadError')}
        </div>
      ) : null}
      {!answered ? <p className="text-muted">{t('dashboard.dashboard.loadingOverview')}</p> : null}
      {widgets.map(row => (
        <DashboardWidget
          key={row.id}
          id={row.id}
          title={t(`dashboard.widgets.${row.id}`)}
          collapsed={row.collapsed}
          dragging={draggingId === row.id}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
          onDropOn={targetId => {
            moveWidget(draggingId, targetId);
            setDraggingId(null);
          }}
          onToggleCollapsed={toggleCollapsed}
          onHide={toggleHidden}
        >
          {widgetBody(row.id)}
        </DashboardWidget>
      ))}
      {healthOpen ? (
        <DashboardHealthModal results={results} onClose={() => setHealthOpen(false)} />
      ) : null}
    </div>
  );
};

Dashboard.propTypes = {
  context: pageContextShape.isRequired,
};

export default Dashboard;
