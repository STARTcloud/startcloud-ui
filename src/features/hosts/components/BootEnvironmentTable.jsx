import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircle,
  FaCircleCheck,
  FaCheckDouble,
  FaClock,
  FaFolder,
  FaFolderOpen,
  FaPowerOff,
  FaTrash,
} from 'react-icons/fa6';

import {
  bootEnvironmentActions,
  bootEnvironmentStatus,
  formatBootEnvironmentDate,
  policyTone,
} from '../utils/bootEnvironments';

const STATUS_GLYPHS = {
  both: { Icon: FaCheckDouble, tone: 'text-success' },
  now: { Icon: FaCircleCheck, tone: 'text-success' },
  reboot: { Icon: FaClock, tone: 'text-info' },
  inactive: { Icon: FaCircle, tone: 'text-muted' },
};

const ACTIONS = {
  activate: {
    Icon: FaPowerOff,
    tone: 'success',
    labelKey: 'host.bootEnvironmentTable.labelActivate',
  },
  mount: { Icon: FaFolderOpen, tone: 'info', labelKey: 'host.bootEnvironmentTable.labelMount' },
  unmount: { Icon: FaFolder, tone: 'warning', labelKey: 'host.bootEnvironmentTable.labelUnmount' },
  delete: { Icon: FaTrash, tone: 'danger', labelKey: 'host.bootEnvironmentTable.labelDelete' },
};

const StatusGlyph = ({ row }) => {
  const { Icon, tone } = STATUS_GLYPHS[bootEnvironmentStatus(row).status];
  return <Icon className={`${tone} me-2`} aria-hidden="true" />;
};

StatusGlyph.propTypes = {
  row: PropTypes.object.isRequired,
};

/**
 * The columns of the boot environments table, hyperweaver-ui's: the
 * name with the glyph of its status and the temporary badge, the active
 * status as its short badge and word, the mountpoint, the space, the
 * policy as a badge and the creation date.
 */
export const BOOT_ENVIRONMENT_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.bootEnvironmentTable.bootEnv',
    value: row => row.name || '',
    render: (row, ctx) => (
      <span>
        <StatusGlyph row={row} />
        <strong className="font-monospace">{row.name}</strong>
        {row.is_temporary ? (
          <span className="badge text-bg-warning ms-2">
            {ctx.t('host.bootEnvironmentTable.temporary')}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.bootEnvironmentTable.activeStatus',
    value: row => bootEnvironmentStatus(row).status,
    render: (row, ctx) => {
      const status = bootEnvironmentStatus(row);
      return (
        <span>
          <span className={`badge text-bg-${status.tone}`}>{status.badge}</span>
          <span className="ms-2 small">{ctx.t(status.key)}</span>
        </span>
      );
    },
  },
  {
    key: 'mountpoint',
    kind: 'text',
    labelKey: 'host.bootEnvironmentTable.mountpoint',
    priority: 4,
    value: row => row.mountpoint || '',
    render: (row, ctx) => (
      <span className="font-monospace small">
        {row.mountpoint === '-' || !row.mountpoint
          ? ctx.t('host.bootEnvironmentTable.notMounted')
          : row.mountpoint}
      </span>
    ),
  },
  {
    key: 'space',
    kind: 'size',
    labelKey: 'host.bootEnvironmentTable.spaceUsed',
    value: row => row.space || '',
    render: (row, ctx) => row.space || ctx.t('host.bootEnvironmentTable.notAvailable'),
  },
  {
    key: 'policy',
    kind: 'badge',
    labelKey: 'host.bootEnvironmentTable.policy',
    priority: 4,
    value: row => row.policy || '',
    render: (row, ctx) => {
      const word = String(row.policy || '').toLowerCase();
      const known = word === 'static' || word === 'dynamic';
      return (
        <span className={`badge text-bg-${policyTone(row.policy)}`}>
          {known
            ? ctx.t(`host.bootEnvironmentTable.policy${word === 'static' ? 'Static' : 'Dynamic'}`)
            : row.policy || ctx.t('host.bootEnvironmentTable.unknown')}
        </span>
      );
    },
  },
  {
    key: 'created',
    kind: 'date',
    labelKey: 'host.bootEnvironmentTable.created',
    value: row => new Date(row.created || 0).getTime() || 0,
    render: row => <span className="small">{formatBootEnvironmentDate(row.created)}</span>,
  },
];

/**
 * The actions of one row of the boot environments table,
 * hyperweaver-ui's row buttons: Activate unless it is active on reboot,
 * Mount or Unmount, and Delete unless it is active, every button held
 * while a request is in flight, each opening its confirmation.
 */
export const BootEnvironmentRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-boot-environment={row.name}>
      {bootEnvironmentActions(row).map(action => {
        const { Icon, tone, labelKey } = ACTIONS[action];
        return (
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
        );
      })}
    </span>
  );
};

BootEnvironmentRowActions.propTypes = {
  row: PropTypes.shape({
    name: PropTypes.string.isRequired,
    is_active_now: PropTypes.bool,
    is_active_on_reboot: PropTypes.bool,
    mountpoint: PropTypes.string,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
