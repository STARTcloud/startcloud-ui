import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFolderOpen, FaHardDrive, FaUpload } from 'react-icons/fa6';

import { artifactHashOf, shortHashOf } from '../utils/roleFiles';

import { PathInput } from './PathPicker';

export const SAFE_ID_SOURCES = ['cache', 'upload', 'path'];

export const SAFE_ID_KIND = 'safe_id';

const DOORS = [
  ['cache', FaHardDrive, 'provisioning.safeId.doorCache'],
  ['upload', FaUpload, 'provisioning.safeId.doorUpload'],
  ['path', FaFolderOpen, 'provisioning.safeId.doorPath'],
];

/**
 * The empty Safe ID pick, the host's cache as its door.
 *
 * @returns {{ source: string, artifact_id: string, name: string, path: string }} The pick
 */
export const emptySafeId = () => ({ source: 'cache', artifact_id: '', name: '', path: '' });

/**
 * The safe ID rows of the host's artifacts, the rows of kind `safe_id`
 * that are on the host.
 *
 * @param {Array<Object>|null} artifacts - The host's artifact rows
 * @returns {Array<Object>} The rows
 */
export const safeIdRowsOf = artifacts =>
  (Array.isArray(artifacts) ? artifacts : []).filter(
    row => row && row.file_type === SAFE_ID_KIND && row.file_exists !== false
  );

const SourceLine = ({ value, row }) => {
  const { t } = useTranslation();
  if (value.source === 'path') {
    const name = String(value.path || '')
      .split(/[\\/]/u)
      .pop();
    return value.path
      ? t('provisioning.safeId.sourcePath', { name })
      : t('provisioning.safeId.sourcePathNone');
  }
  if (value.source === 'upload') {
    return value.artifact_id
      ? t('provisioning.safeId.sourceUploaded', { name: value.name })
      : t('provisioning.safeId.sourceUploadNone');
  }
  if (!row) {
    return t('provisioning.safeId.sourceCacheNone');
  }
  return t('provisioning.safeId.sourceCache', {
    name: row.filename,
    hash: shortHashOf(artifactHashOf(row)),
  });
};

SourceLine.propTypes = {
  value: PropTypes.object.isRequired,
  row: PropTypes.object,
};

/**
 * The Safe ID control of the Provisioning step, one control with three
 * doors: a pick among the safe ID rows of the host's cache, an upload
 * into that cache as kind `safe_id`, or a file on the agent host through
 * the path picker, and under it the one line naming where the file
 * comes from; `value` is `{ source, artifact_id, name, path }`, `onUpload`
 * takes the chosen file and answers the artifact row it landed as.
 */
const SafeIdControl = ({ value, onChange, artifacts, host, onUpload, uploading, disabled }) => {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const rows = safeIdRowsOf(artifacts);
  const row = rows.find(entry => String(entry.id) === String(value.artifact_id)) || null;
  return (
    <div data-field="safe-id" data-safe-source={value.source}>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <div className="btn-group btn-group-sm" role="group">
          {DOORS.map(([source, Icon, labelKey]) => (
            <button
              key={source}
              type="button"
              className={`btn ${value.source === source ? 'btn-primary' : 'btn-outline-secondary'}`}
              data-action={`safe-id-${source}`}
              aria-pressed={value.source === source}
              disabled={disabled}
              onClick={() => onChange({ ...emptySafeId(), source })}
            >
              <Icon className="me-1" aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
        </div>
        {value.source === 'cache' ? (
          <select
            id="machine-setting-safe-id"
            className="form-select form-select-sm w-auto"
            aria-label={t('provisioning.safeId.pickAriaLabel')}
            value={value.artifact_id}
            disabled={disabled}
            onChange={event => {
              const picked = rows.find(entry => String(entry.id) === event.target.value) || null;
              onChange({
                ...value,
                artifact_id: picked ? String(picked.id) : '',
                name: picked ? picked.filename : '',
              });
            }}
          >
            <option value="">{t('provisioning.safeId.pickNone')}</option>
            {rows.map(entry => (
              <option key={entry.id} value={String(entry.id)}>
                {entry.filename}
              </option>
            ))}
          </select>
        ) : null}
        {value.source === 'upload' ? (
          <>
            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              id="machine-setting-safe-id-file"
              aria-label={t('provisioning.safeId.doorUpload')}
              onChange={event => {
                const [file] = event.target.files || [];
                if (file) {
                  onUpload(file);
                }
                event.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="safe-id-choose"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
              ) : (
                <FaUpload className="me-1" aria-hidden="true" />
              )}
              {t('provisioning.safeId.chooseFile')}
            </button>
            {value.name ? <code className="small">{value.name}</code> : null}
          </>
        ) : null}
        {value.source === 'path' ? (
          <div className="flex-grow-1 hw-safe-id-path">
            <PathInput
              id="machine-setting-safe-id"
              className="form-control form-control-sm font-monospace"
              value={value.path}
              onChange={next => onChange({ ...value, path: next })}
              {...host}
              mode="file"
              pickTitle={t('provisioning.safeId.pickTitle')}
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>
      <p className="form-text text-muted mb-0" data-note="safe-id-source">
        <SourceLine value={value} row={row} />
      </p>
    </div>
  );
};

SafeIdControl.propTypes = {
  value: PropTypes.shape({
    source: PropTypes.oneOf(SAFE_ID_SOURCES).isRequired,
    artifact_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  artifacts: PropTypes.array,
  host: PropTypes.shape({
    status: PropTypes.object.isRequired,
    hostId: PropTypes.string.isRequired,
    server: PropTypes.object,
  }).isRequired,
  onUpload: PropTypes.func.isRequired,
  uploading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default SafeIdControl;
