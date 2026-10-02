import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaCircle } from 'react-icons/fa6';

import { hostHasFeature } from '../../utils/capabilities';
import { nounKeyOf } from '../../utils/machines';
import TopologyMini from '../NetworkTopology/TopologyMini';

import {
  getServerHealthStatus,
  getStatusColor,
  hasHighLoad,
  hasLowFreeMemory,
  memoryPercentOf,
} from './dashboardUtils';

const statusTooltipFor = (status, serverError, data, t) => {
  if (status === 'offline') {
    return serverError || t('dashboard.serverCards.connectionFailed');
  }
  if (status === 'warning') {
    return [
      hasHighLoad(data) ? t('dashboard.serverCards.highCpuLoad') : '',
      hasLowFreeMemory(data) ? t('dashboard.serverCards.lowMemory') : '',
    ]
      .filter(Boolean)
      .join(', ');
  }
  return t('dashboard.serverCards.hostHealthy');
};

const NONE = '-';

const Figure = ({ label, value }) => (
  <div className="col text-center">
    <div className="text-uppercase small fw-semibold text-muted">{label}</div>
    <div className={`fs-4 fw-bold${value === NONE ? ' text-muted' : ''}`}>{value}</div>
  </div>
);

Figure.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const figuresOf = ({ server, data, online, t }) => {
  const memory = memoryPercentOf(data);
  const counted = online && hostHasFeature(server, 'machines');
  return [
    {
      key: 'machines',
      label: t(nounKeyOf([server], true)),
      value: counted
        ? `${data.runningmachines?.length || 0} / ${data.allmachines?.length || 0}`
        : NONE,
    },
    {
      key: 'load',
      label: t('dashboard.serverCards.cpuLoad'),
      value: online && data.loadavg ? data.loadavg[0].toFixed(2) : NONE,
    },
    {
      key: 'memory',
      label: t('dashboard.serverCards.memory'),
      value: online && memory !== null ? `${memory}%` : NONE,
    },
  ];
};

const platformLine = ({ data, online, t }) => {
  if (!online) {
    return t('dashboard.serverCards.connectionFailedFull');
  }
  return `${data.type || t('dashboard.serverCards.notAvailable')} ${data.release || ''}`;
};

const ServerCard = ({ result, onNavigateToServer, topologyGraph = null }) => {
  const { t } = useTranslation();
  const { server, success, data, error: serverError } = result;
  const status = getServerHealthStatus(result);
  const online = success && Boolean(data);
  return (
    <div className="col-12 col-xl-6">
      <div className="card h-100" data-host-card={String(server.id)} data-health={status}>
        <div className="card-body">
          <h2 className="h5 mb-3 d-flex align-items-center gap-2">
            <span
              className={getStatusColor(status)}
              title={statusTooltipFor(status, serverError, data, t)}
            >
              <FaCircle className="small" aria-hidden="true" />
            </span>
            <span title={`${server.hostname}:${server.port ?? ''}`}>
              {server.entity_name || data?.hostname || server.hostname}
            </span>
          </h2>
          <p className="text-muted mb-3">{platformLine({ data, online, t })}</p>
          <div className="row mb-3">
            {figuresOf({ server, data, online, t }).map(figure => (
              <Figure key={figure.key} label={figure.label} value={figure.value} />
            ))}
          </div>
          {topologyGraph ? (
            <div className="d-flex justify-content-center mb-3">
              <TopologyMini graph={topologyGraph} />
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary w-100"
            data-action="view-host"
            onClick={() => onNavigateToServer(server)}
            disabled={!online}
          >
            <FaArrowRight className="me-2" aria-hidden="true" />
            {t('dashboard.serverCards.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  );
};

ServerCard.propTypes = {
  result: PropTypes.shape({
    server: PropTypes.object.isRequired,
    success: PropTypes.bool.isRequired,
    data: PropTypes.object,
    error: PropTypes.string,
  }).isRequired,
  onNavigateToServer: PropTypes.func.isRequired,
  topologyGraph: PropTypes.object,
};

/**
 * One card a host, hyperweaver-ui's: the health dot with its reason as
 * the tooltip, the name, the platform line, the machines running over
 * all, the load and the memory, the topology strip of a host whose row
 * lists a networking token, and View details, a door to the host's
 * page, held while the host did not answer.
 */
const DashboardServerCards = ({ results, onNavigateToServer, graphs }) => (
  <div className="row g-2 mb-0" data-panel="host-cards">
    {results.map(result => (
      <ServerCard
        key={String(result.server.id)}
        result={result}
        onNavigateToServer={onNavigateToServer}
        topologyGraph={graphs[String(result.server.id)] || null}
      />
    ))}
  </div>
);

DashboardServerCards.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  onNavigateToServer: PropTypes.func.isRequired,
  graphs: PropTypes.objectOf(PropTypes.object).isRequired,
};

export default DashboardServerCards;
