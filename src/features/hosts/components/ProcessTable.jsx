import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaBolt, FaCircleInfo, FaUser, FaUserShield, FaXmark } from 'react-icons/fa6';

import { hasAny } from '../../../components/common/SubTable';
import { formatCpu, parseMemorySize, truncateCommand } from '../utils/manage';

const notAvailable = ctx => ctx.t('host.processTable.notAvailable');

const ROOT = 'root';

const UserCell = ({ row, ctx }) => {
  const Icon = row.username === ROOT ? FaUserShield : FaUser;
  return (
    <span>
      <Icon className={`${row.username === ROOT ? 'text-danger' : 'text-info'} me-2`} aria-hidden />
      {row.username || notAvailable(ctx)}
    </span>
  );
};

UserCell.propTypes = {
  row: PropTypes.shape({ username: PropTypes.string }).isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The columns of the processes table, hyperweaver-ui's: the pid with
 * its parent under it, the user with the glyph of root, the zone as a
 * badge, the processor share and the resident size while the request
 * asked for the detail, both sorted by their number, and the command
 * cut to fifty characters, the whole line its tooltip.
 */
export const PROCESS_COLUMNS = [
  {
    key: 'pid',
    kind: 'name',
    labelKey: 'host.processTable.pid',
    value: row => Number(row.pid) || 0,
    render: (row, ctx) => (
      <span>
        <span className="font-monospace fw-bold">{row.pid}</span>
        {row.ppid ? (
          <span className="d-block small text-muted">
            {ctx.t('host.processTable.ppid')}: {row.ppid}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'username',
    kind: 'text',
    labelKey: 'host.processTable.user',
    priority: 3,
    value: row => row.username || '',
    render: (row, ctx) => <UserCell row={row} ctx={ctx} />,
  },
  {
    key: 'zone',
    kind: 'badge',
    labelKey: 'host.processTable.zone',
    priority: 4,
    when: hasAny(row => row.zone),
    value: row => row.zone || '',
    render: row =>
      row.zone ? (
        <span className={`badge text-bg-${row.zone === 'global' ? 'primary' : 'info'}`}>
          {row.zone}
        </span>
      ) : null,
  },
  {
    key: 'cpu_percent',
    kind: 'count',
    labelKey: 'host.processTable.cpuPercent',
    priority: 2,
    when: (rows, ctx) => rows.length > 0 && ctx.detailed,
    value: row => parseFloat(row.cpu_percent) || 0,
    render: (row, ctx) => (
      <span className="font-monospace">{formatCpu(row.cpu_percent) || notAvailable(ctx)}</span>
    ),
  },
  {
    key: 'rss',
    kind: 'size',
    labelKey: 'host.processTable.memory',
    priority: 2,
    when: (rows, ctx) => rows.length > 0 && ctx.detailed,
    value: row => parseMemorySize(row.rss),
    render: (row, ctx) => <span className="font-monospace">{row.rss || notAvailable(ctx)}</span>,
  },
  {
    key: 'command',
    kind: 'text',
    labelKey: 'host.processTable.command',
    prose: true,
    value: row => row.command || '',
    render: (row, ctx) => (
      <span className="font-monospace small" title={row.command}>
        {row.command ? truncateCommand(row.command) : notAvailable(ctx)}
      </span>
    ),
  },
];

/**
 * The actions of one row of the processes table, hyperweaver-ui's row
 * buttons: View details, Send signal and Kill process, each held while
 * a request is in flight.
 */
export const ProcessRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-process={row.pid}>
      <button
        type="button"
        className="btn btn-sm btn-outline-info"
        title={t('host.processTable.viewProcessDetails')}
        aria-label={t('host.processTable.viewProcessDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-warning"
        title={t('host.processTable.sendSignal')}
        aria-label={t('host.processTable.sendSignal')}
        data-action="signal"
        disabled={busy}
        onClick={() => onAction('signal', row)}
      >
        <FaBolt aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('host.processTable.killProcess')}
        aria-label={t('host.processTable.killProcess')}
        data-action="kill"
        disabled={busy}
        onClick={() => onAction('kill', row)}
      >
        <FaXmark aria-hidden="true" />
      </button>
    </span>
  );
};

ProcessRowActions.propTypes = {
  row: PropTypes.shape({
    pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
