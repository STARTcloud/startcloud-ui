import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaArrowsTurnRight,
  FaCopy,
  FaDownload,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import { artifactStatusOf, formatSize } from '../utils/manageCatalog';

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

/**
 * The columns of the artifacts table, hyperweaver-ui's: the type, the
 * location, the role, the file name, the version, the size and the
 * status as a badge in its tone with its tooltip.
 */
export const ARTIFACT_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'host.installerFiles.colFilename',
    value: row => row.filename || '',
    render: row => <code className="small">{row.filename}</code>,
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
    value: row => row.version || '',
    render: row => <span className="small">{row.version || '-'}</span>,
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

const LocationRow = ({ location, busy, onAction }) => {
  const { t } = useTranslation();
  const disabled = location.enabled === false;
  const builtIn = location.source === 'builtin';
  return (
    <div
      className="d-flex align-items-center gap-2 flex-wrap"
      data-location={location.id}
      data-enabled={!disabled}
    >
      <span className="badge text-bg-info">{location.type}</span>
      <span className="fw-semibold small">{location.name}</span>
      <code className="small">{location.path}</code>
      {builtIn ? (
        <span className="badge text-bg-light">{t('host.installerFiles.builtIn')}</span>
      ) : null}
      {disabled ? (
        <span className="badge text-bg-secondary">{t('host.installerFiles.disabled')}</span>
      ) : null}
      <span className="text-muted small">
        {t('host.installerFiles.filesSize', {
          count: location.file_count ?? 0,
          size: formatSize(location.total_size),
        })}
      </span>
      {location.scan_errors > 0 ? (
        <FaTriangleExclamation
          className="text-warning"
          data-note="scan-errors"
          title={
            location.last_error_message ||
            t('host.installerFiles.scanErrorsCount', { count: location.scan_errors })
          }
        />
      ) : null}
      <span className="ms-auto d-inline-flex gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-warning py-0"
          title={t('host.installerFiles.scanThisLocation')}
          aria-label={t('host.installerFiles.scanThisLocation')}
          data-action="location-scan"
          onClick={() => onAction('scan', location)}
          disabled={busy}
        >
          <FaMagnifyingGlass aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0"
          title={t(disabled ? 'host.installerFiles.enable' : 'host.installerFiles.disable')}
          aria-label={t(disabled ? 'host.installerFiles.enable' : 'host.installerFiles.disable')}
          data-action="location-toggle"
          onClick={() => onAction('toggle', location)}
          disabled={busy}
        >
          {disabled ? <FaToggleOff aria-hidden="true" /> : <FaToggleOn aria-hidden="true" />}
        </button>
        {builtIn ? null : (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning py-0"
              title={t('host.installerFiles.edit')}
              aria-label={t('host.installerFiles.edit')}
              data-action="location-edit"
              onClick={() => onAction('edit', location)}
              disabled={busy}
            >
              <FaPenToSquare aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger py-0"
              title={t('host.installerFiles.deleteThisLocation')}
              aria-label={t('host.installerFiles.deleteThisLocation')}
              data-action="location-delete"
              onClick={() => onAction('delete', location)}
              disabled={busy}
            >
              <FaTrash aria-hidden="true" />
            </button>
          </>
        )}
      </span>
    </div>
  );
};

LocationRow.propTypes = {
  location: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

/**
 * The storage locations card, hyperweaver-ui's: one line a location
 * with its type, its name, its path, its built-in and disabled badges,
 * its file count and size, the warning of its scan errors, and Scan,
 * Enable or Disable, Edit and Delete, the last two never of a built-in
 * one; Add location in its heading.
 */
export const LocationsCard = ({ locations, busy, onAction, onAdd }) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-3" data-panel="installer-locations">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
          <span className="fw-semibold">{t('host.installerFiles.storageLocations')}</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="location-add"
            onClick={onAdd}
            disabled={busy}
          >
            <FaPlus className="me-1" aria-hidden="true" />
            {t('host.installerFiles.addLocation')}
          </button>
        </div>
        <div className="d-flex flex-column gap-1">
          {locations.map(location => (
            <LocationRow key={location.id} location={location} busy={busy} onAction={onAction} />
          ))}
          {locations.length === 0 ? (
            <span className="text-muted small">{t('host.installerFiles.noLocationsYet')}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

LocationsCard.propTypes = {
  locations: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};
