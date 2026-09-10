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

import RestartCard from '../../../components/common/RestartCard';
import StatCard from '../../../components/common/StatCard';
import { useGuard } from '../../../contexts/GuardContext';
import { loginHeatmap, restart, restartStatus, stats } from '../api/overview';
import { useAdminRead } from '../hooks/useAdminRead';
import { HEATMAP, STATS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const LoginMap = lazy(() => import('./LoginMap'));

const MAP_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;

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
 * all, and the shared `RestartCard` of the config contract, fed by
 * `restart-status` and re-read on the `admin` topic's `restart-required`,
 * its Restart behind the page's step-up guard and the confirm dialog.
 */
const DashboardPage = () => {
  const { t } = useTranslation();
  const guard = useGuard();
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
      <RestartCard restartStatus={restartStatus} restart={restart} guard={guard} />
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
