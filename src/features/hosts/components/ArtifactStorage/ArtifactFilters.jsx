import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaDownload, FaFolder, FaMagnifyingGlass, FaUpload } from 'react-icons/fa6';

/**
 * The actions row of the artifacts list, hyperweaver-ui's filters card
 * with its search, type and location moved to the navbar's panel:
 * Upload files, Download from URL and Scan storage, the counts of the
 * storage locations and the enabled ones, and the warnings for a host
 * with no location or with none enabled; the two writes held while no
 * location exists.
 */
const ArtifactFilters = ({ storagePaths, busy, onUpload, onDownload, onScan }) => {
  const { t } = useTranslation();
  const enabled = storagePaths.filter(path => path.enabled).length;
  const none = storagePaths.length === 0;
  return (
    <div className="mb-3" data-panel="artifact-actions">
      <div className="d-flex align-items-center flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="upload"
          disabled={busy || none}
          title={t(
            none
              ? 'artifacts.artifactFilters.noStorageLocationsConfigured'
              : 'artifacts.artifactFilters.uploadFilesFromComputerTooltip'
          )}
          onClick={onUpload}
        >
          <FaUpload className="me-1" aria-hidden="true" />
          {t('artifacts.artifactFilters.uploadFilesButton')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-success"
          data-action="download-url"
          disabled={busy || none}
          title={t(
            none
              ? 'artifacts.artifactFilters.noStorageLocationsConfigured'
              : 'artifacts.artifactFilters.downloadFilesFromUrlsTooltip'
          )}
          onClick={onDownload}
        >
          <FaDownload className="me-1" aria-hidden="true" />
          {t('artifacts.artifactFilters.downloadFromUrlButton')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-warning"
          data-action="scan"
          disabled={busy}
          title={t('artifacts.artifactFilters.scanStorageTooltip')}
          onClick={onScan}
        >
          <FaMagnifyingGlass className="me-1" aria-hidden="true" />
          {t('artifacts.artifactFilters.scanStorageButton')}
        </button>
        <span className="d-inline-flex flex-wrap gap-1 ms-auto">
          <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
            <FaFolder aria-hidden="true" />
            {t('artifacts.artifactFilters.storageLocationCount', { count: storagePaths.length })}
          </span>
          {storagePaths.length > 0 ? (
            <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
              <FaCheck aria-hidden="true" />
              {t('artifacts.artifactFilters.enabledCount', { count: enabled })}
            </span>
          ) : null}
        </span>
      </div>
      {none ? (
        <div className="alert alert-warning mt-3 mb-0" data-note="no-storage-paths">
          {t('artifacts.artifactFilters.noStorageLocationsWarning')}
        </div>
      ) : null}
      {!none && enabled === 0 ? (
        <div className="alert alert-warning mt-3 mb-0" data-note="all-disabled">
          {t('artifacts.artifactFilters.allStorageLocationsDisabledWarning')}
        </div>
      ) : null}
    </div>
  );
};

ArtifactFilters.propTypes = {
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onUpload: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onScan: PropTypes.func.isRequired,
};

export default ArtifactFilters;
