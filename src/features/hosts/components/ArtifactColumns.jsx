import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowsTurnRight, FaCopy, FaDownload, FaTriangleExclamation } from 'react-icons/fa6';

import { artifactStatusOf, formatSize } from '../utils/manageCatalog';
import { artifactVersionOf } from '../utils/roleFiles';

const STATUS_KEYS = {
  missing: ['host.installerFiles.statusMissing', 'host.installerFiles.statusMissingTitle'],
  mismatch: ['host.installerFiles.statusMismatch', 'host.installerFiles.statusMismatchTitle'],
  verified: ['host.installerFiles.statusVerified', 'host.installerFiles.statusVerifiedTitle'],
  unhashed: ['host.installerFiles.statusUnhashed', 'host.installerFiles.statusUnhashedTitle'],
  hashed: ['host.installerFiles.statusHashed', 'host.installerFiles.statusHashedTitle'],
};

const statusTitle = (state, t) => {
  const [, titleKey] = STATUS_KEYS[state.key];
  const values =
    state.key === 'mismatch'
      ? {
          ...state.values,
          expected: state.values.expected || t('host.installerFiles.recordedExpectation'),
        }
      : state.values;
  return t(titleKey, values);
};

const MissingGlyph = ({ row, ctx }) => {
  const label = ctx.t('host.installerFiles.fetchMissing', { filename: row.filename });
  return (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 text-warning"
      title={label}
      aria-label={label}
      data-action="artifact-fetch"
      onClick={() => ctx.onMissing(row)}
    >
      <FaTriangleExclamation aria-hidden="true" />
    </button>
  );
};

MissingGlyph.propTypes = {
  row: PropTypes.shape({ filename: PropTypes.string }).isRequired,
  ctx: PropTypes.shape({
    t: PropTypes.func.isRequired,
    onMissing: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The columns of the artifacts table, hyperweaver-ui's: the file name,
 * a warning glyph before it on a missing file that opens the sources
 * through `ctx.onMissing`, the type, the location, the role, the
 * version, the size and the status as a badge in its tone with its
 * tooltip.
 */
export const ARTIFACT_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'host.installerFiles.colFilename',
    value: row => row.filename || '',
    render: (row, ctx) => (
      <span className="d-inline-flex align-items-center gap-2">
        {row.file_exists === false && ctx.onMissing ? <MissingGlyph row={row} ctx={ctx} /> : null}
        <code className="small">{row.filename}</code>
      </span>
    ),
  },
  {
    key: 'file_type',
    kind: 'word',
    labelKey: 'host.installerFiles.colType',
    priority: 2,
    value: row => row.file_type || '',
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'host.installerFiles.colLocation',
    priority: 4,
    value: row => row.storage_location?.name || '',
    render: row => <span className="small">{row.storage_location?.name || '-'}</span>,
  },
  {
    key: 'role',
    kind: 'word',
    labelKey: 'host.installerFiles.colRole',
    priority: 4,
    value: row => row.role || '',
    render: row => row.role || '-',
  },
  {
    key: 'version',
    kind: 'text',
    labelKey: 'host.installerFiles.colVersion',
    priority: 5,
    value: row => artifactVersionOf(row).full_version,
    render: row => <span className="small">{artifactVersionOf(row).full_version || '-'}</span>,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.installerFiles.colSize',
    value: row => Number(row.size) || 0,
    render: row => <span className="small">{formatSize(row.size)}</span>,
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.installerFiles.colStatus',
    value: row => artifactStatusOf(row).key,
    render: (row, ctx) => {
      const state = artifactStatusOf(row);
      return (
        <span className={`badge text-bg-${state.tone}`} title={statusTitle(state, ctx.t)}>
          {ctx.t(STATUS_KEYS[state.key][0])}
        </span>
      );
    },
  },
];

/**
 * The filter groups of the artifacts table: the status of the file and
 * the role.
 */
export const ARTIFACT_FILTERS = [
  {
    key: 'status',
    labelKey: 'host.installerFiles.colStatus',
    values: row => [artifactStatusOf(row).key],
    order: Object.keys(STATUS_KEYS),
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(STATUS_KEYS[value][0]),
  },
  {
    key: 'role',
    labelKey: 'host.installerFiles.colRole',
    values: row => (row.role ? [row.role] : []),
    activeClass: 'bg-info',
    labelFor: value => value,
  },
];

/**
 * The actions of one row of the artifacts table, hyperweaver-ui's:
 * Download, Move to location and Copy to location, each held while the
 * file is missing.
 */
export const ArtifactRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  const missing = row.file_exists === false;
  const actions = [
    ['download', FaDownload, 'host.installerFiles.download'],
    ['move', FaArrowsTurnRight, 'host.installerFiles.moveToLocation'],
    ['copy', FaCopy, 'host.installerFiles.copyToLocation'],
  ];
  return (
    <span className="d-inline-flex align-items-center gap-1" data-artifact={row.id}>
      {actions.map(([action, Icon, labelKey]) => (
        <button
          key={action}
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={t(labelKey)}
          aria-label={t(labelKey)}
          data-action={action}
          disabled={busy || missing}
          onClick={() => onAction(action, row)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </span>
  );
};

ArtifactRowActions.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    file_exists: PropTypes.bool,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
