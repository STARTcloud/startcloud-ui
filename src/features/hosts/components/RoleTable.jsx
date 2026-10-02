import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash, FaUserShield } from 'react-icons/fa6';

import { shellName } from '../utils/manage';

const SHOWN = 2;

const ListCell = ({ items, tone, ctx }) => {
  if (items.length === 0) {
    return <span className="text-muted fst-italic">{ctx.t('host.roleTable.none')}</span>;
  }
  return (
    <span className="d-flex flex-wrap gap-1">
      {items.slice(0, SHOWN).map(item => (
        <span key={item} className={`badge text-bg-${tone}`}>
          {item}
        </span>
      ))}
      {items.length > SHOWN ? (
        <span className="badge text-bg-secondary">
          {ctx.t('host.roleTable.more', { count: items.length - SHOWN })}
        </span>
      ) : null}
    </span>
  );
};

ListCell.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  tone: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
};

const listOf = value => (Array.isArray(value) ? value : []);

/**
 * The columns of the roles table, hyperweaver-ui's: the role's name,
 * the comment, the shell's name, and the first two authorizations and
 * profiles as badges with the count of the rest.
 */
export const ROLE_COLUMNS = [
  {
    key: 'rolename',
    kind: 'name',
    labelKey: 'host.roleTable.roleName',
    value: row => row.rolename || '',
    render: row => (
      <span>
        <FaUserShield className="text-warning me-2" aria-hidden="true" />
        <strong>{row.rolename}</strong>
      </span>
    ),
  },
  {
    key: 'comment',
    kind: 'text',
    labelKey: 'host.roleTable.comment',
    prose: true,
    value: row => row.comment || '',
    render: (row, ctx) => (
      <span className="small" title={row.comment}>
        {row.comment || ctx.t('host.roleTable.notAvailable')}
      </span>
    ),
  },
  {
    key: 'shell',
    kind: 'text',
    labelKey: 'host.roleTable.shell',
    priority: 4,
    value: row => row.shell || '',
    render: (row, ctx) => (
      <code className="small" title={row.shell}>
        {shellName(row.shell) || ctx.t('host.roleTable.notAvailable')}
      </code>
    ),
  },
  {
    key: 'authorizations',
    kind: 'badges',
    labelKey: 'host.roleTable.authorizations',
    value: row => listOf(row.authorizations).join(', '),
    render: (row, ctx) => <ListCell items={listOf(row.authorizations)} tone="info" ctx={ctx} />,
  },
  {
    key: 'profiles',
    kind: 'badges',
    labelKey: 'host.roleTable.profiles',
    value: row => listOf(row.profiles).join(', '),
    render: (row, ctx) => <ListCell items={listOf(row.profiles)} tone="primary" ctx={ctx} />,
  },
];

/**
 * The actions of one row of the roles table, hyperweaver-ui's row
 * buttons: View details and Delete, the delete opening the typed
 * confirmation in the section.
 */
export const RoleRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-role={row.rolename}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.roleTable.viewDetails')}
        aria-label={t('host.roleTable.viewDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('host.roleTable.deleteRole')}
        aria-label={t('host.roleTable.deleteRole')}
        data-action="delete"
        disabled={busy}
        onClick={() => onAction('delete', row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

RoleRowActions.propTypes = {
  row: PropTypes.shape({ rolename: PropTypes.string.isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
