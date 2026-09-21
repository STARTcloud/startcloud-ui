import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import Pager from '../../../components/common/Pager';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useListSearch } from '../../../hooks/useListSearch';
import { readDetailPrefs } from '../../../utils/prefs';
import { registrations } from '../api/activity';
import { useActivityPage } from '../hooks/useActivityPage';
import { REGISTRATIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const PREFS_KEY = 'table_prefs_admin_registrations';

const rowKey = row => `${row.timestamp}:${row.username}`;

const yesNo = (value, ctx) => ctx.t(value ? 'yes' : 'no');

const YesNo = (value, ctx) => (
  <span className={`badge ${value ? 'bg-success' : 'bg-warning text-dark'}`}>
    {yesNo(value, ctx)}
  </span>
);

const verifiedColumn = (key, labelKey) => ({
  key,
  kind: 'badge',
  labelKey,
  value: (row, ctx) => yesNo(row[key], ctx),
  render: (row, ctx) => YesNo(row[key], ctx),
});

const columns = [
  {
    key: 'username',
    kind: 'name',
    labelKey: 'admin.activity.username',
    value: row => row.username,
    render: row => <strong>{row.username}</strong>,
  },
  {
    key: 'timestamp',
    kind: 'date',
    labelKey: 'admin.activity.time',
    value: row => new Date(row.timestamp || 0).getTime(),
    render: row => <DateCell value={row.timestamp} />,
  },
  verifiedColumn('email_verified', 'admin.activity.registrations.emailVerified'),
  verifiedColumn('phone_verified', 'admin.activity.registrations.phoneVerified'),
  {
    key: 'ip_address',
    kind: 'text',
    labelKey: 'admin.activity.address',
    value: row => row.ip_address || '',
    render: row => <code>{row.ip_address}</code>,
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'admin.activity.location',
    value: row => [row.city, row.country].filter(Boolean).join(', '),
  },
];

const verifiedGroup = (key, labelKey) => ({
  key,
  labelKey,
  values: row => (row[key] ? ['verified'] : []),
  activeClass: 'bg-success',
  labelFor: (value, t) => t(`admin.activity.registrations.${value}`),
});

const CLIENT_GROUPS = [
  verifiedGroup('email_verified', 'admin.activity.registrations.emailVerified'),
  verifiedGroup('phone_verified', 'admin.activity.registrations.phoneVerified'),
];
const CLIENT_KEYS = CLIENT_GROUPS.map(group => group.key);

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

/**
 * Activity › Registrations: the same narrowing as Logins without Show
 * only, the username query as `username` and the `date-range` group as
 * `start_date` and `end_date` in the navbar module, the query and every
 * filter in the URL through `useUrlNarrowing`, the Email verified and
 * Phone verified `toggle` groups, one pill each, narrowing the loaded
 * rows client-side since the list names no parameter for them, their
 * values in the URL as `email_verified` and `phone_verified` and never
 * sent to the list, Export
 * the panel's action over the list's parameters, the Per page and Columns
 * groups under `table_prefs_admin_registrations`, the page reset to 0 on
 * a size change, the table with the username first and the columns headed
 * Email verified and Phone verified over their Yes and No, every column
 * sorting by what its cell shows, and the pager as the section's foot.
 */
const RegistrationsPage = () => {
  const { t, i18n } = useTranslation();
  const [size, setSize] = useState(() => readDetailPrefs(PREFS_KEY, columns).size);
  const state = useActivityPage({
    read: registrations,
    example: REGISTRATIONS,
    exportName: 'registrations',
    clientKeys: CLIENT_KEYS,
    size,
  });
  const rows = useMemo(() => state.data?.items || [], [state.data]);
  const ctx = { t, language: i18n.language };
  const search = useListSearch({
    query: state.query,
    onQueryChange: state.setQuery,
    placeholderKey: 'admin.activity.registrations.search',
    groups: groupsOf({ state, t }),
    clientGroups: CLIENT_GROUPS,
    url: { applied: state.applied, setFilter: state.setFilter, clearFilters: state.clear },
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
    ctx,
    prefsKey: PREFS_KEY,
  });

  if (size !== search.size) {
    setSize(search.size);
  }

  useEffect(() => {
    document.title = t('admin.activity.registrations.title');
  }, [t]);

  return (
    <div className="page-column">
      <SectionHeading
        title={t('admin.activity.registrations.title')}
        count={state.data ? state.data.total || 0 : null}
      />
      {state.loading && !state.data ? (
        <AdminLoading />
      ) : (
        <SubTable
          columns={columns}
          rows={search.rows}
          rowKey={rowKey}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={
            Object.keys(state.narrowed).length > 0 ? t('pages.noMatches') : t('pages.empty')
          }
        />
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
