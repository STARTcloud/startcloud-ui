import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Pager from '../../../components/common/Pager';
import SubTable from '../../../components/common/SubTable';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { registrations } from '../api/activity';
import { useActivityPage } from '../hooks/useActivityPage';
import { REGISTRATIONS } from '../utils/examples';

import ActivityFilters from './ActivityFilters';
import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_registrations';

const rowKey = row => `${row.timestamp}:${row.username}`;

const matches = (row, needle) =>
  [row.username, row.ip_address || '', row.city || '', row.country || '']
    .join(' ')
    .toLowerCase()
    .includes(needle);

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

/**
 * Activity › Registrations: the same controls as Logins without Show
 * only, the navbar search bound for a query over the rows and the Columns
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
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.activity.registrations.search',
    columns,
    prefsKey: PREFS_KEY,
  });

  useEffect(() => {
    document.title = t('admin.activity.registrations.title');
  }, [t]);

  return (
    <div>
      <ActivityFilters
        filters={state.draft}
        onChange={state.setDraft}
        onSubmit={state.apply}
        onClear={state.clear}
        onExport={state.doExport}
        showOnly={false}
        idPrefix="registrations"
      />
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
            emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
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
