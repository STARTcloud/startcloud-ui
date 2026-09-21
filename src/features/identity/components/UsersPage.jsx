import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import Pager from '../../../components/common/Pager';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useListSearch } from '../../../hooks/useListSearch';
import { useSelection } from '../../../hooks/useSelection';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { useAdminRead } from '../hooks/useAdminRead';
import { USERS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import BulkBar from './BulkBar';
import {
  RowActions,
  UserDialogs,
  roleLabel,
  useUserActions,
  userColumns,
  usersAdapterShape,
} from './UserActions';
import { useRoleCatalog } from './UsersDialogs';

const PREFS_KEY = 'table_prefs_admin_users';
const PAGE_SIZE = 25;
const CLIENT_KEYS = ['roles'];
const FILTER_KEYS = ['enabled', 'using_2fa', 'has_customer_id', 'active_after', ...CLIENT_KEYS];

const listParams = values =>
  Object.fromEntries(Object.entries(values).filter(([key]) => !CLIENT_KEYS.includes(key)));

const flagSet = on => new Set(on ? ['true'] : []);

const userLink = row => (
  <Link to={`/admin/users/${encodeURIComponent(row.id)}`}>
    <strong>{row.username}</strong>
  </Link>
);

const statusGroup = ({ filters, setFilter, t }) => ({
  kind: 'select',
  key: 'enabled',
  label: t('admin.users.filter.status'),
  entries: { true: null, false: null },
  activeSet: new Set(filters.enabled ? [filters.enabled] : []),
  activeClass: 'bg-primary',
  labelFor: value =>
    value === 'true' ? t('admin.users.table.active') : t('admin.users.table.disabled'),
  onToggle: value => setFilter('enabled', filters.enabled === value ? '' : value),
});

const customerIdGroup = ({ filters, setFilter, t }) => ({
  kind: 'toggle',
  key: 'has_customer_id',
  label: t('admin.users.table.customerId'),
  entries: { true: null },
  activeSet: flagSet(filters.has_customer_id),
  activeClass: 'bg-primary',
  labelFor: () => t('admin.users.filter.customerId'),
  onToggle: () => setFilter('has_customer_id', filters.has_customer_id ? '' : 'true'),
});

const securityGroups = ({ filters, setFilter, t }) => [
  {
    kind: 'toggle',
    key: 'using_2fa',
    label: t('admin.users.table.tfa'),
    entries: { true: null },
    activeSet: flagSet(filters.using_2fa),
    activeClass: 'bg-success',
    labelFor: () => t('admin.users.filter.tfa'),
    onToggle: () => setFilter('using_2fa', filters.using_2fa ? '' : 'true'),
  },
  {
    kind: 'date-range',
    key: 'active_after',
    label: t('admin.users.filter.activeAfter'),
    value: { start: filters.active_after, end: '' },
    onChange: range => setFilter('active_after', range.start),
    startLabel: t('admin.activity.startDate'),
    endLabel: t('admin.activity.endDate'),
  },
];

const groupsOf = ({ adapter, filters, setFilter, t }) => [
  statusGroup({ filters, setFilter, t }),
  ...(adapter.rateLimit ? securityGroups({ filters, setFilter, t }) : []),
  ...(adapter.update ? [customerIdGroup({ filters, setFilter, t })] : []),
];

const rolesGroupOf = catalog => [
  {
    key: 'roles',
    labelKey: 'admin.users.table.roles',
    values: row => row.roles,
    order: catalog,
    activeClass: 'bg-secondary',
    labelFor: roleLabel,
  },
];

const serverSortOf = sort => {
  const [entry] = sort;
  return entry ? { sort: entry.column, direction: entry.direction } : {};
};

const exportAction = (adapter, narrowed) =>
  adapter.exportUrl
    ? {
        key: 'export',
        labelKey: 'admin.activity.export',
        icon: FaDownload,
        onRun: () => window.location.assign(adapter.exportUrl(narrowed)),
      }
    : null;

const BulkPane = ({ adapter, selection, rows, catalog, reload }) => {
  const { t } = useTranslation();
  if (!selection.someSelected || !adapter.bulk) {
    return null;
  }
  return (
    <>
      <strong>{t('admin.users.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.users.bulk.clearSelection')}
      </button>
      <BulkBar
        bulk={adapter.bulk}
        selected={[...selection.selected]}
        users={rows.filter(row => selection.selected.has(row.id))}
        catalog={catalog}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
    </>
  );
};

BulkPane.propTypes = {
  adapter: usersAdapterShape.isRequired,
  selection: PropTypes.object.isRequired,
  rows: PropTypes.array.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  reload: PropTypes.func.isRequired,
};

const UsersFoot = ({ data, onChange }) => {
  if (!data) {
    return null;
  }
  return (
    <Pager
      page={data.page || 0}
      totalPages={data.total_pages || 0}
      total={data.total || 0}
      size={data.size || PAGE_SIZE}
      onChange={onChange}
    />
  );
};

UsersFoot.propTypes = {
  data: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

/**
 * Accounts › Users over the `adapter` the host hands in: every narrowing
 * in the navbar module and mirrored in the URL through `useUrlNarrowing`,
 * the query as the list's `search` parameter once it settles, the Status
 * `select` group as `enabled`, and, while the adapter carries the
 * identity provider's calls, the 2FA `toggle` and Active after
 * `date-range` groups (`rateLimit`) and the Customer ID `toggle` group
 * (`update`), each change re-reading page 1 with the server alone
 * answering, the Roles `toggle` group over the role catalog (`roles`)
 * narrowing the loaded page client-side, its values in the URL as `roles`
 * and never sent to the list, Export the panel's action while the adapter
 * carries `exportUrl`, and the Per page and Columns groups, the sort, the
 * page size and the hidden columns under `table_prefs_admin_users`, the
 * sort sent as `sort` and `direction` and the page size as `size`, page
 * reset to 0 on either change; a `SectionHeading` carrying the total as
 * muted text after the title, the table's select column a real checkbox
 * header, the select-all for the page, the table with the columns of
 * `userColumns`, the email cell an in-router link to the row's record page
 * at `/admin/users/<id>`, the
 * row actions and dialogs the record page shares from `UserActions`, each
 * drawn only while the adapter carries its call (Suspend or Enable over
 * `suspend` and `resume`, Roles, Set primary organization, Edit customer
 * ID, Rate limits, Delete behind the confirm and the step-up over
 * `remove`), the heading's action pane gaining, while rows are picked and
 * the adapter carries `bulk`, "N selected", Clear selection and the bulk
 * actions, and the pager as the section's foot; every action re-fetches
 * the list.
 */
const UsersPage = ({ adapter }) => {
  const { t, i18n } = useTranslation();
  const catalog = useRoleCatalog(adapter.roles);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const narrowed = useMemo(() => listParams(url.narrowed), [url.narrowed]);
  const [page, setPage] = useState(0);
  const [pagedFor, setPagedFor] = useState(narrowed);

  if (pagedFor !== narrowed) {
    setPagedFor(narrowed);
    setPage(0);
  }
  const [answer, setAnswer] = useState({ params: null, data: null });

  const rows = useMemo(() => answer.data?.items || [], [answer]);
  const selection = useSelection(rows, { labelOf: row => row.username });
  const columns = useMemo(() => userColumns(userLink), []);
  const clientGroups = useMemo(
    () => (adapter.roles ? rolesGroupOf(catalog) : []),
    [adapter, catalog]
  );
  const ctx = { t, language: i18n.language };
  const search = useListSearch({
    query: url.query,
    onQueryChange: url.setQuery,
    placeholderKey: 'admin.users.search',
    groups: groupsOf({ adapter, filters: url.applied, setFilter: url.setFilter, t }),
    clientGroups,
    url,
    onClearFilters: url.clearFilters,
    action: exportAction(adapter, narrowed),
    matched: answer.data?.total || 0,
    rows,
    columns,
    ctx,
    prefsKey: PREFS_KEY,
  });

  const [pagedForSize, setPagedForSize] = useState(search.size);
  if (pagedForSize !== search.size) {
    setPagedForSize(search.size);
    setPage(0);
  }

  const params = useMemo(
    () => ({ ...narrowed, ...serverSortOf(search.sort), page, size: search.size }),
    [narrowed, page, search.sort, search.size]
  );
  const key = JSON.stringify(params);

  const { data, loading, reload } = useAdminRead({
    read: () => adapter.list(params),
    example: USERS,
    key,
  });

  if (data && answer.data !== data) {
    setAnswer({ params: key, data });
  }

  useEffect(() => {
    document.title = t('admin.users.title');
  }, [t]);

  const { open, close, onAction, confirmDelete } = useUserActions({ adapter, reload });
  const narrowing = Object.keys(narrowed).length > 0;
  const bulkPane = (
    <BulkPane
      adapter={adapter}
      selection={selection}
      rows={rows}
      catalog={catalog}
      reload={reload}
    />
  );

  return (
    <div className="page-column">
      <SectionHeading
        title={t('admin.users.title')}
        count={data ? data.total || 0 : null}
        actions={bulkPane}
      />
      {loading && !data ? (
        <AdminLoading />
      ) : (
        <SubTable
          columns={columns}
          rows={search.rows}
          rowKey={row => row.id}
          RowActions={RowActions}
          actionsProps={{ adapter, onAction }}
          rowProp="user"
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={narrowing ? t('pages.noMatches') : t('pages.empty')}
          selection={adapter.bulk ? selection.subtable : null}
        />
      )}
      <UsersFoot data={data} onChange={setPage} />
      <UserDialogs
        open={open}
        adapter={adapter}
        catalog={catalog}
        onClose={close}
        onSaved={reload}
        onConfirmDelete={confirmDelete}
      />
    </div>
  );
};

UsersPage.propTypes = {
  adapter: usersAdapterShape.isRequired,
};

export default UsersPage;
