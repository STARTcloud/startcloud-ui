import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { useHostReading } from '../hooks/useHostReadings';
import { healthTone, taskCounts, toolRows, uptimeParts } from '../utils/resources';

import ProvisioningTools from './ProvisioningTools';

const platformOf = ({ type, platform, release }) =>
  [type || platform, release].filter(Boolean).join(' ');

const uptimeOf = (stats, t) => {
  const parts = uptimeParts(stats.uptime);
  return parts ? t('hosts.overview.uptimeValue', parts) : '';
};

const factRows = (stats, t) =>
  [
    ['hostname', 'hosts.host.hostname', stats.hostname],
    ['platform', 'hosts.host.platform', platformOf(stats)],
    ['arch', 'hosts.host.arch', stats.arch],
    ['osBuild', 'hosts.overview.osBuild', stats.version],
    ['uptime', 'hosts.host.uptime', uptimeOf(stats, t)],
  ].map(([key, labelKey, value]) => ({
    key,
    label: t(labelKey),
    value: value || t('hosts.overview.notAvailable'),
  }));

const ServiceBadges = ({ service }) => {
  const { t } = useTranslation();
  return (
    <span className="d-flex flex-wrap gap-1">
      <span className={`badge ${service.isRunning ? 'text-bg-success' : 'text-bg-danger'}`}>
        {t(service.isRunning ? 'hosts.state.running' : 'hosts.state.stopped')}
      </span>
      {service.isInitialized ? (
        <span className="badge text-bg-success">{t('hosts.overview.initialized')}</span>
      ) : null}
    </span>
  );
};

ServiceBadges.propTypes = {
  service: PropTypes.shape({
    isRunning: PropTypes.bool,
    isInitialized: PropTypes.bool,
  }).isRequired,
};

const QueueBadges = ({ counts }) => {
  const { t } = useTranslation();
  return (
    <span className="d-flex flex-wrap gap-1">
      <span className="badge text-bg-info">
        {t('hosts.overview.pending', { number: counts.pending })}
      </span>
      <span className="badge text-bg-success">
        {t('hosts.overview.done', { number: counts.completed })}
      </span>
      {counts.failed > 0 ? (
        <span className="badge text-bg-danger">
          {t('hosts.overview.failed', { number: counts.failed })}
        </span>
      ) : null}
    </span>
  );
};

QueueBadges.propTypes = {
  counts: PropTypes.shape({
    pending: PropTypes.number.isRequired,
    completed: PropTypes.number.isRequired,
    failed: PropTypes.number.isRequired,
  }).isRequired,
};

const serviceRows = ({ service, health, t }) => [
  ...(service
    ? [
        {
          key: 'service',
          label: t('hosts.overview.monitoringService'),
          value: <ServiceBadges service={service} />,
        },
      ]
    : []),
  ...(health?.status
    ? [
        {
          key: 'health',
          label: t('hosts.overview.serviceHealth'),
          value: (
            <span className={`badge text-bg-${healthTone(health.status)}`}>{health.status}</span>
          ),
        },
      ]
    : []),
];

const queueRows = (stats, t) =>
  stats
    ? [
        {
          key: 'queue',
          label: t('hosts.overview.taskQueue'),
          value: <QueueBadges counts={taskCounts(stats)} />,
        },
      ]
    : [];

const toolsRows = (answer, t) => {
  const { rows, missing } = toolRows(answer);
  return rows.length > 0
    ? [
        {
          key: 'tools',
          label: t('hosts.overview.provisioningTools'),
          value: <ProvisioningTools tools={rows} missing={missing} />,
        },
      ]
    : [];
};

/**
 * The system information of one host, the leading column of the host
 * overview, as record rows: the hostname, the platform with its
 * release, the architecture, the OS build and the uptime from the
 * host's stats, the not available word for a member the agent did not
 * answer; then, each only where the host's own row lists its token and
 * the agent answered, the monitoring service, running or stopped and
 * initialized, and its health word in its tone behind `monitoring`, the
 * task queue's pending, done and failed counts behind `tasks`, read by
 * the names the agents answer, and the provisioning tools behind
 * `provisioning`.
 */
const SystemInfoPanel = ({ id, stats }) => {
  const { t } = useTranslation();
  const service = useHostReading(id, 'monitoring-status');
  const health = useHostReading(id, 'monitoring-health');
  const queue = useHostReading(id, 'task-stats');
  const tools = useHostReading(id, 'provisioning');
  return (
    <div data-panel="system-info">
      <h6 className="mb-3">{t('hosts.overview.systemInfo')}</h6>
      <RecordRows
        className="mb-0"
        rows={[
          ...factRows(stats, t),
          ...serviceRows({ service: service.data, health: health.data, t }),
          ...queueRows(queue.data, t),
          ...toolsRows(tools.data, t),
        ]}
      />
    </div>
  );
};

SystemInfoPanel.propTypes = {
  id: PropTypes.string.isRequired,
  stats: PropTypes.object.isRequired,
};

export default SystemInfoPanel;
