import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCircleInfo,
  FaCircleMinus,
  FaCircleXmark,
  FaCompactDisc,
  FaCopy,
  FaDownload,
  FaEllipsis,
  FaFile,
  FaHardDrive,
  FaTrash,
  FaTruck,
} from 'react-icons/fa6';

import RowMenu from '../../../../components/common/RowMenu';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { artifactTypeOf, artifactTypeTone, checksumStateOf } from '../../utils/artifacts';
import { formatTaskDate } from '../../utils/tasks';

const TYPE_GLYPHS = { iso: FaCompactDisc, image: FaHardDrive, file: FaFile };

const TYPE_TEXT = { iso: 'text-info', image: 'text-warning', file: 'text-muted' };

const CHECKSUM = {
  verified: { Icon: FaCircleCheck, tone: 'text-success' },
  mismatch: { Icon: FaCircleXmark, tone: 'text-danger' },
  calculated: { Icon: FaCircleInfo, tone: 'text-info' },
  none: { Icon: FaCircleMinus, tone: 'text-muted' },
};

const instantOf = value => (value ? new Date(value).getTime() : 0);

const typeWord = (row, t) => {
  const type = artifactTypeOf(row.file_type, row.extension);
  return type === 'file'
    ? row.extension || t('hosts.manage.artifacts.type.file')
    : t(`hosts.manage.artifacts.type.${type}`);
};

/**
 * The glyph of an artifact's type, an ISO, a disk image or a file.
 */
export const ArtifactGlyph = ({ row }) => {
  const type = artifactTypeOf(row.file_type, row.extension);
  const Glyph = TYPE_GLYPHS[type];
  return <Glyph className={`me-2 ${TYPE_TEXT[type]}`} aria-hidden="true" />;
};

ArtifactGlyph.propTypes = {
  row: PropTypes.shape({ file_type: PropTypes.string, extension: PropTypes.string }).isRequired,
};

const ChecksumCell = ({ row, ctx }) => {
  const state = checksumStateOf(row);
  const { Icon, tone } = CHECKSUM[state];
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <span className={tone} title={ctx.t(`hosts.manage.artifacts.checksum.${state}`)}>
        <Icon aria-hidden="true" />
      </span>
      {row.checksum_algorithm ? (
        <span className="badge text-bg-light">{String(row.checksum_algorithm).toUpperCase()}</span>
      ) : null}
    </span>
  );
};

ChecksumCell.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.shape({ t: PropTypes.func.isRequired }).isRequired,
};

/**
 * The columns of the artifacts table, hyperweaver-ui's: the file name
 * with its type's glyph and a note for a file downloaded from a URL,
 * the type, the size, the checksum's state and algorithm, the storage
 * location and when it was added.
 */
export const ARTIFACT_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'artifacts.artifactTable.filenameHeader',
    value: row => row.filename || '',
    render: (row, ctx) => (
      <span className="d-inline-flex align-items-center">
        <ArtifactGlyph row={row} />
        <span>
          <span className="fw-semibold">{row.filename}</span>
          {row.source_url ? (
            <span className="d-block small text-muted">
              <FaDownload className="me-1" aria-hidden="true" />
              {ctx.t('artifacts.artifactRow.downloadedFromUrl')}
            </span>
          ) : null}
        </span>
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'artifacts.artifactTable.typeHeader',
    value: (row, ctx) => typeWord(row, ctx.t),
    render: (row, ctx) => (
      <span
        className={`badge text-bg-${artifactTypeTone(artifactTypeOf(row.file_type, row.extension))}`}
      >
        {typeWord(row, ctx.t)}
      </span>
    ),
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'artifacts.artifactTable.sizeHeader',
    value: row => Number(row.size) || 0,
    render: row => <span className="fw-semibold">{formatFileSize(row.size)}</span>,
  },
  {
    key: 'checksum',
    kind: 'badge',
    labelKey: 'artifacts.artifactTable.checksumHeader',
    priority: 4,
    value: (row, ctx) => ctx.t(`hosts.manage.artifacts.checksum.${checksumStateOf(row)}`),
    render: (row, ctx) => <ChecksumCell row={row} ctx={ctx} />,
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
          <span className="fw-semibold small">{row.storage_location.name}</span>
          <span className="d-block small text-muted">{row.storage_location.path}</span>
        </span>
      ) : null,
  },
  {
    key: 'added',
    kind: 'date',
    labelKey: 'artifacts.artifactTable.addedHeader',
    value: row => instantOf(row.discovered_at),
    render: row => (row.discovered_at ? formatTaskDate(row.discovered_at) : ''),
  },
];

/**
 * The filter groups of the artifacts table on the client, the type and
 * the checksum's state.
 */
export const ARTIFACT_FILTERS = [
  {
    key: 'kind',
    labelKey: 'artifacts.artifactTable.typeHeader',
    values: row => [artifactTypeOf(row.file_type, row.extension)],
    order: ['iso', 'image', 'file'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`hosts.manage.artifacts.type.${value}`),
  },
  {
    key: 'checksum',
    labelKey: 'artifacts.artifactTable.checksumHeader',
    values: row => [checksumStateOf(row)],
    order: ['verified', 'mismatch', 'calculated', 'none'],
    activeClass: 'bg-info',
    labelFor: (value, t) => t(`hosts.manage.artifacts.checksum.${value}`),
  },
];

/**
 * The actions of one artifact's row, hyperweaver-ui's: View details,
 * Delete and the More menu with Move and Copy; every button held while
 * a request is in flight.
 */
export const ArtifactRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-artifact={row.filename}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('artifacts.artifactRow.viewDetailsTooltip')}
        aria-label={t('artifacts.artifactRow.viewDetailsTooltip')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('artifacts.artifactRow.deleteArtifactTooltip')}
        aria-label={t('artifacts.artifactRow.deleteArtifactTooltip')}
        data-action="delete"
        disabled={busy}
        onClick={() => onAction('delete', row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
      <RowMenu label={<FaEllipsis aria-hidden="true" />}>
        <Dropdown.Item
          as="button"
          data-action="move"
          disabled={busy}
          onClick={() => onAction('move', row)}
        >
          <FaTruck className="me-2" aria-hidden="true" />
          {t('artifacts.artifactRow.moveOption')}
        </Dropdown.Item>
        <Dropdown.Item
          as="button"
          data-action="copy"
          disabled={busy}
          onClick={() => onAction('copy', row)}
        >
          <FaCopy className="me-2" aria-hidden="true" />
          {t('artifacts.artifactRow.copyOption')}
        </Dropdown.Item>
      </RowMenu>
    </span>
  );
};

ArtifactRowActions.propTypes = {
  row: PropTypes.shape({ id: PropTypes.string, filename: PropTypes.string }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
