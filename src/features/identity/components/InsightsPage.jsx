import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCloud,
  FaEnvelopeCircleCheck,
  FaHourglassHalf,
  FaKey,
  FaLink,
  FaMobileScreen,
  FaShieldHalved,
  FaUserCheck,
  FaUserClock,
  FaUserShield,
  FaUserSlash,
  FaUsers,
} from 'react-icons/fa6';

import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import { useCssVar } from '../../../hooks/useCssVar';
import { insights } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { useInsightsSearch } from '../hooks/useInsightsSearch';
import { INSIGHTS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_insights';

const ACTIVE_KEYS = ['daily', 'weekly', 'monthly', 'quarterly'];
const POSTURE_KEYS = [
  'disabled_users',
  'using_2fa',
  'email_verified',
  'phone_verified',
  'admins',
  'never_logged_in',
  'with_local_auth',
  'with_external_auth',
  'with_linked_provider',
];
const CHURN_KEYS = ['quiet_30', 'quiet_60', 'quiet_90', 'enabled_total'];
const CARDS = {
  enabled_total: { Icon: FaUsers, tone: 'primary' },
  disabled_users: { Icon: FaUserSlash, tone: 'danger' },
  using_2fa: { Icon: FaShieldHalved, tone: 'success' },
  email_verified: { Icon: FaEnvelopeCircleCheck, tone: 'success' },
  phone_verified: { Icon: FaMobileScreen, tone: 'success' },
  admins: { Icon: FaUserShield, tone: 'warning' },
  never_logged_in: { Icon: FaUserClock, tone: 'secondary' },
  with_local_auth: { Icon: FaKey, tone: 'primary' },
  with_external_auth: { Icon: FaCloud, tone: 'info' },
  with_linked_provider: { Icon: FaLink, tone: 'info' },
  quiet_30: { Icon: FaHourglassHalf, tone: 'warning' },
  quiet_60: { Icon: FaHourglassHalf, tone: 'warning' },
  quiet_90: { Icon: FaHourglassHalf, tone: 'danger' },
};
const ACTIVE_CARD = { Icon: FaUserCheck, tone: 'primary' };
const CHURN_TOTAL_CARD = { Icon: FaUsers, tone: 'success' };
const FOLDED = [
  'active_users',
  'posture',
  'app_activity',
  'penetration',
  'app_pairs',
  'growth',
  'org_rollup',
];

const labelOf = key => `admin.health.insights.columns.${key}`;

const text = key => ({
  key,
  labelKey: labelOf(key),
  sortValue: row => String(row[key] ?? '').toLowerCase(),
  render: row => row[key] ?? '',
});
const number = key => ({
  key,
  labelKey: labelOf(key),
  className: 'text-end',
  sortValue: row => row[key] ?? 0,
  render: row => row[key] ?? 0,
});
const date = key => ({
  key,
  labelKey: labelOf(key),
  sortValue: row => new Date(row[key] || 0).getTime(),
  render: row => <DateCell value={row[key]} />,
});
const yesNo = key => ({
  key,
  labelKey: labelOf(key),
  sortValue: row => (row[key] ? 0 : 1),
  render: (row, ctx) => (row[key] ? ctx.t('yes') : ctx.t('no')),
});

const table = (key, columns, defaultSort) => ({
  key,
  labelKey: `admin.health.insights.${key}`,
  columns,
  defaultSort,
  filterGroups: [],
  defaultView: 'table',
});

const TABLES = [
  table(
    'app_activity',
    [text('client_name'), number('active_30d'), number('adopted_30d'), number('total_users')],
    [{ column: 'active_30d', direction: 'desc' }]
  ),
  table(
    'penetration',
    [number('app_count'), number('users')],
    [{ column: 'app_count', direction: 'asc' }]
  ),
  table(
    'app_pairs',
    [text('app_a'), text('app_b'), number('users')],
    [{ column: 'users', direction: 'desc' }]
  ),
  table(
    'quiet_users',
    [text('username'), date('last_login_at')],
    [{ column: 'last_login_at', direction: 'asc' }]
  ),
  table(
    'org_rollup',
    [text('name'), text('customer_id'), yesNo('personal'), number('members'), number('active_30d')],
    [{ column: 'members', direction: 'desc' }]
  ),
];

const ROW_KEYS = {
  app_activity: row => row.client_id,
  penetration: row => String(row.app_count),
  app_pairs: row => `${row.app_a}:${row.app_b}`,
  quiet_users: row => row.username,
  org_rollup: row => row.name,
};

const rowsOf = (data, key) => (Array.isArray(data[key]) ? data[key] : []);

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h5 className="text-uppercase small text-muted mb-2">{title}</h5>
    {children}
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const InsightCard = ({ card, count, label }) => (
  <StatCard icon={<card.Icon />} tone={card.tone} count={count} label={label} />
);

InsightCard.propTypes = {
  card: PropTypes.shape({
    Icon: PropTypes.elementType.isRequired,
    tone: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
};

const InsightTable = ({ tableKey, search }) => {
  const { t, i18n } = useTranslation();
  const spec = TABLES.find(entry => entry.key === tableKey);
  return (
    <TableWrap>
      <SubTable
        columns={spec.columns}
        rows={search.rows[tableKey]}
        rowKey={ROW_KEYS[tableKey]}
        sort={search.sort[tableKey]}
        onSort={(column, options) => search.setSort(tableKey, column, options)}
        hiddenColumns={search.hiddenColumns[tableKey]}
        ctx={{ t, language: i18n.language }}
        emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
      />
    </TableWrap>
  );
};

InsightTable.propTypes = {
  tableKey: PropTypes.string.isRequired,
  search: PropTypes.shape({
    rows: PropTypes.object.isRequired,
    filtering: PropTypes.bool.isRequired,
    sort: PropTypes.object.isRequired,
    setSort: PropTypes.func.isRequired,
    hiddenColumns: PropTypes.object.isRequired,
  }).isRequired,
};

const GrowthBar = ({ percent }) => {
  const bar = useRef(null);
  useCssVar(bar, '--growth-height', `${percent}%`);
  return <span ref={bar} className="growth-bar" />;
};

GrowthBar.propTypes = {
  percent: PropTypes.number.isRequired,
};

const GrowthChart = ({ rows }) => {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <div className="text-muted small">{t('pages.empty')}</div>;
  }
  const peak = Math.max(...rows.map(row => row.count || 0), 1);
  return (
    <div className="growth-chart" role="img" aria-label={t('admin.health.insights.growth')}>
      {rows.map(row => (
        <div
          key={row.week}
          className="growth-col"
          title={`${row.week}: ${t('admin.health.insights.growthCount', { count: row.count || 0 })}`}
        >
          <span className="growth-count">{row.count ?? 0}</span>
          <span className="growth-track">
            <GrowthBar percent={((row.count || 0) / peak) * 100} />
          </span>
          <span className="growth-week">{row.week}</span>
        </div>
      ))}
    </div>
  );
};

GrowthChart.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({ week: PropTypes.string.isRequired, count: PropTypes.number })
  ).isRequired,
};

const Definition = ({ term, body }) => (
  <>
    <dt className="col-sm-3">{term}</dt>
    <dd className="col-sm-9">{body}</dd>
  </>
);

Definition.propTypes = {
  term: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
};

/**
 * Health › Insights over the members of the insights read: the active-user
 * and security-posture figures as `StatCard`s; app activity, apps per user,
 * top combinations and the organizations rollup as sorted `SubTable`s with
 * header sort, the navbar search bound for a query over their rows and one
 * Columns group per table under `table_prefs_admin_insights`; registrations
 * per week as a bar chart drawn from `growth[]`; the churn cards and the
 * quietest accounts beside their definitions; every instant in the one
 * admin date format; the remaining definitions in an info fold.
 */
const InsightsPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useAdminRead({ read: insights, example: INSIGHTS });
  const rowsByTable = useMemo(
    () => Object.fromEntries(TABLES.map(entry => [entry.key, rowsOf(data || {}, entry.key)])),
    [data]
  );
  const search = useInsightsSearch({
    tables: TABLES,
    rowsByTable,
    placeholderKey: 'admin.health.insights.search',
    prefsKey: PREFS_KEY,
  });

  useEffect(() => {
    document.title = t('admin.health.insights.title');
  }, [t]);

  if (loading || !data) {
    return <AdminLoading />;
  }

  const active = data.active_users || {};
  const posture = data.posture || {};
  const churn = data.churn || {};

  return (
    <div>
      <Section title={t('admin.health.insights.activeUsers')}>
        <div className="stat-grid stat-grid-4">
          {ACTIVE_KEYS.map(key => (
            <InsightCard
              key={key}
              card={ACTIVE_CARD}
              count={active[key] ?? 0}
              label={t(`admin.health.insights.active.${key}`)}
            />
          ))}
        </div>
      </Section>
      <Section title={t('admin.health.insights.posture')}>
        <div className="stat-grid stat-grid-3">
          <InsightCard
            card={CARDS.enabled_total}
            count={`${posture.enabled_users ?? 0} / ${posture.total_users ?? 0}`}
            label={t('admin.health.insights.postureOf.enabled_total')}
          />
          {POSTURE_KEYS.map(key => (
            <InsightCard
              key={key}
              card={CARDS[key]}
              count={posture[key] ?? 0}
              label={t(`admin.health.insights.postureOf.${key}`)}
            />
          ))}
        </div>
      </Section>
      <Section title={t('admin.health.insights.app_activity')}>
        <InsightTable tableKey="app_activity" search={search} />
      </Section>
      <div className="row">
        <div className="col-lg-6">
          <Section title={t('admin.health.insights.penetration')}>
            <InsightTable tableKey="penetration" search={search} />
          </Section>
        </div>
        <div className="col-lg-6">
          <Section title={t('admin.health.insights.app_pairs')}>
            <InsightTable tableKey="app_pairs" search={search} />
          </Section>
        </div>
      </div>
      <Section title={t('admin.health.insights.growth')}>
        <GrowthChart rows={rowsOf(data, 'growth')} />
      </Section>
      <Section title={t('admin.health.insights.churn')}>
        <div className="row">
          <div className="col-lg-8">
            <div className="stat-grid stat-grid-4 mb-3">
              {CHURN_KEYS.map(key => (
                <InsightCard
                  key={key}
                  card={CARDS[key] || CHURN_TOTAL_CARD}
                  count={churn[key] ?? 0}
                  label={t(`admin.health.insights.churnOf.${key}`)}
                />
              ))}
            </div>
            <h6 className="small text-muted mb-2">{t('admin.health.insights.quiet_users')}</h6>
            <InsightTable tableKey="quiet_users" search={search} />
          </div>
          <div className="col-lg-4">
            <dl className="row small mb-0">
              <Definition
                term={t('admin.health.insights.churn')}
                body={t('admin.health.insights.define.churn')}
              />
              <Definition
                term={t('admin.health.insights.quiet_users')}
                body={t('admin.health.insights.define.quiet_users')}
              />
            </dl>
          </div>
        </div>
      </Section>
      <Section title={t('admin.health.insights.org_rollup')}>
        <InsightTable tableKey="org_rollup" search={search} />
      </Section>
      <details>
        <summary>{t('admin.health.definitions')}</summary>
        <dl className="row mt-2 mb-0 small">
          {FOLDED.map(key => (
            <Definition
              key={key}
              term={t(`admin.health.insights.${key}`)}
              body={t(`admin.health.insights.define.${key}`)}
            />
          ))}
        </dl>
      </details>
    </div>
  );
};

export default InsightsPage;
