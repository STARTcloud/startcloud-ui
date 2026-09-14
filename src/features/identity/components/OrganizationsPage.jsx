import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable from '../../../components/common/SubTable';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { deleteOrganization, organizations, organizationsBulk } from '../api/accounts';
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

const deletable = org => !org.personal || (org.member_count || 0) === 0;

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
    labelKey: 'admin.organizations.table.name',
    sortValue: row => row.name.toLowerCase(),
    render: row => <strong title={row.uuid || undefined}>{row.name}</strong>,
  },
  {
    key: 'type',
    labelKey: 'admin.organizations.table.type',
    sortValue: row => (row.personal ? 1 : 0),
    render: (row, ctx) => (
      <span className={`badge ${row.personal ? 'bg-secondary' : 'bg-primary'}`}>
        {row.personal ? ctx.t('admin.organizations.personal') : ctx.t('admin.organizations.team')}
      </span>
    ),
  },
  {
    key: 'invite_code',
    labelKey: 'admin.organizations.table.inviteCode',
    render: row => (row.invite_code ? <code>{row.invite_code}</code> : '—'),
  },
  {
    key: 'customer_id',
    labelKey: 'admin.organizations.table.customerId',
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
    labelKey: 'admin.organizations.table.members',
    className: 'text-end',
    sortValue: row => row.member_count || 0,
    render: row => row.member_count ?? 0,
  },
  {
    key: 'created_at',
    labelKey: 'admin.organizations.table.created',
    sortValue: row => new Date(row.created_at || 0).getTime(),
    render: row => <DateCell value={row.created_at} />,
  },
];

const RowActions = ({ org, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex gap-1 text-nowrap">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onEdit(org)}
      >
        {t('admin.buttons.edit')}
      </button>
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
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

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
  const someSelected = selected.size > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(row => row.id)));
  const clear = () => setSelected(new Set());
  return {
    selected,
    toggle,
    toggleAll,
    allSelected,
    someSelected,
    clear,
    subtable: {
      allSelected,
      someSelected,
      onToggleAll: toggleAll,
      isSelected: row => selected.has(row.id),
      onToggleRow: row => toggle(row.id),
      labelOf: row => row.name,
    },
  };
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
 * action pane while rows are selected: Set customer id, Set access mode,
 * Set default role and Regenerate invite code beside Suspend, Resume and
 * Delete, the delete action stepped up, a personal organization skipped
 * with `personal`, and the result line naming processed, skipped and each
 * error's code translated (identity contract decisions 139, 147).
 */
const BulkActions = ({ selected, onDone }) => {
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
      () => organizationsBulk({ action, organization_ids: selected, ...extra }),
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
  selected: PropTypes.array.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Accounts › All organizations: the navbar search bound for a query over
 * the rows, mirrored in the URL as `search` through `useUrlNarrowing`,
 * the Type `select` group (Personal or Team) narrowing the rows
 * client-side, its value in the URL as `type`, and the Columns group
 * under `table_prefs_admin_organizations`, a `SectionHeading` carrying the
 * count as muted text after the title, the table's select column a real
 * checkbox header, the select-all for the page, checked, unchecked or
 * indeterminate, the table (name with the uuid in its tooltip, Personal or
 * Team, invite code, customer id, members, created), Edit opening the
 * `OrganizationDialog` over the whole record prefilled from the row and
 * re-reading the list once saved, Delete behind the confirm for a team or
 * an empty personal organization, the service's refusal drawn as a card,
 * and the heading's action pane gaining, while rows are picked, "N
 * selected", Clear selection and the bulk actions (Suspend, Resume,
 * Delete), the delete stepped up (identity contract decision 139).
 */
const OrganizationsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: organizations, example: ORGANIZATIONS });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const selection = useSelection(rows);
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

  const confirmDelete = () => {
    deleteOrganization(deleting.id)
      .then(() => {
        notify('success', t('admin.organizations.deleted'));
        reload();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')));
  };

  if (loading && !data) {
    return <AdminLoading />;
  }

  const headingActions = selection.someSelected ? (
    <>
      <strong>{t('admin.organizations.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.organizations.bulk.clearSelection')}
      </button>
      <BulkActions
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
        actionsProps={{ onEdit: setEditing, onDelete: setDeleting }}
        rowProp="org"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        ctx={{ t, language: i18n.language }}
        emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
        selection={selection.subtable}
      />
      {editing ? (
        <OrganizationDialog org={editing} onClose={() => setEditing(null)} onSaved={reload} />
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

export default OrganizationsPage;
