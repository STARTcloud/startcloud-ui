import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaGear, FaKey, FaLock, FaPen, FaTrash, FaUser } from 'react-icons/fa6';

import { isLowUid, isSystemUser, shellName, shortHome } from '../utils/manage';

const notAvailable = ctx => ctx.t('host.userTable.notAvailable');

const UserGlyph = ({ row, ctx }) => {
  const system = isSystemUser(row);
  const Icon = system ? FaGear : FaUser;
  return (
    <Icon
      className={`${system ? 'text-info' : 'text-success'} me-2`}
      title={ctx.t(system ? 'host.userTable.systemUser' : 'host.userTable.regularUser')}
      aria-hidden="true"
    />
  );
};

UserGlyph.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const statusWord = (row, ctx) =>
  ctx.t(isSystemUser(row) ? 'host.userTable.system' : 'host.userTable.active');

/**
 * The columns of the users table, hyperweaver-ui's: the username with
 * the glyph of a system or a regular account, the uid, the gid, the
 * comment, the home directory cut from the front, the shell's name and
 * the status, system or active, as a badge.
 */
export const USER_COLUMNS = [
  {
    key: 'username',
    kind: 'name',
    labelKey: 'host.userTable.username',
    value: row => row.username || '',
    render: (row, ctx) => (
      <span>
        <UserGlyph row={row} ctx={ctx} />
        <strong>{row.username}</strong>
      </span>
    ),
  },
  {
    key: 'uid',
    kind: 'count',
    labelKey: 'host.userTable.uid',
    value: row => Number(row.uid) || 0,
    render: row => <span className="font-monospace">{row.uid}</span>,
  },
  {
    key: 'gid',
    kind: 'count',
    labelKey: 'host.userTable.gid',
    priority: 4,
    value: row => Number(row.gid) || 0,
    render: row => <span className="font-monospace">{row.gid}</span>,
  },
  {
    key: 'comment',
    kind: 'text',
    labelKey: 'host.userTable.comment',
    prose: true,
    priority: 5,
    value: row => row.comment || '',
    render: (row, ctx) => (
      <span className="small" title={row.comment}>
        {row.comment || notAvailable(ctx)}
      </span>
    ),
  },
  {
    key: 'home',
    kind: 'text',
    labelKey: 'host.userTable.homeDirectory',
    priority: 6,
    value: row => row.home || '',
    render: (row, ctx) => (
      <code className="small" title={row.home}>
        {shortHome(row.home) || notAvailable(ctx)}
      </code>
    ),
  },
  {
    key: 'shell',
    kind: 'text',
    labelKey: 'host.userTable.shell',
    priority: 5,
    value: row => row.shell || '',
    render: (row, ctx) => (
      <code className="small" title={row.shell}>
        {shellName(row.shell) || notAvailable(ctx)}
      </code>
    ),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.userTable.status',
    value: statusWord,
    render: (row, ctx) => (
      <span className={`badge text-bg-${isSystemUser(row) ? 'info' : 'success'}`}>
        {statusWord(row, ctx)}
      </span>
    ),
  },
];

/**
 * The filter group of the users table, the account's kind, system or
 * regular, hyperweaver-ui's status badge as pills.
 */
export const USER_FILTERS = [
  {
    key: 'kind',
    labelKey: 'host.userTable.status',
    values: row => [isSystemUser(row) ? 'system' : 'active'],
    order: ['active', 'system'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`host.userTable.${value}`),
  },
];

const BUTTONS = [
  {
    action: 'edit',
    Icon: FaPen,
    tone: 'secondary',
    labelKey: 'host.userTable.editUser',
    low: true,
  },
  {
    action: 'password',
    Icon: FaKey,
    tone: 'info',
    labelKey: 'host.userTable.setPassword',
    low: true,
  },
  {
    action: 'lock',
    Icon: FaLock,
    tone: 'warning',
    labelKey: 'host.userTable.lockAccount',
    low: false,
  },
  {
    action: 'details',
    Icon: FaCircleInfo,
    tone: 'secondary',
    labelKey: 'host.userTable.viewDetails',
    low: true,
  },
  {
    action: 'delete',
    Icon: FaTrash,
    tone: 'danger',
    labelKey: 'host.userTable.deleteUser',
    low: false,
  },
];

/**
 * The actions of one row of the users table, hyperweaver-ui's row
 * buttons: Edit, Set password, Lock account and Delete for an account
 * whose uid is a hundred or more, and View details, every button held
 * while a request is in flight; Lock and Delete open the typed
 * confirmation in the section.
 */
export const UserRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  const low = isLowUid(row);
  return (
    <span className="d-inline-flex align-items-center gap-1" data-user={row.username}>
      {BUTTONS.filter(button => button.low || !low).map(({ action, Icon, tone, labelKey }) => (
        <button
          key={action}
          type="button"
          className={`btn btn-sm btn-outline-${tone}`}
          title={t(labelKey)}
          aria-label={t(labelKey)}
          data-action={action}
          disabled={busy}
          onClick={() => onAction(action, row)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </span>
  );
};

UserRowActions.propTypes = {
  row: PropTypes.shape({
    username: PropTypes.string.isRequired,
    uid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
