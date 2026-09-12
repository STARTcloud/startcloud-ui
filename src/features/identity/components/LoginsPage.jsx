import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import Pager from '../../../components/common/Pager';
import SubTable from '../../../components/common/SubTable';
import { logins } from '../api/activity';
import { useActivityPage } from '../hooks/useActivityPage';
import { useListSearch } from '../hooks/useListSearch';
import { LOGINS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_logins';

const rowKey = row => `${row.timestamp}:${row.username}:${row.ip_address}`;

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
  {
    kind: 'select',
    key: 'success',
    label: t('admin.activity.logins.showOnly'),
    entries: { false: null, true: null },
    activeSet: new Set(state.applied.success ? [state.applied.success] : []),
    activeClass: 'bg-primary',
    labelFor: value =>
      value === 'true'
        ? t('admin.activity.logins.successOnly')
        : t('admin.activity.logins.failedOnly'),
    onToggle: value => state.setFilter('success', state.applied.success === value ? '' : value),
  },
];

/**
 * Activity › Logins: every narrowing in the navbar module and its panel,
 * the username query as the list's `username` parameter once it settles,
 * the `date-range` group as `start_date` and `end_date`, Show only as a
 * `select` group sent as `success`, the query and every filter in the URL
 * through `useUrlNarrowing` so the Dashboard's cards and a search hit
 * land on a preset and each change re-reading page 1,
 * Export the panel's action over the same parameters, and the Columns
 * group under `table_prefs_admin_logins`; the table with its Reason
 * column for a failed row, and the pager.
 */
const LoginsPage = () => {
  const { t, i18n } = useTranslation();
  const state = useActivityPage({ read: logins, example: LOGINS, exportName: 'logins' });
  const rows = useMemo(() => state.data?.items || [], [state.data]);
  const search = useListSearch({
    query: state.query,
    onQueryChange: state.setQuery,
    placeholderKey: 'admin.activity.logins.search',
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
    document.title = t('admin.activity.logins.title');
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
            emptyText={
              Object.keys(state.narrowed).length > 0 ? t('pages.noMatches') : t('pages.empty')
            }
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
