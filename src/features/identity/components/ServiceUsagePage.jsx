import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDesktop, FaKey } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import { dayOf } from '../../../hooks/useClientFilters';
import { useCssVar } from '../../../hooks/useCssVar';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { serviceUsage } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { SERVICE_USAGE } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const PREFS_KEY = 'table_prefs_admin_service_usage';
const DEFAULT_SORT = [{ column: 'client', direction: 'asc' }];
const NO_ROWS = [];

const percentOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const matches = (row, needle) =>
  [row.client_name || '', row.client_id || ''].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    kind: 'date-range',
    key: 'first_used_at',
    labelKey: 'admin.health.usage.firstUsed',
    values: row => [dayOf(row.first_used_at)],
  },
  {
    kind: 'date-range',
    key: 'last_used_at',
    labelKey: 'admin.health.usage.lastUsed',
    values: row => [dayOf(row.last_used_at)],
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

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
 * sorting by what its cell shows; its search bound to the navbar box over
 * the service's name and id, the query mirrored in the URL as `search`
 * through `useUrlNarrowing`, the First used and Last used `date-range`
 * groups narrowing the rows client-side with their ranges in the URL as
 * `first_used_at` and `last_used_at`, and the Columns group, the sort,
 * hidden columns and column widths under `table_prefs_admin_service_usage`
 * through `useDetailSearch`; and the definitions in an info fold on the
 * page.
 */
const ServiceUsagePage = () => {
  const { t, i18n } = useTranslation();
  const { data, loading } = useAdminRead({ read: serviceUsage, example: SERVICE_USAGE });
  const rows = useMemo(() => data?.items || NO_ROWS, [data]);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const ctx = { t, language: i18n.language, totalSessions: data?.total_sessions || 0 };
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.health.usage.search',
    columns,
    ctx,
    prefsKey: PREFS_KEY,
    filterGroups: FILTER_GROUPS,
    url,
    bound: {
      query: url.query,
      onQueryChange: url.setQuery,
      placeholder: t('admin.health.usage.search'),
    },
    defaultSort: DEFAULT_SORT,
  });

  useEffect(() => {
    document.title = t('admin.health.usage.title');
  }, [t]);

  if (loading || !data) {
    return <AdminLoading />;
  }

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
        rows={search.rows}
        rowKey={row => row.client_id}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
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
