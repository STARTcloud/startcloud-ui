import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCirclePause,
  FaCircleXmark,
  FaPause,
  FaPen,
  FaPlay,
  FaTrash,
} from 'react-icons/fa6';

import {
  formatLocation,
  isEnabled,
  repositoryStatus,
  repositoryType,
  usesProxy,
} from '../utils/repositories';

const STATUS_GLYPHS = {
  online: { Icon: FaCircleCheck, tone: 'text-success' },
  disabled: { Icon: FaCirclePause, tone: 'text-warning' },
  offline: { Icon: FaCircleXmark, tone: 'text-danger' },
};

const StatusGlyph = ({ row }) => {
  const { Icon, tone } = STATUS_GLYPHS[repositoryStatus(row).status];
  return <Icon className={`${tone} me-2`} aria-hidden="true" />;
};

StatusGlyph.propTypes = {
  row: PropTypes.object.isRequired,
};

/**
 * The columns of the repositories table, hyperweaver-ui's: the publisher
 * with the glyph of its status, the type and the status as badges, the
 * location cut to fifty characters and whether a proxy is used.
 */
export const REPOSITORY_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.repositoryTable.publisher',
    value: row => row.name || '',
    render: row => (
      <span>
        <StatusGlyph row={row} />
        <strong className="font-monospace">{row.name}</strong>
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.repositoryTable.type',
    value: row => row.type || '',
    render: (row, ctx) => {
      const type = repositoryType(row.type);
      return (
        <span className={`badge text-bg-${type.tone}`}>
          {type.key ? ctx.t(type.key) : type.text}
        </span>
      );
    },
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.repositoryTable.status',
    value: row => repositoryStatus(row).status,
    render: (row, ctx) => {
      const status = repositoryStatus(row);
      return <span className={`badge text-bg-${status.tone}`}>{ctx.t(status.key)}</span>;
    },
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'host.repositoryTable.location',
    priority: 4,
    value: row => row.location || '',
    render: row => (
      <span className="small font-monospace" title={row.location}>
        {formatLocation(row.location)}
      </span>
    ),
  },
  {
    key: 'proxy',
    kind: 'badge',
    labelKey: 'host.repositoryTable.proxy',
    priority: 5,
    value: row => (usesProxy(row.proxy) ? 'yes' : 'no'),
    render: (row, ctx) =>
      usesProxy(row.proxy) ? (
        <span className="badge text-bg-warning">{ctx.t('host.repositoryTable.yes')}</span>
      ) : (
        <span className="badge text-bg-secondary">{ctx.t('host.repositoryTable.no')}</span>
      ),
  },
];

/**
 * The actions of one row of the repositories table, hyperweaver-ui's
 * row buttons: Disable while enabled and Enable otherwise, Edit and
 * Delete, every button held while a request is in flight, Delete
 * opening the typed confirmation.
 */
export const RepositoryRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  const enabled = isEnabled(row);
  const toggle = enabled ? 'disable' : 'enable';
  const ToggleIcon = enabled ? FaPause : FaPlay;
  return (
    <span className="d-inline-flex align-items-center gap-1" data-repository={row.name}>
      <button
        type="button"
        className={`btn btn-sm btn-outline-${enabled ? 'warning' : 'success'}`}
        title={t(`host.repositoryTable.${toggle}`)}
        aria-label={t(`host.repositoryTable.${toggle}`)}
        data-action={toggle}
        disabled={busy}
        onClick={() => onAction(toggle, row)}
      >
        <ToggleIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.repositoryTable.editRepository')}
        aria-label={t('host.repositoryTable.editRepository')}
        data-action="edit"
        disabled={busy}
        onClick={() => onAction('edit', row)}
      >
        <FaPen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('host.repositoryTable.deleteRepository')}
        aria-label={t('host.repositoryTable.deleteRepository')}
        data-action="delete"
        disabled={busy}
        onClick={() => onAction('delete', row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

RepositoryRowActions.propTypes = {
  row: PropTypes.shape({
    name: PropTypes.string.isRequired,
    enabled: PropTypes.bool,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
