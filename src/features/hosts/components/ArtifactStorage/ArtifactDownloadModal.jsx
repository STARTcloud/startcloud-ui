import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CHECKSUM_ALGORITHMS,
  DOWNLOAD_FORM,
  defaultPathOf,
  downloadBody,
  downloadProblem,
  enabledPaths,
  extractFilenameFromUrl,
} from '../../utils/artifacts';
import ToolFormDialog from '../ToolFormDialog';

const PathFacts = ({ path, headingKey, filesKey }) => {
  const { t } = useTranslation();
  return (
    <div className="alert alert-info mb-0" data-note="storage-path">
      <p className="mb-1">{t(headingKey)}</p>
      <ul className="mb-0">
        <li>
          {t('artifacts.artifactDownloadModal.nameField')}: {path.name}
        </li>
        <li>
          {t('artifacts.artifactDownloadModal.pathField')}: {path.path}
        </li>
        <li>
          {t('artifacts.artifactDownloadModal.typeField')}: {String(path.type || '').toUpperCase()}
        </li>
        <li>
          {t(filesKey)}: {path.file_count || 0}
        </li>
      </ul>
    </div>
  );
};

PathFacts.propTypes = {
  path: PropTypes.object.isRequired,
  headingKey: PropTypes.string.isRequired,
  filesKey: PropTypes.string.isRequired,
};

export { PathFacts };

/**
 * The storage location select an upload and a download share, over the
 * enabled locations.
 */
export const StoragePathSelect = ({
  id,
  labelKey,
  placeholderKey,
  helperKey,
  paths,
  value,
  busy,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={busy}
      >
        <option value="">{t(placeholderKey)}</option>
        {paths.map(path => (
          <option key={path.id} value={path.id}>
            {path.name} ({path.type}) - {path.path}
          </option>
        ))}
      </select>
      <p className="form-text text-muted mb-0">{t(helperKey)}</p>
    </div>
  );
};

StoragePathSelect.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  placeholderKey: PropTypes.string.isRequired,
  helperKey: PropTypes.string.isRequired,
  paths: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The checksum field an upload and a download share, the value and its
 * algorithm.
 */
export const ChecksumField = ({
  id,
  labelKey,
  placeholderKey,
  helperKey,
  form,
  busy,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {t(labelKey)}
      </label>
      <div className="input-group">
        <input
          id={id}
          className="form-control"
          type="text"
          placeholder={t(placeholderKey)}
          value={form.checksum}
          onChange={event => onChange('checksum', event.target.value)}
          disabled={busy}
        />
        <select
          id={`${id}-algorithm`}
          className="form-select"
          aria-label={t(labelKey)}
          value={form.checksum_algorithm}
          onChange={event => onChange('checksum_algorithm', event.target.value)}
          disabled={busy || !form.checksum.trim()}
        >
          {CHECKSUM_ALGORITHMS.map(algorithm => (
            <option key={algorithm} value={algorithm}>
              {algorithm.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <p className="form-text text-muted mb-0">{t(helperKey)}</p>
    </div>
  );
};

ChecksumField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  placeholderKey: PropTypes.string.isRequired,
  helperKey: PropTypes.string.isRequired,
  form: PropTypes.shape({
    checksum: PropTypes.string.isRequired,
    checksum_algorithm: PropTypes.string.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The dialog that downloads a file from a URL into a storage location,
 * hyperweaver-ui's: the URL, the location among the enabled ones, the
 * one location chosen when there is exactly one, the file name
 * suggested from the URL until typed, the checksum with its algorithm,
 * the overwrite switch, the chosen location's facts and the steps of
 * the download; a host with no enabled location is told so.
 */
const ArtifactDownloadModal = ({ storagePaths, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const paths = enabledPaths(storagePaths);
  const [form, setForm] = useState(() => ({
    ...DOWNLOAD_FORM,
    storage_path_id: defaultPathOf(storagePaths),
  }));
  const [typedName, setTypedName] = useState(false);
  const problem = downloadProblem(form);
  const chosen = paths.find(path => path.id === form.storage_path_id);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const setUrl = url => {
    const suggested = typedName ? form.filename : extractFilenameFromUrl(url);
    setForm(current => ({ ...current, url, filename: suggested || current.filename }));
  };

  if (paths.length === 0) {
    return (
      <ToolFormDialog
        dialog="artifact-download"
        title={t('artifacts.artifactDownloadModal.title')}
        submitKey="artifacts.artifactDownloadModal.closeButton"
        busy={busy}
        onClose={onClose}
        onSubmit={onClose}
      >
        <div className="alert alert-warning mb-0" data-note="no-enabled-paths">
          <p className="mb-1">{t('artifacts.artifactDownloadModal.noEnabledLocations')}</p>
          <p className="mb-0">{t('artifacts.artifactDownloadModal.enableLocationsFirstMessage')}</p>
        </div>
      </ToolFormDialog>
    );
  }

  return (
    <ToolFormDialog
      dialog="artifact-download"
      title={t('artifacts.artifactDownloadModal.title')}
      submitKey="artifacts.artifactDownloadModal.startButton"
      problemKey={problem}
      variant="success"
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit(downloadBody(form));
        }
      }}
    >
      <div>
        <label htmlFor="download-url" className="form-label">
          {t('artifacts.artifactDownloadModal.urlLabel')}
        </label>
        <input
          id="download-url"
          className="form-control"
          type="url"
          placeholder={t('artifacts.artifactDownloadModal.urlPlaceholder')}
          value={form.url}
          onChange={event => setUrl(event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.artifactDownloadModal.urlHelper')}
        </p>
      </div>
      <StoragePathSelect
        id="download-storage-location"
        labelKey="artifacts.artifactDownloadModal.storageLocationLabel"
        placeholderKey="artifacts.artifactDownloadModal.selectStorageLocation"
        helperKey="artifacts.artifactDownloadModal.storageLocationHelper"
        paths={paths}
        value={form.storage_path_id}
        busy={busy}
        onChange={value => set('storage_path_id', value)}
      />
      <div>
        <label htmlFor="download-filename" className="form-label">
          {t('artifacts.artifactDownloadModal.filenameLabel')}
        </label>
        <input
          id="download-filename"
          className="form-control"
          type="text"
          placeholder={t('artifacts.artifactDownloadModal.filenamePlaceholder')}
          value={form.filename}
          onChange={event => {
            setTypedName(true);
            set('filename', event.target.value);
          }}
          disabled={busy}
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.artifactDownloadModal.filenameHelper')}
        </p>
      </div>
      <ChecksumField
        id="download-checksum"
        labelKey="artifacts.artifactDownloadModal.checksumLabel"
        placeholderKey="artifacts.artifactDownloadModal.checksumPlaceholder"
        helperKey="artifacts.artifactDownloadModal.checksumHelper"
        form={form}
        busy={busy}
        onChange={set}
      />
      <div>
        <div className="form-check">
          <input
            id="download-overwrite-existing"
            className="form-check-input"
            type="checkbox"
            checked={form.overwrite_existing}
            onChange={event => set('overwrite_existing', event.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="download-overwrite-existing">
            {t('artifacts.artifactDownloadModal.overwriteLabel')}
          </label>
        </div>
        <p className="form-text text-muted mb-0">
          {t('artifacts.artifactDownloadModal.overwriteHelper')}
        </p>
      </div>
      {chosen ? (
        <PathFacts
          path={chosen}
          headingKey="artifacts.artifactDownloadModal.selectedStorageLocationHeading"
          filesKey="artifacts.artifactDownloadModal.availableFilesField"
        />
      ) : null}
      <div className="alert alert-secondary mb-0" data-note="download-process">
        <p className="mb-1">{t('artifacts.artifactDownloadModal.downloadProcessHeading')}</p>
        <ol className="mb-0">
          <li>{t('artifacts.artifactDownloadModal.downloadProcessStep1')}</li>
          <li>{t('artifacts.artifactDownloadModal.downloadProcessStep2')}</li>
          <li>{t('artifacts.artifactDownloadModal.downloadProcessStep3')}</li>
          <li>{t('artifacts.artifactDownloadModal.downloadProcessStep4')}</li>
        </ol>
      </div>
    </ToolFormDialog>
  );
};

ArtifactDownloadModal.propTypes = {
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ArtifactDownloadModal;
