import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDesktop, FaKey } from 'react-icons/fa6';

import StatCard from '../../../components/common/StatCard';
import SubTable from '../../catalog/components/SubTable';
import { serviceUsage } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { SERVICE_USAGE } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const NO_SORT = [];
const NO_HIDDEN = new Set();
const noSort = () => undefined;

const percentOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const columns = [
  {
    key: 'client',
    labelKey: 'admin.health.usage.service',
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
    labelKey: 'admin.health.usage.active',
    className: 'text-end',
    render: row => <span className="badge bg-secondary">{row.active_sessions}</span>,
  },
  {
    key: 'total_authorizations',
    labelKey: 'admin.health.usage.authorizations',
    className: 'text-end',
    render: row => row.total_authorizations,
  },
  {
    key: 'unique_users',
    labelKey: 'admin.health.usage.users',
    className: 'text-end',
    render: row => row.unique_users,
  },
  {
    key: 'usage',
    labelKey: 'admin.health.usage.share',
    render: (row, ctx) => {
      const percent = percentOf(row.active_sessions, ctx.totalSessions);
      return (
        <span className="d-block">
          <span className="progress usage-bar" aria-hidden="true">
            <span className="progress-bar" style={{ width: `${percent}%` }} />
          </span>
          <span className="small text-muted">{percent.toFixed(1)}%</span>
        </span>
      );
    },
  },
  {
    key: 'first_used_at',
    labelKey: 'admin.health.usage.firstUsed',
    render: row => <DateCell value={row.first_used_at} />,
  },
  {
    key: 'last_used_at',
    labelKey: 'admin.health.usage.lastUsed',
    render: row => <DateCell value={row.last_used_at} />,
  },
];

/**
 * Health › Service usage: the two usage stat cards, the usage table with
 * the percentage bar, first used and last activity per row, and the
 * definitions in an info fold on the page.
 */
const ServiceUsagePage = () => {
  const { t, i18n } = useTranslation();
  const { data, loading } = useAdminRead({ read: serviceUsage, example: SERVICE_USAGE });

  useEffect(() => {
    document.title = t('admin.health.usage.title');
  }, [t]);

  if (loading || !data) {
    return <AdminLoading />;
  }

  return (
    <div>
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
      <TableWrap>
        <SubTable
          columns={columns}
          rows={data.items || []}
          rowKey={row => row.client_id}
          sort={NO_SORT}
          onSort={noSort}
          hiddenColumns={NO_HIDDEN}
          ctx={{ t, language: i18n.language, totalSessions: data.total_sessions }}
          emptyText={t('pages.empty')}
        />
      </TableWrap>
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
