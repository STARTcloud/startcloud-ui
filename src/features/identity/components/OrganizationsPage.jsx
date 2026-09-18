import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable, { hasAny } from '../../../components/common/SubTable';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { useAdminRead } from '../hooks/useAdminRead';
import { ORGANIZATIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import OrganizationDialog, {
  ACCESS_MODES,
  adminOrganizationShape,
  DEFAULT_ROLES,
} from './OrganizationDialog';
import { CustomerIdDialog } from './UsersDialogs';

const PREFS_KEY = 'table_prefs_admin_organizations';

export const organizationsAdapterShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  suspend: PropTypes.func,
  resume: PropTypes.func,
  bulk: PropTypes.func,
});

const deletable = org => !org.managed && (!org.personal || (org.member_count || 0) === 0);

const carries = field => rows => rows.some(row => field in row);

const matches = (row, needle) =>
  [row.name, row.uuid || '', row.invite_code || '', row.customer_id || ''].some(text =>
    text.toLowerCase().includes(needle)
  );

const FILTER_GROUPS = [
  {
    kind: 'select',
    key: 'type',
    labelKey: 'admin.organizations.table.type',
    values: row => [row.personal ? 'personal' : 'team'],
    order: ['personal', 'team'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`admin.organizations.${value}`),
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const columnsFor = () => [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'admin.organizations.table.name',
    sortValue: row => row.name.toLowerCase(),
    render: (row, ctx) => (
      <span className="d-inline-flex align-items-center gap-2">
        <strong title={row.uuid || undefined}>{row.name}</strong>
        {row.managed ? (
          <span className="badge bg-info">{ctx.t('admin.organizations.managed')}</span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'admin.organizations.table.type',
    when: carries('personal'),
    sortValue: row => (row.personal ? 1 : 0),
    render: (row, ctx) => (
      <span className={`badge ${row.personal ? 'bg-secondary' : 'bg-primary'}`}>
        {row.personal ? ctx.t('admin.organizations.personal') : ctx.t('admin.organizations.team')}
      </span>
    ),
  },
  {
    key: 'suspended',
    kind: 'badge',
    labelKey: 'admin.organizations.table.status',
    when: carries('suspended'),
    sortValue: row => (row.suspended ? 1 : 0),
    render: (row, ctx) => (
      <span className={`badge ${row.suspended ? 'bg-warning text-dark' : 'bg-success'}`}>
        {row.suspended
          ? ctx.t('admin.organizations.suspended')
          : ctx.t('admin.organizations.active')}
      </span>
    ),
  },
  {
    key: 'invite_code',
    kind: 'text',
    labelKey: 'admin.organizations.table.inviteCode',
    when: hasAny(row => row.invite_code),
    render: row => (row.invite_code ? <code>{row.invite_code}</code> : '—'),
  },
  {
    key: 'customer_id',
    kind: 'badge',
    labelKey: 'admin.organizations.table.customerId',
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
    key: 'member_count',
    kind: 'count',
    labelKey: 'admin.organizations.table.members',
    className: 'text-end',
    sortValue: row => row.member_count || 0,
    render: row => row.member_count ?? 0,
  },
  {
    key: 'created_at',
    kind: 'date',
    labelKey: 'admin.organizations.table.created',
    when: hasAny(row => row.created_at),
    sortValue: row => new Date(row.created_at || 0).getTime(),
    render: row => <DateCell value={row.created_at} />,
  },
];

const RowActions = ({ org, adapter, onEdit, onToggle, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex gap-1 text-nowrap">
      {org.managed ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onEdit(org)}
        >
          {t('admin.buttons.edit')}
        </button>
      )}
      {adapter.suspend && adapter.resume ? (
        <button
          type="button"
          className={`btn btn-sm ${org.suspended ? 'btn-outline-success' : 'btn-outline-warning'}`}
          onClick={() => onToggle(org)}
        >
          {org.suspended ? t('admin.buttons.resume') : t('admin.buttons.suspend')}
        </button>
      ) : null}
      {deletable(org) ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(org)}
        >
          {t('admin.buttons.delete')}
        </button>
      ) : null}
    </div>
  );
};

RowActions.propTypes = {
  org: adminOrganizationShape.isRequired,
  adapter: organizationsAdapterShape.isRequired,
  onEdit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const CONFIRM_ACTIONS = ['suspend', 'resume', 'delete', 'regenerate_invite_code'];

const ACCESS_MODE_KEYS = {
  invite: 'orgConsole.organization.accessModes.inviteOnly',
  request: 'orgConsole.organization.accessModes.requestToJoin',
  private: 'orgConsole.organization.accessModes.private',
};

const SelectDialog = ({ title, label, options, labelOf, initial, save, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  const submit = event => {
    event.preventDefault();
    setBusy(true);
    save(value)
      .then(answer => {
        notify('success', t('admin.organizations.saved'));
        onSaved(answer);
        onClose();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')))
      .finally(() => setBusy(false));
  };

  return (
    <div className="d-inline-flex align-items-center gap-2">
      <form onSubmit={submit} className="d-flex align-items-center gap-2">
        <label className="visually-hidden" htmlFor="bulk-select-dialog">
          {label}
        </label>
        <select
          id="bulk-select-dialog"
          className="form-select form-select-sm w-auto"
          value={value}
          onChange={event => setValue(event.target.value)}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {labelOf(option)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-sm btn-outline-secondary" disabled={busy}>
          {title}
        </button>
        <button type="button" className="btn btn-sm btn-link" onClick={onClose} disabled={busy}>
          {t('admin.buttons.cancel')}
        </button>
      </form>
    </div>
  );
};

SelectDialog.propTypes = {
  title: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelOf: PropTypes.func.isRequired,
  initial: PropTypes.string.isRequired,
  save: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

/**
 * The Organizations page's bulk actions, drawn in the section heading's
 * action pane while rows are selected and the adapter carries `bulk`: Set
 * customer id, Set access mode, Set default role and Regenerate invite
 * code beside Suspend, Resume and Delete, the delete action stepped up, a
 * personal organization skipped with `personal`, and the result line
 * naming processed, skipped and each error's code translated (identity
 * contract decisions 139, 147).
 */
const BulkActions = ({ bulk, selected, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [pending, setPending] = useState('');
  const [dialog, setDialog] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = (action, extra = {}) => {
    setBusy(true);
    return guard(
      () => bulk({ action, organization_ids: selected, ...extra }),
      t('admin.organizations.bulk.stepUpReason')
    )
      .then(answer => {
        setResult(answer);
        onDone();
        return answer;
      })
      .finally(() => setBusy(false));
  };

  const send = () => {
    run(pending)
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => setPending(''));
  };

  const button = (action, variant, onClick = () => setPending(action)) => (
    <button
      type="button"
      className={`btn btn-sm ${variant}`}
      disabled={busy || selected.length === 0}
      onClick={onClick}
    >
      {t(`admin.organizations.bulk.${action}`)}
    </button>
  );

  const line = resultLineOf(t, 'admin.organizations.bulk', result);

  return (
    <>
      {button('suspend', 'btn-outline-warning')}
      {button('resume', 'btn-outline-success')}
      {button('set_customer_id', 'btn-outline-secondary', () => setDialog('customerId'))}
      {dialog === 'accessMode' ? (
        <SelectDialog
          title={t('admin.organizations.bulk.set_access_mode')}
          label={t('admin.organizations.field.accessMode')}
          options={ACCESS_MODES}
          labelOf={mode => t(ACCESS_MODE_KEYS[mode])}
          initial={ACCESS_MODES[0]}
          save={access_mode => run('set_access_mode', { access_mode })}
          onClose={() => setDialog('')}
          onSaved={() => setDialog('')}
        />
      ) : (
        button('set_access_mode', 'btn-outline-secondary', () => setDialog('accessMode'))
      )}
      {dialog === 'defaultRole' ? (
        <SelectDialog
          title={t('admin.organizations.bulk.set_default_role')}
          label={t('admin.organizations.field.defaultRole')}
          options={DEFAULT_ROLES}
          labelOf={role => t(`roles.${role.toLowerCase()}`)}
          initial={DEFAULT_ROLES[0]}
          save={default_role => run('set_default_role', { default_role })}
          onClose={() => setDialog('')}
          onSaved={() => setDialog('')}
        />
      ) : (
        button('set_default_role', 'btn-outline-secondary', () => setDialog('defaultRole'))
      )}
      {button('regenerate_invite_code', 'btn-outline-secondary')}
      {button('delete', 'btn-outline-danger')}
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      {dialog === 'customerId' ? (
        <CustomerIdDialog
          title={t('admin.organizations.bulk.setCustomerId')}
          hint={t('admin.organizations.field.customerIdHint')}
          initial=""
          save={customer_id => run('set_customer_id', { customer_id })}
          onClose={() => setDialog('')}
          onSaved={() => setDialog('')}
        />
      ) : null}
      <ConfirmModal
        show={CONFIRM_ACTIONS.includes(pending)}
        handleClose={() => setPending('')}
        handleConfirm={send}
        title={t('admin.organizations.bulk.confirmTitle')}
        message={t('admin.organizations.bulk.confirmBody', {
          action: pending ? t(`admin.organizations.bulk.${pending}`) : '',
          count: selected.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

BulkActions.propTypes = {
  bulk: PropTypes.func.isRequired,
  selected: PropTypes.array.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Accounts › All organizations over the `adapter` the host hands in: the
 * navbar search bound for a query over the rows, mirrored in the URL as
 * `search` through `useUrlNarrowing`, the Type `select` group (Personal
 * or Team) narrowing the rows client-side, its value in the URL as
 * `type`, and the Columns group under `table_prefs_admin_organizations`,
 * a `SectionHeading` carrying the count as muted text after the title,
 * the table's select column a real checkbox header while the adapter
 * carries `bulk`, the table (name with the uuid in its tooltip, then, each
 * while the rows carry it, Personal or Team, the suspended state, the
 * invite code, the customer id, the created time, and the members), Edit
 * opening the `OrganizationDialog` over the whole record prefilled from
 * the row and saving through `update`, Suspend or Resume per row while
 * the adapter carries `suspend` and `resume`, Delete behind the confirm
 * over `remove` for a team or an empty personal organization, a row the
 * identity provider manages (`managed`) badged so and drawing Suspend or
 * Resume alone, never Edit, Delete or the select column, the
 * service's refusal drawn as a card, and the heading's action pane
 * gaining, while rows are picked and the adapter carries `bulk`, "N
 * selected", Clear selection and the bulk actions, the delete stepped up
 * (identity contract decision 139).
 */
const OrganizationsPage = ({ adapter }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: adapter.list, example: ORGANIZATIONS });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const selectable = useMemo(() => rows.filter(row => !row.managed), [rows]);
  const selection = useSelection(selectable, { labelOf: row => row.name });
  const columns = useMemo(() => columnsFor(), []);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.organizations.search',
    columns,
    prefsKey: PREFS_KEY,
    filterGroups: FILTER_GROUPS,
    url,
    bound: {
      query: url.query,
      onQueryChange: url.setQuery,
      placeholder: t('admin.organizations.search'),
    },
  });

  useEffect(() => {
    document.title = t('admin.organizations.all');
  }, [t]);

  const fail = error => notify('danger', t(error.messageKey || 'errors.request'));

  const confirmDelete = () => {
    adapter
      .remove(deleting.id)
      .then(() => {
        notify('success', t('admin.organizations.deleted'));
        reload();
      })
      .catch(fail);
  };

  const toggle = org => {
    (org.suspended ? adapter.resume(org.id) : adapter.suspend(org.id))
      .then(() => {
        notify('success', t('admin.organizations.saved'));
        reload();
      })
      .catch(fail);
  };

  if (loading && !data) {
    return <AdminLoading />;
  }

  const headingActions =
    selection.someSelected && adapter.bulk ? (
      <>
        <strong>
          {t('admin.organizations.bulk.selected', { count: selection.selected.size })}
        </strong>
        <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
          {t('admin.organizations.bulk.clearSelection')}
        </button>
        <BulkActions
          bulk={adapter.bulk}
          selected={[...selection.selected]}
          onDone={() => {
            selection.clear();
            reload();
          }}
        />
      </>
    ) : null;

  return (
    <div>
      <SectionHeading
        title={t('admin.organizations.all')}
        count={t('admin.organizations.count', { count: rows.length })}
        actions={headingActions}
      />
      <SubTable
        columns={columns}
        rows={search.rows}
        rowKey={row => row.id}
        RowActions={RowActions}
        actionsProps={{ adapter, onEdit: setEditing, onToggle: toggle, onDelete: setDeleting }}
        rowProp="org"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={{ t, language: i18n.language }}
        emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
        selection={adapter.bulk ? selection.subtable : null}
      />
      {editing ? (
        <OrganizationDialog
          org={editing}
          save={patch => adapter.update(editing.id, patch)}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(deleting)}
        handleClose={() => setDeleting(null)}
        handleConfirm={confirmDelete}
        title={t('admin.organizations.delete.title')}
        message={t('admin.organizations.delete.body', {
          org: deleting?.name || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

OrganizationsPage.propTypes = {
  adapter: organizationsAdapterShape.isRequired,
};

export default OrganizationsPage;
