import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaMemory } from 'react-icons/fa6';

import { hostHasFeature } from '../../utils/capabilities';
import { nounKeyOf } from '../../utils/machines';
import UsageBar from '../UsageBar';

import { bytesToSize } from './dashboardUtils';

const PERCENT = 100;

const Pair = ({ tone, labelKey, value }) => {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div className={`text-uppercase small fw-semibold text-${tone}`}>{t(labelKey)}</div>
      <div className="fs-6 fw-bold">{value}</div>
    </div>
  );
};

Pair.propTypes = {
  tone: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
};

const Tile = ({ name, labelKey, label = '', tone, big, children }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card h-100" data-tile={name}>
        <div className="card-body text-center">
          <div className="text-uppercase small fw-semibold text-muted">{label || t(labelKey)}</div>
          <div className={`fs-2 fw-bold text-${tone}`} data-number={big}>
            {big}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

Tile.propTypes = {
  name: PropTypes.string.isRequired,
  labelKey: PropTypes.string,
  label: PropTypes.string,
  tone: PropTypes.string.isRequired,
  big: PropTypes.node.isRequired,
  children: PropTypes.node,
};

/**
 * The summary tiles of the dashboard, hyperweaver-ui's four: the hosts
 * with the online and offline counts, the machines, named by the noun
 * the hosts' hypervisors fix and drawn only while a host lists
 * `machines`, with the running and stopped counts, the memory in use
 * over the one usage bar, and the health, a button that opens the
 * health dialog while any issue is counted.
 */
const DashboardSummaryCards = ({ summary, servers, onShowHealthModal }) => {
  const { t } = useTranslation();
  const machinesLabel = t(nounKeyOf(servers, true));
  const machinesAvailable = servers.some(server => hostHasFeature(server, 'machines'));
  const memoryPercent =
    summary.totalMemory > 0
      ? Math.round((summary.usedMemory / summary.totalMemory) * PERCENT)
      : null;

  return (
    <div className="row g-3 mb-3" data-panel="summary">
      <Tile
        name="servers"
        labelKey="dashboard.summaryCards.totalServers"
        tone="info"
        big={summary.totalServers}
      >
        <div className="d-flex justify-content-around mt-2">
          <Pair
            tone="success"
            labelKey="dashboard.summaryCards.online"
            value={summary.onlineServers}
          />
          <Pair
            tone="danger"
            labelKey="dashboard.summaryCards.offline"
            value={summary.offlineServers}
          />
        </div>
      </Tile>
      {machinesAvailable ? (
        <Tile
          name="machines"
          label={t('dashboard.summaryCards.totalMachines', { label: machinesLabel })}
          tone="primary"
          big={summary.totalZones}
        >
          <div className="d-flex justify-content-around mt-2">
            <Pair
              tone="success"
              labelKey="dashboard.summaryCards.running"
              value={summary.runningZones}
            />
            <Pair
              tone="warning"
              labelKey="dashboard.summaryCards.stopped"
              value={summary.stoppedZones}
            />
          </div>
        </Tile>
      ) : null}
      <Tile
        name="memory"
        labelKey="dashboard.summaryCards.memoryUsage"
        tone="info"
        big={
          memoryPercent === null ? t('dashboard.summaryCards.notAvailable') : `${memoryPercent}%`
        }
      >
        <div className="mt-2">
          {memoryPercent === null ? (
            <div className="text-uppercase small fw-semibold text-muted">
              {t('dashboard.summaryCards.noDataAvailable')}
            </div>
          ) : (
            <UsageBar
              name="dashboard-memory"
              icon={<FaMemory />}
              label={t('dashboard.summaryCards.memoryUsage')}
              summary={`${bytesToSize(summary.usedMemory)} / ${bytesToSize(summary.totalMemory)}`}
              percent={memoryPercent}
              segments={[{ key: 'used', percent: memoryPercent, tone: 'info' }]}
            />
          )}
        </div>
      </Tile>
      <div className="col-12 col-sm-6 col-xl-3">
        <button
          type="button"
          className="card h-100 w-100 text-reset p-0"
          data-tile="health"
          data-action="health-issues"
          onClick={onShowHealthModal}
          title={summary.totalIssues > 0 ? t('dashboard.summaryCards.clickToViewDetails') : ''}
          disabled={summary.totalIssues === 0}
        >
          <div className="card-body text-center">
            <div className="text-uppercase small fw-semibold text-muted">
              {t('dashboard.summaryCards.healthStatus')}
            </div>
            <div className="fs-2 fw-bold text-success" data-number={summary.healthyServers}>
              {summary.healthyServers}
            </div>
            <div className="d-flex justify-content-around mt-2">
              <Pair
                tone="success"
                labelKey="dashboard.summaryCards.healthy"
                value={summary.healthyServers}
              />
              <Pair
                tone="warning"
                labelKey="dashboard.summaryCards.issues"
                value={summary.totalIssues}
              />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

DashboardSummaryCards.propTypes = {
  summary: PropTypes.shape({
    totalServers: PropTypes.number.isRequired,
    onlineServers: PropTypes.number.isRequired,
    offlineServers: PropTypes.number.isRequired,
    totalZones: PropTypes.number.isRequired,
    runningZones: PropTypes.number.isRequired,
    stoppedZones: PropTypes.number.isRequired,
    totalMemory: PropTypes.number.isRequired,
    usedMemory: PropTypes.number.isRequired,
    healthyServers: PropTypes.number.isRequired,
    totalIssues: PropTypes.number.isRequired,
  }).isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  onShowHealthModal: PropTypes.func.isRequired,
};

export default DashboardSummaryCards;
