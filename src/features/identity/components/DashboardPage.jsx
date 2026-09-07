import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDesktop,
  FaRightToBracket,
  FaTriangleExclamation,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import StatCard from '../../../components/common/StatCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { loginHeatmap, restart, restartStatus, stats } from '../api/overview';
import { useAdminRead } from '../hooks/useAdminRead';
import { useGuard } from '../hooks/useGuard';
import { HEATMAP, RESTART_STATUS, STATS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const LoginMap = lazy(() => import('./LoginMap'));

const MAP_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;

const RestartCard = ({ status }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [confirming, setConfirming] = useState(false);

  if (!status?.restart_required) {
    return null;
  }

  const doRestart = () => {
    guard(restart, t('admin.dashboard.restart.stepUpReason'))
      .then(() => notify('success', t('admin.dashboard.restart.started')))
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      });
  };

  return (
    <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2" role="status">
      <FaTriangleExclamation aria-hidden="true" />
      <span className="flex-grow-1">
        <strong>{t('admin.dashboard.restart.title')}</strong>{' '}
        {t('admin.dashboard.restart.body', { by: status.last_modified_by || '' })}{' '}
        <DateCell value={status.last_modified_time} />
      </span>
      <button type="button" className="btn btn-sm btn-warning" onClick={() => setConfirming(true)}>
        {t('admin.dashboard.restart.button')}
      </button>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={doRestart}
        title={t('admin.dashboard.restart.confirmTitle')}
        message={t('admin.dashboard.restart.confirmBody', { keyword: t('pages.confirm.keyword') })}
      />
    </div>
  );
};

RestartCard.propTypes = {
  status: PropTypes.shape({
    restart_required: PropTypes.bool,
    last_modified_by: PropTypes.string,
    last_modified_time: PropTypes.string,
  }),
};

const restartOf = data => ({
  restart_required: Boolean(data.required),
  last_modified_by: data.last_modified_by || null,
  last_modified_time: data.last_modified_time || null,
});

const useRestartRequired = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    restartStatus()
      .then(data => {
        if (mounted) {
          setStatus(data);
        }
      })
      .catch(error => {
        if (mounted && error.status === 404) {
          setStatus(RESTART_STATUS);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEventStream('restart-required', data => {
    if (data && typeof data === 'object') {
      setStatus(restartOf(data));
    }
  });

  return status;
};

const MapCard = () => {
  const { t } = useTranslation();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const { data, loading } = useAdminRead({
    read: () => loginHeatmap(days),
    example: HEATMAP,
    key: String(days),
  });
  return (
    <div className="card mb-3">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="mb-0">{t('admin.dashboard.map.title')}</h5>
        <div
          className="btn-group btn-group-sm"
          role="group"
          aria-label={t('admin.dashboard.map.days')}
        >
          {MAP_DAYS.map(option => (
            <button
              key={option}
              type="button"
              className={`btn ${days === option ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setDays(option)}
            >
              {t('admin.dashboard.map.daysCount', { count: option })}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        {loading || !data ? (
          <AdminLoading />
        ) : (
          <Suspense fallback={<AdminLoading />}>
            <LoginMap tiles={data.tiles} points={data.points || []} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

const RecentList = ({ title, to, rows, renderRow }) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <Link to={to} className="btn btn-sm btn-outline-primary">
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>
      <ul className="list-group list-group-flush">
        {rows.length === 0 ? (
          <li className="list-group-item text-muted">{t('pages.empty')}</li>
        ) : null}
        {rows.map(row => (
          <li
            key={`${row.username}:${row.timestamp}`}
            className="list-group-item d-flex flex-wrap justify-content-between gap-2"
          >
            {renderRow(row)}
            <DateCell value={row.timestamp} />
          </li>
        ))}
      </ul>
    </div>
  );
};

RecentList.propTypes = {
  title: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  renderRow: PropTypes.func.isRequired,
};

/**
 * Overview › Dashboard: the five stat cards, each a link into its entry
 * with the filter preset, the login map over the heatmap answer with its
 * 7, 30 and 90 day buttons, the recent logins and registrations with View
 * all, and the restart card while the `admin` topic's `restart-required`
 * says a restart is pending, after one read of `restart-status`.
 */
const DashboardPage = () => {
  const { t } = useTranslation();
  const restartState = useRestartRequired();
  const { data, loading } = useAdminRead({ read: stats, example: STATS });

  useEffect(() => {
    document.title = t('admin.dashboard.title');
  }, [t]);

  if (loading || !data) {
    return <AdminLoading />;
  }

  const loginRow = row => (
    <span>
      <span className={`badge me-2 ${row.success ? 'bg-success' : 'bg-danger'}`}>
        {row.success ? t('admin.activity.logins.success') : t('admin.activity.logins.failed')}
      </span>
      {row.username}
      <span className="text-muted ms-2 small">
        {[row.city, row.country].filter(Boolean).join(', ')}
      </span>
    </span>
  );

  const registrationRow = row => (
    <span>
      {row.username}
      <span className={`badge ms-2 ${row.email_verified ? 'bg-success' : 'bg-warning text-dark'}`}>
        {row.email_verified
          ? t('admin.activity.registrations.verified')
          : t('admin.activity.registrations.unverified')}
      </span>
    </span>
  );

  return (
    <div>
      <RestartCard status={restartState} />
      <div className="stat-grid mb-3">
        <StatCard
          icon={<FaUsers />}
          count={data.total_users}
          label={t('admin.dashboard.stats.totalUsers')}
          to="/admin/users"
        />
        <StatCard
          icon={<FaRightToBracket />}
          count={data.logins_today}
          label={t('admin.dashboard.stats.loginsToday')}
          to="/admin/logins?success=true"
        />
        <StatCard
          icon={<FaUserPlus />}
          count={data.registrations_this_week}
          label={t('admin.dashboard.stats.registrationsWeek')}
          to="/admin/registrations"
        />
        <StatCard
          icon={<FaTriangleExclamation />}
          count={data.failed_logins_today}
          label={t('admin.dashboard.stats.failedLogins')}
          to="/admin/logins?success=false"
          tone="danger"
        />
        <StatCard
          icon={<FaDesktop />}
          count={data.active_sessions}
          label={t('admin.dashboard.stats.activeSessions')}
          to="/admin/sessions"
        />
      </div>
      <MapCard />
      <div className="row">
        <div className="col-lg-6">
          <RecentList
            title={t('admin.dashboard.recentLogins')}
            to="/admin/logins"
            rows={data.recent_logins || []}
            renderRow={loginRow}
          />
        </div>
        <div className="col-lg-6">
          <RecentList
            title={t('admin.dashboard.recentRegistrations')}
            to="/admin/registrations"
            rows={data.recent_registrations || []}
            renderRow={registrationRow}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
