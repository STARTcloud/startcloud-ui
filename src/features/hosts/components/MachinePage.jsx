import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetail } from '../hooks/useMachineDetail';
import { useServers } from '../hooks/useServers';
import { hostLabel, isRunning, isServerRole, machineNoun } from '../utils/hosts';
import { isUnknownMachine } from '../utils/machines';

import MachineGuestAgentCard from './MachineGuestAgentCard';
import MachineGuestInfoCard from './MachineGuestInfoCard';
import MachineHardwareCard from './MachineHardwareCard';
import MachineInfoCard from './MachineInfoCard';
import MachineScreenshotCard from './MachineScreenshotCard';
import MachineTagsNotesCard from './MachineTagsNotesCard';
import RefreshButton from './RefreshButton';

const labelOf = ({ status, held, id, stats }) => {
  if (isServerRole(status)) {
    const server = held.find(row => String(row.id) === String(id));
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

/**
 * One machine at `/hosts/{id}/machines/{name}`, hyperweaver-ui's machine
 * overview in its order, each surface a section card that folds under
 * `table_prefs_machine`: the machine information; the screen, where
 * hyperweaver-ui drew the console; the tags and notes; the hardware; the
 * guest agent; and the guest information. The detail is the one copy
 * `useMachineDetail` holds of `GET machines/{name}`, the machine's own
 * row the one `useMachineRow` holds of `GET machines`, found whatever
 * the organization chosen, and the running state the host's stats of
 * `useHostStats`, the copies the Controls menu renews after an action.
 * A surface draws only while the host's own row lists its token and the
 * agent answers what it draws, so the page of a hyperweaver-agent
 * machine and of a zoneweaver-agent zone differ by what each agent
 * answers and never by a test of which agent it is. Refresh in the
 * heading's actions reads the list of servers, the host's stats, every
 * answer the page holds of the host, its health among them, its machine
 * rows and the detail again and raises `turn`, on which the surfaces
 * that hold a read of their own, the guest's operating system, the
 * guest properties and the screen, read again; the stream's fresh
 * opening and its `reset` raise it too, and nothing reads on a clock,
 * hyperweaver-ui's thirty-second read of the detail not carried over.
 * The loading line draws while the stats have not answered, the danger
 * alert when they failed and the two lines saying the details are not
 * available, named by the noun the host's hypervisors fix, when the
 * detail did. A route that names a machine the host does not have, one
 * that neither its stats, its machine rows nor a detail names once each
 * has answered, draws the placard saying so in place of the surfaces.
 */
const MachinePage = ({ id, name, context, organizations }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { held, refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const answer = useMachineDetail(id, name);
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_machine`);
  const [turn, setTurn] = useState(0);
  const server = useHostRow(id);
  const host = labelOf({ status, held, id, stats });
  const noun = t(`hosts.machines.noun.${machineNoun(server ? [server] : [])}`);

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

  const reread = () => {
    row.refresh();
    answer.refresh();
  };

  const refresh = () => {
    refreshServers();
    refreshStats();
    refreshReadings(id);
    reread();
    setTurn(current => current + 1);
  };

  const unknown = isUnknownMachine({
    name,
    stats,
    failed,
    row: { machine, settled: row.loaded || !row.offered },
    answer: { detail, settled: answer.loaded || !answer.offered },
  });

  if (unknown) {
    return (
      <div className="list row" data-page="machine">
        <PageHeader title={name} actions={<RefreshButton onRefresh={refresh} />} />
        <div data-note="not-found">
          <EmptyState title={t('hosts.machines.notFound', { noun, name, host })} />
        </div>
      </div>
    );
  }

  return (
    <div className="list row" data-page="machine">
      <PageHeader title={name} actions={<RefreshButton onRefresh={refresh} />} />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
      {answer.failed ? (
        <div className="alert alert-info" role="status" data-note="no-detail">
          <p className="mb-1">{t('hosts.machines.detailsUnavailable', { noun })}</p>
          <p className="small text-muted mb-0">
            {t('hosts.machines.detailsUnavailableNote', { noun })}
          </p>
        </div>
      ) : null}
      <div>
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
          <MachineScreenshotCard id={id} name={name} running={running} turn={turn} folds={folds} />
          {detail ? (
            <>
              <MachineTagsNotesCard
                id={id}
                name={name}
                detail={detail}
                onSaved={reread}
                folds={folds}
              />
              <MachineHardwareCard detail={detail} folds={folds} />
              <MachineGuestAgentCard
                id={id}
                name={name}
                detail={detail}
                turn={turn}
                onChanged={answer.refresh}
                folds={folds}
              />
              <MachineGuestInfoCard id={id} name={name} detail={detail} turn={turn} folds={folds} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

MachinePage.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  organizations: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default MachinePage;
