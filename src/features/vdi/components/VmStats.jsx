import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { eventDisplay } from '../utils/eventTypes';

const STATUS_CLASSES = {
  healthy: 'text-success',
  cifs_broken: 'text-danger',
  icons_missing: 'text-warning',
  stale: 'text-warning',
  no_user: 'text-primary',
  unknown: 'text-primary',
};

const scoreClass = score => {
  if (score >= 90) {
    return 'text-success';
  }
  return score >= 70 ? 'text-warning' : 'text-danger';
};

const StatBox = ({ value, label, className }) => (
  <div className="col">
    <div className="card h-100 text-center">
      <div className="card-body">
        <div className={`fs-4 fw-bold ${className}`}>{value}</div>
        <div className="small text-body-secondary">{label}</div>
      </div>
    </div>
  </div>
);

StatBox.propTypes = {
  value: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
};

/**
 * The statistics of one VM over the history window: the health score,
 * the live status, the check-ins, problems and recoveries, then the
 * count per event type.
 */
const VmStats = ({ stats, loading }) => {
  const { t } = useTranslation();
  if (loading || !stats) {
    return <div className="text-body-secondary">{t('vdi.stats.loading')}</div>;
  }
  const status = STATUS_CLASSES[stats.current_status] ? stats.current_status : 'unknown';
  const types = Object.entries(stats.event_counts_by_type || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="row row-cols-2 row-cols-md-5 g-2 mb-3">
        <StatBox
          value={`${stats.health_score}%`}
          label={t('vdi.stats.healthScore')}
          className={scoreClass(stats.health_score)}
        />
        <StatBox
          value={t(`vdi.status.${status}`)}
          label={t('vdi.stats.currentStatus')}
          className={STATUS_CLASSES[status]}
        />
        <StatBox
          value={stats.total_checkins}
          label={t('vdi.stats.checkins')}
          className="text-primary"
        />
        <StatBox
          value={stats.problem_count}
          label={t('vdi.stats.problems')}
          className={stats.problem_count > 0 ? 'text-danger' : 'text-success'}
        />
        <StatBox
          value={stats.recovery_count}
          label={t('vdi.stats.recoveries')}
          className={stats.recovery_count > 0 ? 'text-success' : 'text-primary'}
        />
      </div>
      {types.length > 0 ? (
        <div>
          <h6>{t('vdi.stats.breakdown')}</h6>
          <ul className="list-unstyled mb-0 small">
            {types.map(([type, count]) => {
              const { Icon, className, label } = eventDisplay(type, t);
              return (
                <li key={type} className="d-flex align-items-center gap-2 mb-1">
                  <Icon className={className} aria-hidden />
                  {label}: <strong>{count}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

VmStats.propTypes = {
  stats: PropTypes.shape({
    health_score: PropTypes.number,
    current_status: PropTypes.string,
    total_checkins: PropTypes.number,
    problem_count: PropTypes.number,
    recovery_count: PropTypes.number,
    event_counts_by_type: PropTypes.object,
  }),
  loading: PropTypes.bool.isRequired,
};

export default VmStats;
