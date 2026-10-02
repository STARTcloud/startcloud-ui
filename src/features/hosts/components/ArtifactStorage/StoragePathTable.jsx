import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCompactDisc,
  FaFolder,
  FaHardDrive,
  FaPause,
  FaPen,
  FaPlay,
  FaTrash,
} from 'react-icons/fa6';

import { useCssVar } from '../../../../hooks/useCssVar';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { getDiskUsageColor, parseUsagePercentage } from '../../utils/artifacts';
import { formatTaskDate } from '../../utils/tasks';

const TYPE_GLYPHS = { iso: FaCompactDisc, image: FaHardDrive };

const TYPE_KEYS = {
  iso: 'hosts.manage.artifacts.type.iso',
  image: 'hosts.manage.artifacts.type.image',
};

const typeWord = (type, t) => (TYPE_KEYS[type] ? t(TYPE_KEYS[type]) : String(type || ''));

const instantOf = value => (value ? new Date(value).getTime() : 0);

const TypeGlyph = ({ type }) => {
  const Glyph = TYPE_GLYPHS[String(type || '').toLowerCase()] || FaFolder;
  return <Glyph className="me-2 text-secondary" aria-hidden="true" />;
};

TypeGlyph.propTypes = {
  type: PropTypes.string,
};

const NameCell = ({ row, ctx }) => (
  <span className="d-inline-flex align-items-center">
    <TypeGlyph type={row.type} />
    <button
      type="button"
      className="btn btn-link p-0 fw-bold"
      data-action="open-artifacts"
      title={ctx.t('artifacts.storagePathTable.viewArtifactsTooltip', {
        name: row.name,
        count: row.file_count || 0,
      })}
      onClick={() => ctx.onStoragePath(row)}
    >
      {row.name}
      <FaArrowUpRightFromSquare className="ms-1 small" aria-hidden="true" />
    </button>
  </span>
);

NameCell.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.shape({
    t: PropTypes.func.isRequired,
    onStoragePath: PropTypes.func.isRequired,
  }).isRequired,
};

const UsageBar = ({ usage }) => {
  const { t } = useTranslation();
  const bar = useRef(null);
  const percentage = parseUsagePercentage(usage.use_percent);
  useCssVar(bar, '--progress-width', `${percentage}%`);
  const label = `${usage.used} / ${usage.total} (${usage.use_percent})`;
  return (
    <span className="d-inline-flex flex-column artifact-usage" title={label}>
      <span
        className="progress task-progress"
        role="progressbar"
        aria-label={t('artifacts.storagePathTable.diskUsageLabel')}
      >
        <span ref={bar} className={`progress-bar progress-fill ${getDiskUsageColor(percentage)}`} />
      </span>
      <small className="text-muted">{label}</small>
    </span>
  );
};

UsageBar.propTypes = {
  usage: PropTypes.shape({
    used: PropTypes.string,
    total: PropTypes.string,
    use_percent: PropTypes.string,
  }).isRequired,
};

/**
 * The columns of the storage locations table, hyperweaver-ui's: the
 * name, a button opening the location's artifacts, the path, the type,
 * whether it is enabled, its file count, its size, its last scan and
 * its disk usage as a bar.
 */
export const STORAGE_PATH_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'artifacts.storagePathTable.nameHeader',
    value: row => row.name || '',
    render: (row, ctx) => <NameCell row={row} ctx={ctx} />,
  },
  {
    key: 'path',
    kind: 'text',
    labelKey: 'artifacts.storagePathTable.pathHeader',
    priority: 4,
    value: row => row.path || '',
    render: row => (
      <code className="small" title={row.path}>
        {row.path}
      </code>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'artifacts.storagePathTable.typeHeader',
    value: (row, ctx) => typeWord(String(row.type || '').toLowerCase(), ctx.t),
    render: (row, ctx) => {
      const type = String(row.type || '').toLowerCase();
      return (
        <span className={`badge text-bg-${type === 'iso' ? 'info' : 'warning'}`}>
          {typeWord(type, ctx.t)}
        </span>
      );
    },
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'artifacts.storagePathTable.statusHeader',
    value: (row, ctx) =>
      ctx.t(row.enabled ? 'hosts.manage.artifacts.enabled' : 'hosts.manage.artifacts.disabled'),
    render: (row, ctx) => (
      <span className={`badge text-bg-${row.enabled ? 'success' : 'danger'}`}>
        {ctx.t(row.enabled ? 'hosts.manage.artifacts.enabled' : 'hosts.manage.artifacts.disabled')}
      </span>
    ),
  },
  {
    key: 'files',
    kind: 'count',
    labelKey: 'artifacts.storagePathTable.filesHeader',
    value: row => Number(row.file_count) || 0,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'artifacts.storagePathTable.sizeHeader',
    value: row => Number(row.total_size) || 0,
    render: row => formatFileSize(row.total_size),
  },
  {
    key: 'lastScan',
    kind: 'date',
    labelKey: 'artifacts.storagePathTable.lastScanHeader',
    priority: 5,
    value: row => instantOf(row.last_scan_at),
    render: (row, ctx) =>
      row.last_scan_at ? formatTaskDate(row.last_scan_at) : ctx.t('hosts.manage.artifacts.never'),
  },
  {
    key: 'usage',
    kind: 'text',
    labelKey: 'artifacts.storagePathTable.usageHeader',
    priority: 6,
    value: row => parseUsagePercentage(row.disk_usage?.use_percent),
    render: (row, ctx) =>
      row.disk_usage?.use_percent ? (
        <UsageBar usage={row.disk_usage} />
      ) : (
        <span className="text-muted small">{ctx.t('artifacts.storagePathTable.notAvailable')}</span>
      ),
  },
];

/**
 * The filter group of the storage locations, the type.
 */
export const STORAGE_PATH_FILTERS = [
  {
    key: 'type',
    labelKey: 'artifacts.storagePathTable.typeHeader',
    values: row => [String(row.type || '').toLowerCase()],
    order: ['iso', 'image'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => typeWord(value, t),
  },
];

/**
 * The actions of one storage location's row, hyperweaver-ui's: Edit,
 * Disable or Enable by its state, and Delete; every button held while a
 * request is in flight.
 */
export const StoragePathRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  const toggle = row.enabled
    ? { tone: 'warning', Icon: FaPause, label: t('artifacts.storagePathTable.disableTooltip') }
    : { tone: 'success', Icon: FaPlay, label: t('artifacts.storagePathTable.enableTooltip') };
  return (
    <span className="d-inline-flex align-items-center gap-1" data-storage-path={row.name}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('artifacts.storagePathTable.editTooltip')}
        aria-label={t('artifacts.storagePathTable.editTooltip')}
        data-action="edit"
        disabled={busy}
        onClick={() => onAction('edit', row)}
      >
        <FaPen aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`btn btn-sm btn-outline-${toggle.tone}`}
        title={toggle.label}
        aria-label={toggle.label}
        data-action="toggle"
        disabled={busy}
        onClick={() => onAction('toggle', row)}
      >
        <toggle.Icon aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('artifacts.storagePathTable.deleteTooltip')}
        aria-label={t('artifacts.storagePathTable.deleteTooltip')}
        data-action="delete"
        disabled={busy}
        onClick={() => onAction('delete', row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

StoragePathRowActions.propTypes = {
  row: PropTypes.shape({
    name: PropTypes.string,
    enabled: PropTypes.bool,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
