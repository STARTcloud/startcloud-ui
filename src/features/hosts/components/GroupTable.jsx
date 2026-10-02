import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash, FaUsers } from 'react-icons/fa6';

import { isSystemGroup } from '../utils/manage';

const SHOWN_MEMBERS = 3;

const typeWord = (row, ctx) =>
  ctx.t(isSystemGroup(row) ? 'host.groupTable.typeSystem' : 'host.groupTable.typeRegular');

const MembersCell = ({ row, ctx }) => {
  const members = Array.isArray(row.members) ? row.members : [];
  if (members.length === 0) {
    return <span className="text-muted fst-italic">{ctx.t('host.groupTable.noMembers')}</span>;
  }
  return (
    <span className="d-flex flex-wrap gap-1">
      {members.slice(0, SHOWN_MEMBERS).map(member => (
        <span key={member} className="badge text-bg-secondary">
          {member}
        </span>
      ))}
      {members.length > SHOWN_MEMBERS ? (
        <span className="badge text-bg-secondary">
          {ctx.t('host.groupTable.moreMembers', { count: members.length - SHOWN_MEMBERS })}
        </span>
      ) : null}
    </span>
  );
};

MembersCell.propTypes = {
  row: PropTypes.shape({ members: PropTypes.arrayOf(PropTypes.string) }).isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The columns of the groups table, hyperweaver-ui's: the group's name,
 * the gid, the first three members as badges with the count of the
 * rest, and the type, system or regular, as a badge.
 */
export const GROUP_COLUMNS = [
  {
    key: 'groupname',
    kind: 'name',
    labelKey: 'host.groupTable.groupName',
    value: row => row.groupname || '',
    render: row => (
      <span>
        <FaUsers className="text-primary me-2" aria-hidden="true" />
        <strong>{row.groupname}</strong>
      </span>
    ),
  },
  {
    key: 'gid',
    kind: 'count',
    labelKey: 'host.groupTable.gid',
    value: row => Number(row.gid) || 0,
    render: row => <span className="font-monospace">{row.gid}</span>,
  },
  {
    key: 'members',
    kind: 'badges',
    labelKey: 'host.groupTable.members',
    value: row => (Array.isArray(row.members) ? row.members.join(', ') : ''),
    render: (row, ctx) => <MembersCell row={row} ctx={ctx} />,
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.groupTable.type',
    value: typeWord,
    render: (row, ctx) => (
      <span className={`badge text-bg-${isSystemGroup(row) ? 'info' : 'success'}`}>
        {typeWord(row, ctx)}
      </span>
    ),
  },
];

/**
 * The filter group of the groups table, the group's type.
 */
export const GROUP_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.groupTable.type',
    values: row => [isSystemGroup(row) ? 'typeSystem' : 'typeRegular'],
    order: ['typeRegular', 'typeSystem'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`host.groupTable.${value}`),
  },
];

/**
 * The actions of one row of the groups table, hyperweaver-ui's row
 * buttons: View details, and Delete for a group whose gid is a hundred
 * or more, which opens the typed confirmation in the section.
 */
export const GroupRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-group={row.groupname}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.groupTable.viewDetails')}
        aria-label={t('host.groupTable.viewDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      {isSystemGroup(row) ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title={t('host.groupTable.deleteGroup')}
          aria-label={t('host.groupTable.deleteGroup')}
          data-action="delete"
          disabled={busy}
          onClick={() => onAction('delete', row)}
        >
          <FaTrash aria-hidden="true" />
        </button>
      )}
    </span>
  );
};

GroupRowActions.propTypes = {
  row: PropTypes.shape({
    groupname: PropTypes.string.isRequired,
    gid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
