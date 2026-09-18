import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Pager from '../../../components/common/Pager';
import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable from '../../../components/common/SubTable';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useSelection } from '../../../hooks/useSelection';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { useAdminRead } from '../hooks/useAdminRead';
import { useListSearch } from '../hooks/useListSearch';
import { USERS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import BulkBar from './BulkBar';
import RateLimitsDialog from './RateLimitsDialog';
import {
  CustomerIdDialog,
  PrimaryOrgDialog,
  RolesDialog,
  adminUserShape,
  useRoleCatalog,
} from './UsersDialogs';

const PREFS_KEY = 'table_prefs_admin_users';
const PAGE_SIZE = 25;
const CLIENT_KEYS = ['roles'];
const FILTER_KEYS = ['enabled', 'using_2fa', 'has_customer_id', 'active_after', ...CLIENT_KEYS];

export const usersAdapterShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  roles: PropTypes.func,
  update: PropTypes.func,
  setRoles: PropTypes.func,
  suspend: PropTypes.func,
  resume: PropTypes.func,
  remove: PropTypes.func,
  bulk: PropTypes.func,
  rateLimit: PropTypes.shape({
    read: PropTypes.func.isRequired,
    unlockSignIn: PropTypes.func.isRequired,
    unlockMethod: PropTypes.func.isRequired,
    ban: PropTypes.func.isRequired,
    unban: PropTypes.func.isRequired,
  }),
  exportUrl: PropTypes.func,
});

const roleLabel = role => role.replace(/^ROLE_/, '');

const listParams = values =>
  Object.fromEntries(Object.entries(values).filter(([key]) => !CLIENT_KEYS.includes(key)));

const flagSet = on => new Set(on ? ['true'] : []);

const carries = field => rows => rows.some(row => field in row);

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

const menuItemsOf = adapter => [
  ...(adapter.roles && adapter.setRoles ? [['roles', 'admin.users.roles.action']] : []),
  ...(adapter.update
    ? [
        ['primary', 'admin.users.primaryOrg.action'],
        ['customerId', 'admin.users.customerId.action'],
      ]
    : []),
  ...(adapter.rateLimit ? [['rateLimits', 'admin.users.rateLimits.action']] : []),
];

const RowActions = ({ user, adapter, onAction }) => {
  const { t } = useTranslation();
  const items = menuItemsOf(adapter);
  const canToggle = Boolean(adapter.suspend && adapter.resume);
  const canDelete = Boolean(adapter.remove);
  return (
    <div className="d-flex gap-1 text-nowrap">
      {canToggle ? (
        <button
          type="button"
          className={`btn btn-sm ${user.enabled ? 'btn-outline-warning' : 'btn-outline-success'}`}
          onClick={() => onAction('toggle', user)}
        >
          {user.enabled ? t('admin.users.suspend') : t('admin.users.enable')}
        </button>
      ) : null}
      {items.length > 0 || canDelete ? (
        <RowMenu label={t('admin.users.more')}>
          {items.map(([kind, labelKey]) => (
            <Dropdown.Item key={kind} onClick={() => onAction(kind, user)}>
              {t(labelKey)}
            </Dropdown.Item>
          ))}
          {items.length > 0 && canDelete ? <Dropdown.Divider /> : null}
          {canDelete ? (
            <Dropdown.Item className="text-danger" onClick={() => onAction('delete', user)}>
              {t('admin.users.delete.action')}
            </Dropdown.Item>
          ) : null}
        </RowMenu>
      ) : null}
    </div>
  );
};

RowActions.propTypes = {
  user: adminUserShape.isRequired,
  adapter: usersAdapterShape.isRequired,
  onAction: PropTypes.func.isRequired,
};

const columnsFor = () => [
  {
    key: 'username',
    labelKey: 'admin.users.table.email',
    sortValue: row => row.username.toLowerCase(),
    render: row => <strong>{row.username}</strong>,
  },
  {
    key: 'full_name',
    labelKey: 'admin.users.table.name',
    sortValue: row => (row.full_name || '').toLowerCase(),
    render: row => row.full_name || '',
  },
  {
    key: 'customer_id',
    labelKey: 'admin.users.table.customerId',
    when: carries('customer_id'),
    sortValue: row => row.customer_id || '',
    render: (row, ctx) =>
      row.customer_id ? (
        <span className="badge bg-secondary">{row.customer_id}</span>
      ) : (
        <span className="text-muted">{ctx.t('admin.users.table.notSet')}</span>
      ),
  },
  {
    key: 'enabled',
    labelKey: 'admin.users.table.status',
    sortValue: row => (row.enabled ? 0 : 1),
    render: (row, ctx) => (
      <span className={`badge ${row.enabled ? 'bg-success' : 'bg-warning text-dark'}`}>
        {row.enabled ? ctx.t('admin.users.table.active') : ctx.t('admin.users.table.disabled')}
      </span>
    ),
  },
  {
    key: 'roles',
    labelKey: 'admin.users.table.roles',
    render: row => (
      <span className="d-flex flex-wrap gap-1">
        {row.roles.map(role => (
          <span key={role} className="badge bg-secondary">
            {roleLabel(role)}
          </span>
        ))}
      </span>
    ),
  },
  {
    key: 'organizations',
    labelKey: 'admin.users.table.organizations',
    render: (row, ctx) => (
      <span className="d-flex flex-wrap gap-1">
        {row.organizations.map(org => (
          <span
            key={org.uuid}
            className={`badge ${org.primary ? 'bg-warning text-dark' : 'bg-secondary'}`}
            title={org.primary ? ctx.t('admin.users.table.primary') : undefined}
          >
            {org.name}
          </span>
        ))}
      </span>
    ),
  },
  {
    key: 'using_2fa',
    labelKey: 'admin.users.table.tfa',
    when: carries('using_2fa'),
    render: (row, ctx) => (
      <span className={`badge ${row.using_2fa ? 'bg-success' : 'bg-secondary'}`}>
        {row.using_2fa ? ctx.t('admin.users.table.on') : ctx.t('admin.users.table.off')}
      </span>
    ),
  },
];

const UserDialogs = ({ open, adapter, catalog, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { kind, user } = open;
  if (!user) {
    return null;
  }
  if (kind === 'roles') {
    return (
      <RolesDialog
        user={user}
        catalog={catalog}
        save={roles => adapter.setRoles(user.id, roles)}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === 'primary') {
    return (
      <PrimaryOrgDialog
        user={user}
        save={uuid => adapter.update(user.id, { primary_organization: uuid })}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === 'customerId') {
    return (
      <CustomerIdDialog
        title={t('admin.users.customerId.title', { user: user.username })}
        hint={t('admin.users.customerId.hint')}
        initial={user.customer_id || ''}
        save={value => adapter.update(user.id, { customer_id: value })}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === 'rateLimits') {
    return <RateLimitsDialog rateLimit={adapter.rateLimit} user={user} onClose={onClose} />;
  }
  return null;
};

UserDialogs.propTypes = {
  open: PropTypes.shape({ kind: PropTypes.string.isRequired, user: adminUserShape }).isRequired,
  adapter: usersAdapterShape.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

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

const useUserActions = ({ adapter, reload }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [open, setOpen] = useState({ kind: '', user: null });

  const fail = error => notify('danger', t(errorKeys(error)));

  const close = () => setOpen({ kind: '', user: null });

  const toggle = user => {
    const call = user.enabled ? adapter.suspend(user.id) : adapter.resume(user.id);
    call
      .then(() => {
        notify('success', t(user.enabled ? 'admin.users.suspended' : 'admin.users.enabled'));
        reload();
      })
      .catch(fail);
  };

  const onAction = (kind, user) => {
    if (kind === 'toggle') {
      toggle(user);
      return;
    }
    setOpen({ kind, user });
  };

  const confirmDelete = () => {
    const { user } = open;
    guard(() => adapter.remove(user.id), t('admin.users.delete.stepUpReason'))
      .then(() => {
        notify('success', t('admin.users.delete.done'));
        reload();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          fail(error);
        }
      });
  };

  return { open, close, onAction, confirmDelete };
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
 * header, the select-all for the page, the table with the roles,
 * organizations and, while the rows carry them, the customer id and 2FA
 * columns, the row actions as labeled buttons and one `RowMenu`, each
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
  const columns = useMemo(() => columnsFor(), []);
  const clientGroups = useMemo(
    () => (adapter.roles ? rolesGroupOf(catalog) : []),
    [adapter, catalog]
  );
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
  const ctx = { t, language: i18n.language };
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
      />
      <ConfirmModal
        show={open.kind === 'delete'}
        handleClose={close}
        handleConfirm={confirmDelete}
        title={t('admin.users.delete.title')}
        message={t('admin.users.delete.body', {
          user: open.user?.username || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

UsersPage.propTypes = {
  adapter: usersAdapterShape.isRequired,
};

export default UsersPage;
