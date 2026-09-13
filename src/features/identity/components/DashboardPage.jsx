import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDesktop,
  FaMapLocationDot,
  FaRightToBracket,
  FaTriangleExclamation,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import RestartCard from '../../../components/common/RestartCard';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import { useGuard } from '../../../contexts/GuardContext';
import { useFolds } from '../../../hooks/useFolds';
import { loginHeatmap, restart, restartStatus, stats } from '../api/overview';
import { useAdminRead } from '../hooks/useAdminRead';
import { HEATMAP, STATS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const LoginMap = lazy(() => import('./LoginMap'));

const MAP_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const PREFS_KEY = 'table_prefs_admin_dashboard';

const MapCard = ({ folds }) => {
  const { t } = useTranslation();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const { data, loading } = useAdminRead({
    read: () => loginHeatmap(days),
    example: HEATMAP,
    key: String(days),
  });
  const dayButtons = (
    <div className="btn-group btn-group-sm" role="group" aria-label={t('admin.dashboard.map.days')}>
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
  );
  return (
    <SectionCard
      icon={<FaMapLocationDot aria-hidden />}
      title={t('admin.dashboard.map.title')}
      actions={dayButtons}
      folded={folds.folded('map')}
      onFold={() => folds.toggle('map')}
    >
      {loading || !data ? (
        <AdminLoading />
      ) : (
        <Suspense fallback={<AdminLoading />}>
          <LoginMap tiles={data.tiles} points={data.points || []} />
        </Suspense>
      )}
    </SectionCard>
  );
};

MapCard.propTypes = {
  folds: foldsShape.isRequired,
};

const RecentList = ({ icon, title, to, rows, renderRow }) => {
  const { t } = useTranslation();
  const viewAll = (
    <Link to={to} className="btn btn-sm btn-outline-primary">
      {t('admin.dashboard.viewAll')}
    </Link>
  );
  return (
    <div className="mb-3">
      <SectionHeading icon={icon} title={title} actions={viewAll} />
      <ul className="list-group">
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
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  renderRow: PropTypes.func.isRequired,
};

/**
 * Overview › Dashboard: the five stat cards, each a link into its entry
 * with the filter preset, the login map in a `SectionCard` over the
 * heatmap answer with its 7, 30 and 90 day buttons as the card's actions
 * and its fold under `table_prefs_admin_dashboard`, the recent logins and
 * registrations as glass lists under a `SectionHeading` carrying View all
 * (the pages contract's frame rule), and the shared `RestartCard` of the
 * config contract, fed by `restart-status` and re-read on the `admin`
 * topic's `restart-required`, its Restart behind the page's step-up guard
 * and the confirm dialog.
 */
const DashboardPage = () => {
  const { t } = useTranslation();
  const guard = useGuard();
  const folds = useFolds(PREFS_KEY);
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
      <MapCard folds={folds} />
      <div className="row">
        <div className="col-lg-6">
          <RecentList
            icon={<FaRightToBracket aria-hidden />}
            title={t('admin.dashboard.recentLogins')}
            to="/admin/logins"
            rows={data.recent_logins || []}
            renderRow={loginRow}
          />
        </div>
        <div className="col-lg-6">
          <RecentList
            icon={<FaUserPlus aria-hidden />}
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
