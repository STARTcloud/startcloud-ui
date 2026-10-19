import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmptyState from '../../../components/common/EmptyState';
import SectionHeading from '../../../components/common/SectionHeading';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { useFolds } from '../../../hooks/useFolds';
import { usePageName } from '../../../hooks/usePageName';
import { pageContextShape } from '../../../utils/itemShape';
import { ChartControlsContext, useChartControlsState } from '../hooks/useChartControls';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostSeriesQuery } from '../hooks/useHostSeries';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetail } from '../hooks/useMachineDetail';
import { useMachineSeriesRefresh } from '../hooks/useMachineSeries';
import { useMachineSnapshotsRefresh } from '../hooks/useMachineSnapshots';
import { useMachineRefreshPublish, useServers } from '../hooks/useServers';
import { hostLabel, isRunning, isServerRole } from '../utils/hosts';
import { isUnknownMachine, nounKeyOf } from '../utils/machines';

import HostNav from './HostNav';
import MachineCharts from './MachineCharts';
import MachineConsolePanel from './MachineConsolePanel';
import MachineGuestAgentCard from './MachineGuestAgentCard';
import MachineGuestInfoCard from './MachineGuestInfoCard';
import MachineHardwareCard from './MachineHardwareCard';
import MachineInfoCard from './MachineInfoCard';
import MachineSnapshotsView from './MachineSnapshotsView';
import MachineTagsNotesCard from './MachineTagsNotesCard';
import MachineTopologySlice from './NetworkTopology/MachineTopologySlice';
import RefreshButton from './RefreshButton';

const MachineSettingsView = lazy(() => import('./MachineSettingsView'));

const MachineProvisioningView = lazy(() => import('./MachineProvisioningView'));

const TOPOLOGY_FOLD = 'machine-topology';

const labelOf = ({ status, held, id, stats }) => {
  if (isServerRole(status)) {
    const server = held.find(row => String(row.id) === String(id));
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

/**
 * One machine at `/hosts/{id}/machines/{name}`, the body of the
 * machine's column, `HostNav` over `MACHINE_PAGES`, naming the host's
 * label and its noun for the crumbs through `usePageName`: no heading
 * row over the body, the page `page` names starting under the crumbs,
 * the power verbs, the console doors and Refresh being rows of the
 * machine's Controls menu, which runs the page's Refresh through the
 * hosts feature's context. The Overview draws the machine information,
 * the console, the tags and notes, the hardware, the guest agent, the
 * guest information, the network path and the charts under the page's
 * chart controls, each a card folding under `table_prefs_machine`;
 * Settings, Snapshots and Provisioning draw `MachineSettingsView`,
 * `MachineSnapshotsView` and `MachineProvisioningView`. A surface draws
 * only while the host's row lists its token and the agent answers what
 * it draws. Refresh reads the servers, the host's stats and held
 * answers, the machine's rows, detail, series and snapshots again and
 * raises `turn`, as the stream's fresh opening and `reset` do. A
 * machine the host does not have draws the placard saying so under a
 * heading with the machine's name and Refresh.
 */
const MachinePage = ({ id, name, context, organizations, page = 'overview' }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { held, refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const answer = useMachineDetail(id, name);
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useMachineSeriesRefresh();
  const refreshSnapshots = useMachineSnapshotsRefresh();
  const { query } = useHostSeriesQuery(id);
  const controls = useChartControlsState(query.window);
  const folds = useFolds(`${context.prefsPrefix}_machine`);
  const [turn, setTurn] = useState(0);
  const server = useHostRow(id);
  const host = labelOf({ status, held, id, stats });
  const resource = t(nounKeyOf(server ? [server] : []));
  usePageName(host, t(nounKeyOf(server ? [server] : [], true)));

  const reread = () => {
    row.refresh();
    answer.refresh();
  };

  const refresh = () => {
    refreshServers();
    refreshStats();
    refreshReadings(id);
    refreshSeries(id, name);
    refreshSnapshots(id, name);
    reread();
    setTurn(current => current + 1);
  };

  useMachineRefreshPublish(refresh);

  useEffect(() => {
    document.title = name;
  }, [name]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      setTurn(current => current + 1);
    }
  });

  useEventStream('reset', () => setTurn(current => current + 1));

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const running = isRunning(stats, name);
  const { machine } = row;
  const { detail } = answer;

  const unknown = isUnknownMachine({
    name,
    stats,
    failed,
    row: { machine, settled: row.loaded || !row.offered },
    answer: { detail, settled: answer.loaded || !answer.offered },
  });

  const role = context.user?.role;

  if (unknown) {
    return (
      <HostNav id={id} name={name} role={role}>
        <div className="list row" data-page="machine">
          <SectionHeading title={name} actions={<RefreshButton onRefresh={refresh} />} />
          <div data-note="not-found">
            <EmptyState title={t('pages.machines.machineNotFound', { machineParam: name })} />
          </div>
        </div>
      </HostNav>
    );
  }

  return (
    <HostNav id={id} name={name} role={role}>
      <div className="list row" data-page="machine">
        {failed ? (
          <div className="alert alert-danger" role="alert">
            {t('hosts.host.loadError')}
          </div>
        ) : null}
        {answer.failed ? (
          <div className="alert alert-info" role="status" data-note="no-detail">
            <p className="mb-1">{t('pages.machines.detailsUnavailable', { resource })}</p>
            <p className="small text-muted mb-0">
              {t('pages.machines.detailsUnavailableNote', { resource })}
            </p>
          </div>
        ) : null}
        {page === 'settings' ? (
          <Suspense fallback={null}>
            <MachineSettingsView key={name} id={id} name={name} context={context} />
          </Suspense>
        ) : null}
        {page === 'snapshots' ? (
          <MachineSnapshotsView id={id} name={name} context={context} />
        ) : null}
        {page === 'provisioning' ? (
          <Suspense fallback={null}>
            <MachineProvisioningView id={id} name={name} context={context} />
          </Suspense>
        ) : null}
        {page === 'overview' ? (
          <div className="row g-3 mb-3">
            <MachineInfoCard
              id={id}
              name={name}
              host={host}
              machine={machine}
              detail={detail}
              running={running}
              organizations={organizations}
              folds={folds}
            />
            <MachineConsolePanel
              id={id}
              name={name}
              detail={detail}
              running={running}
              turn={turn}
              user={context.user}
              folds={folds}
            />
            {detail ? (
              <>
                <MachineTagsNotesCard
                  id={id}
                  name={name}
                  detail={detail}
                  onSaved={reread}
                  folds={folds}
                />
                <MachineHardwareCard id={id} name={name} detail={detail} folds={folds} />
                <MachineGuestAgentCard
                  id={id}
                  name={name}
                  detail={detail}
                  turn={turn}
                  onChanged={answer.refresh}
                  folds={folds}
                />
                <MachineGuestInfoCard
                  id={id}
                  name={name}
                  detail={detail}
                  turn={turn}
                  folds={folds}
                />
                <MachineTopologySlice
                  id={id}
                  name={name}
                  host={host}
                  detail={detail}
                  running={running}
                  folded={folds.folded(TOPOLOGY_FOLD)}
                  onFold={() => folds.toggle(TOPOLOGY_FOLD)}
                />
                <ChartControlsContext.Provider value={controls}>
                  <MachineCharts
                    id={id}
                    name={name}
                    host={host}
                    detail={detail}
                    running={running}
                    folds={folds}
                  />
                </ChartControlsContext.Provider>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </HostNav>
  );
};

MachinePage.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  organizations: PropTypes.arrayOf(PropTypes.object).isRequired,
  page: PropTypes.oneOf(['overview', 'settings', 'snapshots', 'provisioning']),
};

export default MachinePage;
