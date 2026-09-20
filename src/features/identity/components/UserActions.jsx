import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RowMenu from '../../../components/common/RowMenu';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';

import RateLimitsDialog from './RateLimitsDialog';
import { CustomerIdDialog, PrimaryOrgDialog, RolesDialog, adminUserShape } from './UsersDialogs';

export const usersAdapterShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  get: PropTypes.func.isRequired,
  roles: PropTypes.func,
  update: PropTypes.func,
  address: PropTypes.func,
  email: PropTypes.func,
  phone: PropTypes.func,
  preferences: PropTypes.func,
  tfa: PropTypes.shape({
    methods: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
  }),
  places: PropTypes.func,
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

export const roleLabel = role => role.replace(/^ROLE_/, '');

const carries = field => rows => rows.some(row => field in row);

/**
 * The status badge of a Users row, Active or Disabled, the one the table's
 * Status column and the record page's heading both draw.
 *
 * @param {Object} row - The user row
 * @param {Function} t - The translator
 * @returns {import('react').ReactElement} The badge
 */
export const statusBadge = (row, t) => (
  <span className={`badge ${row.enabled ? 'bg-success' : 'bg-warning text-dark'}`}>
    {row.enabled ? t('admin.users.table.active') : t('admin.users.table.disabled')}
  </span>
);

/**
 * The columns of a Users row, the table's and the record page's one
 * shape: the email cell drawn by `renderName`, then the name, the customer
 * id and the 2FA flag while the rows carry them, the status, the roles and
 * the organizations as badges, the primary organization gold.
 *
 * @param {Function} renderName - Draws the email cell from the row
 * @returns {Array} The columns
 */
export const userColumns = renderName => [
  {
    key: 'username',
    kind: 'name',
    labelKey: 'admin.users.table.email',
    sortValue: row => row.username.toLowerCase(),
    render: renderName,
  },
  {
    key: 'full_name',
    kind: 'text',
    labelKey: 'admin.users.table.name',
    sortValue: row => (row.full_name || '').toLowerCase(),
    render: row => row.full_name || '',
  },
  {
    key: 'customer_id',
    kind: 'badge',
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
    kind: 'badge',
    labelKey: 'admin.users.table.status',
    sortValue: row => (row.enabled ? 0 : 1),
    render: (row, ctx) => statusBadge(row, ctx.t),
  },
  {
    key: 'roles',
    kind: 'badges',
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
    kind: 'badges',
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
    kind: 'badge',
    labelKey: 'admin.users.table.tfa',
    when: carries('using_2fa'),
    render: (row, ctx) => (
      <span className={`badge ${row.using_2fa ? 'bg-success' : 'bg-secondary'}`}>
        {row.using_2fa ? ctx.t('admin.users.table.on') : ctx.t('admin.users.table.off')}
      </span>
    ),
  },
];

export const menuItemsOf = adapter => [
  ...(adapter.roles && adapter.setRoles ? [['roles', 'admin.users.roles.action']] : []),
  ...(adapter.update
    ? [
        ['primary', 'admin.users.primaryOrg.action'],
        ['customerId', 'admin.users.customerId.action'],
      ]
    : []),
  ...(adapter.rateLimit ? [['rateLimits', 'admin.users.rateLimits.action']] : []),
];

/**
 * The actions of one Users row, on the table's row and in the record
 * page's heading: Suspend or Enable, then one `RowMenu` with Roles, Set
 * primary organization, Edit customer ID, Rate limits and Delete, each
 * drawn only while the adapter carries its call.
 */
export const RowActions = ({ user, adapter, onAction }) => {
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

const dialogOf = ({ open, adapter, catalog, onClose, onSaved, t }) => {
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

/**
 * The dialogs of one Users row, mounted once per page: the one the open
 * action names (Roles, Set primary organization, Edit customer ID, Rate
 * limits) and the delete confirm, `onConfirmDelete` running the guarded
 * delete.
 */
export const UserDialogs = ({ open, adapter, catalog, onClose, onSaved, onConfirmDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      {dialogOf({ open, adapter, catalog, onClose, onSaved, t })}
      <ConfirmModal
        show={open.kind === 'delete'}
        handleClose={onClose}
        handleConfirm={onConfirmDelete}
        title={t('admin.users.delete.title')}
        message={t('admin.users.delete.body', {
          user: open.user?.username || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

UserDialogs.propTypes = {
  open: PropTypes.shape({ kind: PropTypes.string.isRequired, user: adminUserShape }).isRequired,
  adapter: usersAdapterShape.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
};

/**
 * The actions of the Users pages over one row: `onAction(kind, user)`
 * suspends or resumes at once and opens every other kind's dialog, `open`
 * being the dialog in hand and `close` shutting it, `confirmDelete`
 * running the stepped-up delete; every write calls `reload`, the delete
 * `onRemoved`, the reload unless the page hands another.
 *
 * @param {Object} options - The page's side
 * @param {Object} options.adapter - The Users adapter
 * @param {Function} options.reload - Re-reads the page
 * @param {Function} [options.onRemoved] - Runs after the delete
 * @returns {{ open: Object, close: Function, onAction: Function, confirmDelete: Function }} The actions
 */
export const useUserActions = ({ adapter, reload, onRemoved = reload }) => {
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
        onRemoved();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          fail(error);
        }
      });
  };

  return { open, close, onAction, confirmDelete };
};
