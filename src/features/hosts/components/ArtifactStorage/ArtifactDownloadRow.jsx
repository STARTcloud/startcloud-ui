import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCircleExclamation,
  FaCircleQuestion,
  FaCircleXmark,
  FaClock,
  FaDownload,
  FaSpinner,
  FaUpload,
  FaXmark,
} from 'react-icons/fa6';

import { formatFileSize } from '../../../../utils/formatFileSize';
import { transferStatusKey, transferTone } from '../../utils/artifacts';
import { formatTaskDate } from '../../utils/tasks';

const MIB = 1024 * 1024;

const URL_LENGTH = 50;

const STATUS_GLYPHS = {
  queued: { Icon: FaClock, tone: 'text-info' },
  running: { Icon: FaSpinner, tone: 'text-primary' },
  completed: { Icon: FaCircleCheck, tone: 'text-success' },
  failed: { Icon: FaCircleXmark, tone: 'text-danger' },
};

const statusWord = (status, t) => {
  const key = transferStatusKey(status);
  return key ? t(key) : String(status || '');
};

const shortUrl = url => (url.length > URL_LENGTH ? `${url.substring(0, URL_LENGTH - 3)}...` : url);

const StatusGlyph = ({ status }) => {
  const { Icon, tone } = STATUS_GLYPHS[status] || { Icon: FaCircleQuestion, tone: 'text-muted' };
  return <Icon className={`me-2 ${tone}`} aria-hidden="true" />;
};

StatusGlyph.propTypes = {
  status: PropTypes.string,
};

const sizeText = (row, t) => {
  const info = row.progress_info || {};
  if (info.total_mb) {
    return `${formatFileSize(info.downloaded_mb * MIB)} / ${formatFileSize(info.total_mb * MIB)}`;
  }
  if (info.file_size_mb) {
    return formatFileSize(info.file_size_mb * MIB);
  }
  return t(
    row.status === 'running'
      ? 'artifacts.artifactDownloadRow.processingStatus'
      : 'artifacts.artifactDownloadRow.pendingStatus'
  );
};

/**
 * The columns of the transfers in flight, hyperweaver-ui's download
 * rows: the file with its status glyph and the URL of a download, the
 * status, the bytes so far and the speed, the storage location and when
 * it started.
 */
export const TRANSFER_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'artifacts.artifactTable.filenameHeader',
    value: (row, ctx) => row.filename || ctx.t('artifacts.artifactDownloadRow.downloadingLabel'),
    render: (row, ctx) => {
      const Kind = row.isUpload ? FaUpload : FaDownload;
      return (
        <span className="d-inline-flex align-items-center">
          <StatusGlyph status={row.status} />
          <span>
            <span className="fw-semibold text-muted">
              {row.filename || ctx.t('artifacts.artifactDownloadRow.downloadingLabel')}
            </span>
            <span className="d-block small text-muted">
              <Kind className="me-1" aria-hidden="true" />
              {row.url ? <span title={row.url}>{shortUrl(row.url)}</span> : null}
            </span>
          </span>
        </span>
      );
    },
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'hosts.manage.artifacts.column.status',
    value: (row, ctx) => statusWord(row.status, ctx.t),
    render: (row, ctx) => (
      <span className={`badge text-bg-${transferTone(row.status)}`}>
        {statusWord(row.status, ctx.t)}
        {row.progress_percent > 0 && row.status === 'running' ? ` ${row.progress_percent}%` : ''}
      </span>
    ),
  },
  {
    key: 'size',
    kind: 'text',
    labelKey: 'artifacts.artifactTable.sizeHeader',
    value: row => Number(row.progress_info?.downloaded_mb) || 0,
    render: (row, ctx) => (
      <span>
        <span className="fw-semibold">{sizeText(row, ctx.t)}</span>
        {row.progress_info?.speed_kbps ? (
          <span className="d-block small text-muted">
            {Math.round(row.progress_info.speed_kbps / 1024)} MB/s
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'artifacts.artifactTable.storageLocationHeader',
    priority: 5,
    value: row => row.storage_location?.name || '',
    render: row =>
      row.storage_location ? (
        <span>
          <span className="fw-semibold small text-muted">{row.storage_location.name}</span>
          <span className="d-block small text-muted">{row.storage_location.path}</span>
        </span>
      ) : null,
  },
  {
    key: 'started',
    kind: 'date',
    labelKey: 'artifacts.artifactTable.addedHeader',
    value: row => new Date(row.created_at).getTime(),
    render: row => formatTaskDate(row.created_at),
  },
];

/**
 * The actions of one transfer's row, hyperweaver-ui's: the failure
 * mark carrying the error while it failed, and Cancel while it is
 * queued or running, which drops it from the list.
 */
export const TransferRowActions = ({ row, onCancel }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-transfer={row.taskId}>
      {row.status === 'failed' && row.error_message ? (
        <span
          className="btn btn-sm btn-danger disabled"
          title={t('artifacts.artifactDownloadRow.downloadFailedTooltip', {
            error: row.error_message,
          })}
        >
          <FaCircleExclamation aria-hidden="true" />
        </span>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-warning"
        title={t('artifacts.artifactDownloadRow.cancelDownloadTooltip')}
        aria-label={t('artifacts.artifactDownloadRow.cancelDownloadTooltip')}
        data-action="cancel"
        onClick={() => onCancel(row.taskId)}
      >
        <FaXmark aria-hidden="true" />
      </button>
    </span>
  );
};

TransferRowActions.propTypes = {
  row: PropTypes.shape({
    taskId: PropTypes.string.isRequired,
    status: PropTypes.string,
    error_message: PropTypes.string,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
};
