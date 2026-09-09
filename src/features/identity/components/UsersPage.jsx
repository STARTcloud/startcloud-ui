import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Pager from '../../../components/common/Pager';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { deleteUser, updateUser, users } from '../api/accounts';
import { exportUrl } from '../api/activity';
import { useAdminRead } from '../hooks/useAdminRead';
import { useGuard } from '../hooks/useGuard';
import { USERS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import BulkBar from './BulkBar';
import RateLimitsDialog from './RateLimitsDialog';
import TableWrap from './TableWrap';
import {
  CustomerIdDialog,
  PrimaryOrgDialog,
  RolesDialog,
  adminUserShape,
  useRoleCatalog,
} from './UsersDialogs';
import UsersFilters, { EMPTY_USER_FILTERS, usersParamsOf } from './UsersFilters';

const PREFS_KEY = 'table_prefs_admin_users';
const PAGE_SIZE = 25;

const roleLabel = role => role.replace(/^ROLE_/, '');

const matches = (row, needle) =>
  [row.username, row.full_name || '', row.customer_id || ''].some(text =>
    text.toLowerCase().includes(needle)
  );

const RowActions = ({ user, onAction }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex gap-1 text-nowrap">
      <button
        type="button"
        className={`btn btn-sm ${user.enabled ? 'btn-outline-warning' : 'btn-outline-success'}`}
        onClick={() => onAction('toggle', user)}
      >
        {user.enabled ? t('admin.users.suspend') : t('admin.users.enable')}
      </button>
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary" size="sm">
          {t('admin.users.more')}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => onAction('roles', user)}>
            {t('admin.users.roles.action')}
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onAction('primary', user)}>
            {t('admin.users.primaryOrg.action')}
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onAction('customerId', user)}>
            {t('admin.users.customerId.action')}
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onAction('rateLimits', user)}>
            {t('admin.users.rateLimits.action')}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item className="text-danger" onClick={() => onAction('delete', user)}>
            {t('admin.users.delete.action')}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

RowActions.propTypes = {
  user: adminUserShape.isRequired,
  onAction: PropTypes.func.isRequired,
};

const columnsFor = ({ selected, onSelect }) => [
  {
    key: 'select',
    labelKey: 'admin.users.table.select',
    render: row => (
      <input
        type="checkbox"
        className="form-check-input"
        aria-label={row.username}
        checked={selected.has(row.id)}
        onChange={() => onSelect(row.id)}
      />
    ),
  },
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
    render: (row, ctx) => (
      <span className={`badge ${row.using_2fa ? 'bg-success' : 'bg-secondary'}`}>
        {row.using_2fa ? ctx.t('admin.users.table.on') : ctx.t('admin.users.table.off')}
      </span>
    ),
  },
];

const useSelection = rows => {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = id =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(row => row.id)));
  const clear = () => setSelected(new Set());
  return { selected, toggle, toggleAll, allSelected, clear };
};

const UserDialogs = ({ open, catalog, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { kind, user } = open;
  if (!user) {
    return null;
  }
  if (kind === 'roles') {
    return <RolesDialog user={user} catalog={catalog} onClose={onClose} onSaved={onSaved} />;
  }
  if (kind === 'primary') {
    return <PrimaryOrgDialog user={user} onClose={onClose} onSaved={onSaved} />;
  }
  if (kind === 'customerId') {
    return (
      <CustomerIdDialog
        title={t('admin.users.customerId.title', { user: user.username })}
        hint={t('admin.users.customerId.hint')}
        initial={user.customer_id || ''}
        save={value => updateUser(user.id, { customer_id: value })}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === 'rateLimits') {
    return <RateLimitsDialog user={user} onClose={onClose} />;
  }
  return null;
};

UserDialogs.propTypes = {
  open: PropTypes.shape({ kind: PropTypes.string.isRequired, user: adminUserShape }).isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const serverSortOf = sort => {
  const [entry] = sort;
  return entry ? { sort: entry.column, direction: entry.direction } : {};
};

/**
 * Accounts › Users: the filter row on the page, the navbar search bound
 * for a query over the rows the page holds and the Columns group with the
 * sort and the hidden columns under `table_prefs_admin_users`, the sort
 * sent to the read as `sort` and `direction`; the table with the roles,
 * organizations and 2FA badges, the row actions as labeled buttons and
 * one row menu (Suspend or Enable, Roles, Set primary organization, Edit
 * customer ID, Rate limits, Delete behind the confirm and the step-up),
 * the select-all box and the bulk bar, and the pager; every action
 * re-fetches the list.
 */
const UsersPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const catalog = useRoleCatalog();
  const [draft, setDraft] = useState(EMPTY_USER_FILTERS);
  const [applied, setApplied] = useState(EMPTY_USER_FILTERS);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState({ kind: '', user: null });
  const [answer, setAnswer] = useState({ params: null, data: null });

  const rows = useMemo(() => answer.data?.items || [], [answer]);
  const selection = useSelection(rows);
  const columns = useMemo(
    () => columnsFor({ selected: selection.selected, onSelect: selection.toggle }),
    [selection.selected, selection.toggle]
  );
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.users.search',
    columns,
    prefsKey: PREFS_KEY,
  });

  const params = useMemo(
    () => ({ ...usersParamsOf(applied), ...serverSortOf(search.sort), page, size: PAGE_SIZE }),
    [applied, page, search.sort]
  );
  const key = JSON.stringify(params);

  const { data, loading, reload } = useAdminRead({
    read: () => users(params),
    example: USERS,
    key,
  });

  if (data && answer.data !== data) {
    setAnswer({ params: key, data });
  }

  useEffect(() => {
    document.title = t('admin.users.title');
  }, [t]);

  const fail = error => notify('danger', t(errorKeys(error)));

  const close = () => setOpen({ kind: '', user: null });

  const onAction = (kind, user) => {
    if (kind === 'toggle') {
      updateUser(user.id, { enabled: !user.enabled })
        .then(() => {
          notify('success', t(user.enabled ? 'admin.users.suspended' : 'admin.users.enabled'));
          reload();
        })
        .catch(fail);
      return;
    }
    setOpen({ kind, user });
  };

  const confirmDelete = () => {
    const { user } = open;
    guard(() => deleteUser(user.id), t('admin.users.delete.stepUpReason'))
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

  const applyFilters = () => {
    setApplied(draft);
    setPage(0);
  };

  const doExport = () => {
    window.location.assign(exportUrl('users', usersParamsOf(applied)));
  };

  const ctx = { t, language: i18n.language };

  return (
    <div>
      <UsersFilters
        filters={draft}
        onChange={setDraft}
        onSubmit={applyFilters}
        onExport={doExport}
      />
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="users-select-all"
          checked={selection.allSelected}
          onChange={selection.toggleAll}
        />
        <label className="form-check-label" htmlFor="users-select-all">
          {t('admin.users.bulk.selectAll')}
        </label>
      </div>
      <BulkBar
        selected={[...selection.selected]}
        catalog={catalog}
        onClear={selection.clear}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
      {loading && !data ? (
        <AdminLoading />
      ) : (
        <TableWrap>
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={row => row.id}
            RowActions={RowActions}
            actionsProps={{ onAction }}
            rowProp="user"
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            ctx={ctx}
            emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
          />
        </TableWrap>
      )}
      {data ? (
        <Pager
          page={data.page || 0}
          totalPages={data.total_pages || 0}
          total={data.total || 0}
          size={data.size || PAGE_SIZE}
          onChange={setPage}
        />
      ) : null}
      <UserDialogs open={open} catalog={catalog} onClose={close} onSaved={reload} />
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

export default UsersPage;
