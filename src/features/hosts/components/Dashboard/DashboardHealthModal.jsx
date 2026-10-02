import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import {
  getServerHealthStatus,
  hasHighLoad,
  hasLowFreeMemory,
  isUnhealthy,
  memoryPercentOf,
} from './dashboardUtils';

const MINUTES_AN_HOUR = 60;

const agoOf = minutes =>
  minutes > MINUTES_AN_HOUR
    ? `${Math.floor(minutes / MINUTES_AN_HOUR)}h ${minutes % MINUTES_AN_HOUR}m ago`
    : `${minutes}m ago`;

const collectIssues = (result, t) => {
  const status = getServerHealthStatus(result);
  const issues = [];
  const rebootInfo = result.healthData?.reboot_info;
  if (status === 'offline') {
    issues.push(result.error || t('dashboard.healthModal.connectionFailed'));
  } else if (status === 'warning') {
    if (hasHighLoad(result.data)) {
      issues.push(
        t('dashboard.healthModal.highCpuLoad', { cpuLoad: result.data.loadavg[0].toFixed(2) })
      );
    }
    if (hasLowFreeMemory(result.data)) {
      issues.push(t('dashboard.healthModal.lowMemory', { memUsed: memoryPercentOf(result.data) }));
    }
  }
  if (result.healthData?.reboot_required) {
    issues.push(
      t('dashboard.healthModal.rebootRequired', {
        reasons: rebootInfo?.reasons?.join(', ') || t('dashboard.healthModal.configurationChanges'),
        timeAgo: agoOf(rebootInfo?.age_minutes || 0),
      })
    );
  }
  const faults = result.healthData?.faultStatus;
  if (faults?.hasFaults) {
    issues.push(
      t('dashboard.healthModal.systemFault', {
        faultCount: faults.faultCount,
        faultWord: faults.faultCount === 1 ? 'fault' : 'faults',
        severity: faults.severityLevels?.join(', ') || 'Unknown',
      })
    );
  }
  return { status, issues };
};

const HealthIssueCard = ({ result }) => {
  const { t } = useTranslation();
  const { status, issues } = collectIssues(result, t);
  const reboot = Boolean(result.healthData?.reboot_required);
  const tone = status === 'offline' && !reboot ? 'alert-danger' : 'alert-warning';
  return (
    <div className={`alert ${tone} mb-3`} data-host-issues={String(result.server.id)}>
      <div className="d-flex justify-content-between align-items-center">
        <strong>{result.data?.hostname || result.server.hostname}</strong>
        {reboot ? (
          <span className="badge text-bg-warning d-inline-flex align-items-center gap-1">
            <FaRotate aria-hidden="true" />
            <span>{t('dashboard.healthModal.rebootRequiredBadge')}</span>
          </span>
        ) : null}
      </div>
      <ul className="mt-2 mb-0">
        {issues.map(issue => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
};

HealthIssueCard.propTypes = {
  result: PropTypes.shape({
    server: PropTypes.object.isRequired,
    success: PropTypes.bool.isRequired,
    data: PropTypes.object,
    error: PropTypes.string,
    healthData: PropTypes.object,
  }).isRequired,
};

/**
 * The health dialog of the dashboard, a list dialog of the pages
 * contract: one card a host that carries an issue, hyperweaver-ui's,
 * the connection that failed, a high load, low memory, a reboot owed
 * with its reasons and its age, and the faults with their severity,
 * every source the summary counts.
 */
const DashboardHealthModal = ({ results, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('dashboard.healthModal.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="health-issues">
        {results.filter(isUnhealthy).map(result => (
          <HealthIssueCard key={String(result.server.id)} result={result} />
        ))}
      </Modal.Body>
    </Modal>
  );
};

DashboardHealthModal.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DashboardHealthModal;
