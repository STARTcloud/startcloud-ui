import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { deleteOrganization, organizations, updateOrganization } from '../api/accounts';
import { useAdminRead } from '../hooks/useAdminRead';
import { ORGANIZATIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';
import { CustomerIdDialog } from './UsersDialogs';

const PREFS_KEY = 'table_prefs_admin_organizations';

const organizationShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  uuid: PropTypes.string,
  name: PropTypes.string.isRequired,
  personal: PropTypes.bool,
  invite_code: PropTypes.string,
  customer_id: PropTypes.string,
  created_at: PropTypes.string,
  member_count: PropTypes.number,
});

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

const columns = [
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
  org: organizationShape.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * Accounts › All organizations: the navbar search bound for a query over
 * the rows, mirrored in the URL as `search` through `useUrlNarrowing`,
 * the Type `select` group (Personal or Team) narrowing the rows
 * client-side, its value in the URL as `type`, and the Columns group
 * under `table_prefs_admin_organizations`,
 * the table (name with the uuid in its tooltip, Personal or Team, invite
 * code, customer id behind Edit, members, created), the customer id
 * dialog with an empty value clearing it, and Delete behind the confirm
 * for a team or an empty personal organization, the service's refusal
 * drawn as a card.
 */
const OrganizationsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: organizations, example: ORGANIZATIONS });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
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

  return (
    <div>
      <TableWrap>
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
        />
      </TableWrap>
      {editing ? (
        <CustomerIdDialog
          title={t('admin.organizations.customerId.title', { org: editing.name })}
          hint={t('admin.organizations.customerId.hint')}
          initial={editing.customer_id || ''}
          save={value => updateOrganization(editing.id, { customer_id: value })}
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

export default OrganizationsPage;
