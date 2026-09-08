import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import StatCard from '../../../components/common/StatCard';
import { insights } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { INSIGHTS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

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
const LEAD_LISTS = ['app_activity', 'penetration', 'app_pairs', 'growth'];
const DEFINED = ['active_users', 'posture', ...LEAD_LISTS, 'churn', 'quiet_users', 'org_rollup'];

const text = key => ({ key, render: row => row[key] ?? '' });
const number = key => ({ key, className: 'text-end', render: row => row[key] ?? 0 });
const date = key => ({ key, render: row => <DateCell value={row[key]} /> });
const yesNo = key => ({
  key,
  render: (row, t) => (row[key] ? t('yes') : t('no')),
});

const LISTS = [
  {
    key: 'app_activity',
    rowKey: row => row.client_id,
    columns: [
      text('client_name'),
      number('active_30d'),
      number('adopted_30d'),
      number('total_users'),
    ],
  },
  {
    key: 'penetration',
    rowKey: row => String(row.app_count),
    columns: [number('app_count'), number('users')],
  },
  {
    key: 'app_pairs',
    rowKey: row => `${row.app_a}:${row.app_b}`,
    columns: [text('app_a'), text('app_b'), number('users')],
  },
  {
    key: 'growth',
    rowKey: row => row.week,
    columns: [text('week'), number('count')],
  },
  {
    key: 'quiet_users',
    rowKey: row => row.username,
    columns: [text('username'), date('last_login_at')],
  },
  {
    key: 'org_rollup',
    rowKey: row => row.name,
    columns: [
      text('name'),
      text('customer_id'),
      yesNo('personal'),
      number('members'),
      number('active_30d'),
    ],
  },
];

const listShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  rowKey: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      className: PropTypes.string,
      render: PropTypes.func.isRequired,
    })
  ).isRequired,
});

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

const SmallTable = ({ list, rows }) => {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <div className="text-muted small">{t('pages.empty')}</div>;
  }
  return (
    <TableWrap>
      <table className="table table-sm table-striped">
        <thead>
          <tr>
            {list.columns.map(column => (
              <th key={column.key} className={column.className || ''}>
                {t(`admin.health.insights.columns.${column.key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={list.rowKey(row)}>
              {list.columns.map(column => (
                <td key={column.key} className={column.className || ''}>
                  {column.render(row, t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
};

SmallTable.propTypes = {
  list: listShape.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const listOf = key => LISTS.find(list => list.key === key);
const rowsOf = (data, key) => (Array.isArray(data[key]) ? data[key] : []);

const ListSection = ({ listKey, data }) => {
  const { t } = useTranslation();
  return (
    <Section title={t(`admin.health.insights.${listKey}`)}>
      <SmallTable list={listOf(listKey)} rows={rowsOf(data, listKey)} />
    </Section>
  );
};

ListSection.propTypes = {
  listKey: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
};

/**
 * Health › Insights over the members of the insights read, in the
 * contract's order: the active-user and security-posture cards, then app
 * activity, apps per user, top combinations and registrations per week as
 * small tables, the churn cards with the quietest accounts inside them,
 * and the organizations rollup, their definitions in an info fold on the
 * page rather than in header tooltips.
 */
const InsightsPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useAdminRead({ read: insights, example: INSIGHTS });

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
            <StatCard
              key={key}
              count={active[key] ?? 0}
              label={t(`admin.health.insights.active.${key}`)}
            />
          ))}
        </div>
      </Section>
      <Section title={t('admin.health.insights.posture')}>
        <div className="stat-grid stat-grid-3">
          <StatCard
            count={`${posture.enabled_users ?? 0} / ${posture.total_users ?? 0}`}
            label={t('admin.health.insights.postureOf.enabled_total')}
          />
          {POSTURE_KEYS.map(key => (
            <StatCard
              key={key}
              count={posture[key] ?? 0}
              label={t(`admin.health.insights.postureOf.${key}`)}
            />
          ))}
        </div>
      </Section>
      {LEAD_LISTS.map(key => (
        <ListSection key={key} listKey={key} data={data} />
      ))}
      <Section title={t('admin.health.insights.churn')}>
        <div className="stat-grid stat-grid-4 mb-3">
          {CHURN_KEYS.map(key => (
            <StatCard
              key={key}
              count={churn[key] ?? 0}
              label={t(`admin.health.insights.churnOf.${key}`)}
            />
          ))}
        </div>
        <SmallTable list={listOf('quiet_users')} rows={rowsOf(data, 'quiet_users')} />
      </Section>
      <ListSection listKey="org_rollup" data={data} />
      <details>
        <summary>{t('admin.health.definitions')}</summary>
        <dl className="row mt-2 mb-0 small">
          {DEFINED.map(key => (
            <div key={key} className="row">
              <dt className="col-sm-3">{t(`admin.health.insights.${key}`)}</dt>
              <dd className="col-sm-9">{t(`admin.health.insights.define.${key}`)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
};

export default InsightsPage;
