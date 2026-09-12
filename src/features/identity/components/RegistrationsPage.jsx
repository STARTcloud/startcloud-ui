import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import Pager from '../../../components/common/Pager';
import SubTable from '../../../components/common/SubTable';
import { registrations } from '../api/activity';
import { useActivityPage } from '../hooks/useActivityPage';
import { useListSearch } from '../hooks/useListSearch';
import { REGISTRATIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_registrations';

const rowKey = row => `${row.timestamp}:${row.username}`;

const YesNo = (value, ctx) => (
  <span className={`badge ${value ? 'bg-success' : 'bg-warning text-dark'}`}>
    {value ? ctx.t('yes') : ctx.t('no')}
  </span>
);

const columns = [
  {
    key: 'timestamp',
    labelKey: 'admin.activity.time',
    sortValue: row => new Date(row.timestamp || 0).getTime(),
    render: row => <DateCell value={row.timestamp} />,
  },
  {
    key: 'username',
    labelKey: 'admin.activity.username',
    sortValue: row => row.username.toLowerCase(),
    render: row => <strong>{row.username}</strong>,
  },
  {
    key: 'email_verified',
    labelKey: 'admin.activity.registrations.emailVerified',
    sortValue: row => (row.email_verified ? 0 : 1),
    render: (row, ctx) => YesNo(row.email_verified, ctx),
  },
  {
    key: 'phone_verified',
    labelKey: 'admin.activity.registrations.phoneVerified',
    sortValue: row => (row.phone_verified ? 0 : 1),
    render: (row, ctx) => YesNo(row.phone_verified, ctx),
  },
  {
    key: 'ip_address',
    labelKey: 'admin.activity.address',
    render: row => <code>{row.ip_address}</code>,
  },
  {
    key: 'location',
    labelKey: 'admin.activity.location',
    sortValue: row => `${row.country || ''} ${row.city || ''}`.toLowerCase(),
    render: row => [row.city, row.country].filter(Boolean).join(', '),
  },
];

const groupsOf = ({ state, t }) => [
  {
    kind: 'date-range',
    key: 'range',
    label: t('admin.activity.dateRange'),
    value: { start: state.applied.start_date, end: state.applied.end_date },
    onChange: state.setRange,
    startLabel: t('admin.activity.startDate'),
    endLabel: t('admin.activity.endDate'),
  },
];

const narrowed = applied => Object.values(applied).some(value => value !== '');

/**
 * Activity › Registrations: the same narrowing as Logins without Show
 * only, the username query as `username` and the `date-range` group as
 * `start_date` and `end_date` in the navbar module, every filter in the
 * URL, Export the panel's action over the same parameters, the Columns
 * group under `table_prefs_admin_registrations`, the columns headed
 * Email verified and Phone verified over their Yes and No, and the pager.
 */
const RegistrationsPage = () => {
  const { t, i18n } = useTranslation();
  const state = useActivityPage({
    read: registrations,
    example: REGISTRATIONS,
    exportName: 'registrations',
  });
  const rows = useMemo(() => state.data?.items || [], [state.data]);
  const search = useListSearch({
    query: state.query,
    onQueryChange: state.setQuery,
    placeholderKey: 'admin.activity.registrations.search',
    groups: groupsOf({ state, t }),
    onClearFilters: state.clear,
    action: {
      key: 'export',
      labelKey: 'admin.activity.export',
      icon: FaDownload,
      onRun: state.doExport,
    },
    matched: state.data?.total || 0,
    rows,
    columns,
    prefsKey: PREFS_KEY,
  });

  useEffect(() => {
    document.title = t('admin.activity.registrations.title');
  }, [t]);

  return (
    <div>
      {state.loading && !state.data ? (
        <AdminLoading />
      ) : (
        <TableWrap>
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={rowKey}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            ctx={{ t, language: i18n.language }}
            emptyText={narrowed(state.applied) ? t('pages.noMatches') : t('pages.empty')}
          />
        </TableWrap>
      )}
      {state.data ? (
        <Pager
          page={state.data.page || 0}
          totalPages={state.data.total_pages || 0}
          total={state.data.total || 0}
          size={state.data.size || 0}
          onChange={state.setPage}
        />
      ) : null}
    </div>
  );
};

export default RegistrationsPage;
