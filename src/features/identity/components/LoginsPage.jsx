import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Pager from '../../../components/common/Pager';
import SubTable from '../../../components/common/SubTable';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { logins } from '../api/activity';
import { useActivityPage } from '../hooks/useActivityPage';
import { LOGINS } from '../utils/examples';

import ActivityFilters from './ActivityFilters';
import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_logins';

const rowKey = row => `${row.timestamp}:${row.username}:${row.ip_address}`;

const matches = (row, needle) =>
  [
    row.username,
    row.ip_address || '',
    row.city || '',
    row.failure_reason || '',
    row.user_agent || '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);

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
    key: 'success',
    labelKey: 'admin.activity.logins.result',
    sortValue: row => (row.success ? 0 : 1),
    render: (row, ctx) => (
      <span className={`badge ${row.success ? 'bg-success' : 'bg-danger'}`}>
        {row.success
          ? ctx.t('admin.activity.logins.success')
          : ctx.t('admin.activity.logins.failed')}
      </span>
    ),
  },
  {
    key: 'failure_reason',
    labelKey: 'admin.activity.logins.reason',
    render: row => row.failure_reason || '',
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
  {
    key: 'user_agent',
    labelKey: 'admin.activity.device',
    defaultHidden: true,
    render: row => row.user_agent || '',
  },
];

/**
 * Activity › Logins: the presets, the `DateRange`, the username field,
 * Show only, Filter, Clear and Export on the page, every filter in the
 * URL so the Dashboard's cards land on a preset; the navbar search bound
 * for a query over the rows the page holds and the Columns group under
 * `table_prefs_admin_logins`; the table with its Reason column for a
 * failed row, and the pager.
 */
const LoginsPage = () => {
  const { t, i18n } = useTranslation();
  const state = useActivityPage({ read: logins, example: LOGINS, exportName: 'logins' });
  const rows = useMemo(() => state.data?.items || [], [state.data]);
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.activity.logins.search',
    columns,
    prefsKey: PREFS_KEY,
  });

  useEffect(() => {
    document.title = t('admin.activity.logins.title');
  }, [t]);

  return (
    <div>
      <ActivityFilters
        filters={state.draft}
        onChange={state.setDraft}
        onSubmit={state.apply}
        onClear={state.clear}
        onExport={state.doExport}
        showOnly
        idPrefix="logins"
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

export default LoginsPage;
