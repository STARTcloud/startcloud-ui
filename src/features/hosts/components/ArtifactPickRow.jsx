import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaDownload, FaPlus, FaXmark } from 'react-icons/fa6';

import { artifactHashOf, artifactPresent, artifactSourceOf, pickTextOf } from '../utils/roleFiles';

const FILE_STATE_TONES = {
  present: 'text-bg-success',
  missing: 'text-bg-warning',
  queued: 'text-bg-info',
};

const sourceKey = row => `provisioning.provisioningRolesTab.via.${artifactSourceOf(row) || 'none'}`;

/**
 * The state a picked artifact row draws: `none` while nothing is picked,
 * `queued` while its download is, `present` while the file is on the host
 * and `missing` otherwise.
 *
 * @param {Object|null} picked - The picked artifact row
 * @param {boolean} queued - Whether a download of it is queued
 * @returns {string} The state
 */
export const fileStateOf = (picked, queued) => {
  if (!picked) {
    return 'none';
  }
  if (queued) {
    return 'queued';
  }
  return artifactPresent(picked) ? 'present' : 'missing';
};

/**
 * One picked artifact as a row: the kind's label, the picked file name
 * as code and its version, the full hash their tooltip, the state badge,
 * the download glyph on a missing pick, the change glyph and the clear
 * glyph, or while nothing is picked one `+ <label>…` button; `onOpen`
 * opens the pick dialog, `onClear` drops the pick, `onFetch` hands the
 * missing row on, and `attributes` are the data attributes the row
 * carries.
 */
const ArtifactPickRow = ({
  label,
  picked,
  queued = false,
  disabled = false,
  onOpen,
  onClear,
  onFetch = null,
  attributes = {},
}) => {
  const { t } = useTranslation();
  const state = fileStateOf(picked, queued);
  const text = pickTextOf(picked);
  const stateTitle = state === 'missing' ? t(sourceKey(picked)) : '';
  return (
    <div className="hw-file-picker" {...attributes}>
      <span className="hw-file-kind">{label}</span>
      {picked ? (
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <code className="small" title={artifactHashOf(picked)}>
            {picked.filename}
          </code>
          <span
            className={`badge ${FILE_STATE_TONES[state]}`}
            data-file-state={state}
            title={stateTitle}
          >
            {t(`provisioning.provisioningRolesTab.fileState.${state}`)}
          </span>
          {text.version ? (
            <span className="hw-file-meta" title={artifactHashOf(picked)}>
              <span>{text.version}</span>
            </span>
          ) : null}
          {state === 'missing' && onFetch ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0"
              data-action="artifact-fetch"
              title={t('provisioning.provisioningRolesTab.fetchTitle')}
              aria-label={t('provisioning.provisioningRolesTab.fetchTitle')}
              disabled={disabled}
              onClick={() => onFetch(picked)}
            >
              <FaDownload aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            data-action="file-pick"
            title={t('provisioning.provisioningRolesTab.changeFile')}
            aria-label={t('provisioning.provisioningRolesTab.changeFile')}
            disabled={disabled}
            onClick={onOpen}
          >
            <FaArrowsRotate aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            data-action="file-clear"
            title={t('provisioning.provisioningRolesTab.clearFile')}
            aria-label={t('provisioning.provisioningRolesTab.clearFile')}
            disabled={disabled}
            onClick={onClear}
          >
            <FaXmark aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0"
          data-action="file-pick"
          data-file-state="none"
          disabled={disabled}
          onClick={onOpen}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('provisioning.provisioningRolesTab.addFile', { kind: label })}
        </button>
      )}
    </div>
  );
};

ArtifactPickRow.propTypes = {
  label: PropTypes.string.isRequired,
  picked: PropTypes.object,
  queued: PropTypes.bool,
  disabled: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
  attributes: PropTypes.object,
};

export default ArtifactPickRow;
