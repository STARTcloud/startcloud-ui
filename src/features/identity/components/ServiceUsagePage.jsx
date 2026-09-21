import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDesktop, FaKey } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import { useCssVar } from '../../../hooks/useCssVar';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { sortItems } from '../../../utils/sort';
import { serviceUsage } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { SERVICE_USAGE } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const PREFS_KEY = 'table_prefs_admin_service_usage';

const percentOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const UsageBar = ({ percent }) => {
  const bar = useRef(null);
  useCssVar(bar, '--progress-width', `${percent}%`);
  return <span ref={bar} className="progress-bar progress-fill" />;
};

UsageBar.propTypes = {
  percent: PropTypes.number.isRequired,
};

const shareOf = (row, ctx) => percentOf(row.active_sessions, ctx.totalSessions);

const columns = [
  {
    key: 'client',
    kind: 'name',
    labelKey: 'admin.health.usage.service',
    value: row => row.client_name,
    render: row => (
      <span>
        <strong>{row.client_name}</strong>
        <br />
        <code className="small">{row.client_id}</code>
      </span>
    ),
  },
  {
    key: 'active_sessions',
    kind: 'count',
    labelKey: 'admin.health.usage.active',
    className: 'text-end',
    value: row => row.active_sessions,
    render: row => <span className="badge bg-secondary">{row.active_sessions}</span>,
  },
  {
    key: 'total_authorizations',
    kind: 'count',
    labelKey: 'admin.health.usage.authorizations',
    className: 'text-end',
    value: row => row.total_authorizations,
  },
  {
    key: 'unique_users',
    kind: 'count',
    labelKey: 'admin.health.usage.users',
    className: 'text-end',
    value: row => row.unique_users,
  },
  {
    key: 'usage',
    kind: 'text',
    labelKey: 'admin.health.usage.share',
    value: shareOf,
    render: (row, ctx) => {
      const percent = shareOf(row, ctx);
      return (
        <span className="d-block">
          <span className="progress usage-bar" aria-hidden="true">
            <UsageBar percent={percent} />
          </span>
          <span className="small text-muted">{percent.toFixed(1)}%</span>
        </span>
      );
    },
  },
  {
    key: 'first_used_at',
    kind: 'date',
    labelKey: 'admin.health.usage.firstUsed',
    value: row => new Date(row.first_used_at || 0).getTime(),
    render: row => <DateCell value={row.first_used_at} />,
  },
  {
    key: 'last_used_at',
    kind: 'date',
    labelKey: 'admin.health.usage.lastUsed',
    value: row => new Date(row.last_used_at || 0).getTime(),
    render: row => <DateCell value={row.last_used_at} />,
  },
];

/**
 * Health › Service usage: the two usage stat cards, the usage table with
 * the percentage bar, first used and last activity per row, every column
 * sorting by what its cell shows, its sort,
 * hidden columns and column widths under `table_prefs_admin_service_usage`,
 * and the definitions in an info fold on the page.
 */
const ServiceUsagePage = () => {
  const { t, i18n } = useTranslation();
  const { data, loading } = useAdminRead({ read: serviceUsage, example: SERVICE_USAGE });
  const prefs = useTablePrefs(PREFS_KEY, columns);

  useEffect(() => {
    document.title = t('admin.health.usage.title');
  }, [t]);

  if (loading || !data) {
    return <AdminLoading />;
  }

  const ctx = { t, language: i18n.language, totalSessions: data.total_sessions };

  return (
    <div>
      <SectionHeading title={t('admin.health.usage.title')} />
      <div className="stat-grid stat-grid-2 mb-3">
        <StatCard
          icon={<FaDesktop />}
          count={data.total_sessions}
          label={t('admin.health.usage.totalSessions')}
        />
        <StatCard
          icon={<FaKey />}
          count={data.total_authorizations}
          label={t('admin.health.usage.totalAuthorizations')}
        />
      </div>
      <SubTable
        columns={columns}
        rows={sortItems(data.items || [], prefs.sort, columns, ctx)}
        rowKey={row => row.client_id}
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={ctx}
        emptyText={t('pages.empty')}
      />
      <details className="mt-3">
        <summary>{t('admin.health.definitions')}</summary>
        <dl className="row mt-2 mb-0 small">
          <dt className="col-sm-3">{t('admin.health.usage.active')}</dt>
          <dd className="col-sm-9">{t('admin.health.usage.define.active')}</dd>
          <dt className="col-sm-3">{t('admin.health.usage.authorizations')}</dt>
          <dd className="col-sm-9">{t('admin.health.usage.define.authorizations')}</dd>
          <dt className="col-sm-3">{t('admin.health.usage.users')}</dt>
          <dd className="col-sm-9">{t('admin.health.usage.define.users')}</dd>
          <dt className="col-sm-3">{t('admin.health.usage.share')}</dt>
          <dd className="col-sm-9">{t('admin.health.usage.define.share')}</dd>
        </dl>
      </details>
    </div>
  );
};

export default ServiceUsagePage;
