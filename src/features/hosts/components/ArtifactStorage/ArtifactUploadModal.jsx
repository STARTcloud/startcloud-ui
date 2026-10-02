import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUpload, FaXmark } from 'react-icons/fa6';

import UploadProgress from '../../../../components/common/UploadProgress';
import { formatFileSize } from '../../../../utils/formatFileSize';
import {
  ARTIFACT_EXTENSIONS,
  UPLOAD_FORM,
  defaultPathOf,
  enabledPaths,
  uploadProblem,
} from '../../utils/artifacts';
import ToolFormDialog from '../ToolFormDialog';

import { ChecksumField, PathFacts, StoragePathSelect } from './ArtifactDownloadModal';

const STATUS_TONES = { uploading: 'info', completed: 'success', error: 'danger' };

const Picked = ({ entry, progress, busy, onRemove }) => {
  const { t } = useTranslation();
  const state = progress?.status || '';
  return (
    <li className="list-group-item" data-upload-file={entry.file.name}>
      <div className="d-flex align-items-center gap-2">
        <span className="flex-grow-1 min-width-0">
          <strong className="d-block text-truncate">{entry.file.name}</strong>
          <small className="text-muted">{formatFileSize(entry.file.size)}</small>
        </span>
        {state ? (
          <span className={`badge text-bg-${STATUS_TONES[state] || 'info'}`}>
            {state === 'uploading' ? `${progress.progress}%` : null}
            {state === 'completed' ? t('artifacts.artifactUploadModal.uploadCompleteStatus') : null}
            {state === 'error' ? t('artifacts.artifactUploadModal.uploadErrorStatus') : null}
          </span>
        ) : null}
        {busy ? null : (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-action="remove-file"
            aria-label={t('boxes.buttons.close')}
            onClick={() => onRemove(entry.id)}
          >
            <FaXmark aria-hidden="true" />
          </button>
        )}
      </div>
      {state === 'uploading' ? (
        <div className="mt-2">
          <UploadProgress file={entry.file} progress={progress.progress} />
        </div>
      ) : null}
      {state === 'error' ? (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          {progress.error}
        </div>
      ) : null}
    </li>
  );
};

Picked.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.number.isRequired,
    file: PropTypes.object.isRequired,
  }).isRequired,
  progress: PropTypes.shape({
    status: PropTypes.string,
    progress: PropTypes.number,
    error: PropTypes.string,
  }),
  busy: PropTypes.bool.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The dialog that uploads files into a storage location,
 * hyperweaver-ui's: the location among the enabled ones, the drop zone
 * and the file input, the files picked with their sizes, each with the
 * estate's progress block while it goes up and its outcome after, the
 * checksum with its algorithm, and the chosen location's facts; the
 * send prepares each file and puts it through the client with its
 * progress reported; a host with no enabled location is told so.
 */
const ArtifactUploadModal = ({ storagePaths, busy, progress, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const paths = enabledPaths(storagePaths);
  const [form, setForm] = useState(() => ({
    ...UPLOAD_FORM,
    storage_path_id: defaultPathOf(storagePaths),
  }));
  const [picked, setPicked] = useState([]);
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const nextId = useRef(0);
  const files = picked.map(entry => entry.file);
  const problem = uploadProblem(form, files);
  const chosen = paths.find(path => path.id === form.storage_path_id);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const pick = list => {
    setPicked(
      Array.from(list).map(file => {
        nextId.current += 1;
        return { id: nextId.current, file };
      })
    );
  };

  if (paths.length === 0) {
    return (
      <ToolFormDialog
        dialog="artifact-upload"
        title={t('artifacts.artifactUploadModal.title')}
        submitKey="artifacts.artifactUploadModal.closeButton"
        busy={busy}
        onClose={onClose}
        onSubmit={onClose}
      >
        <div className="alert alert-warning mb-0" data-note="no-enabled-paths">
          <p className="mb-1">{t('artifacts.artifactUploadModal.noEnabledLocations')}</p>
          <p className="mb-0">{t('artifacts.artifactUploadModal.enableLocationsFirstMessage')}</p>
        </div>
      </ToolFormDialog>
    );
  }

  return (
    <ToolFormDialog
      dialog="artifact-upload"
      title={t('artifacts.artifactUploadModal.title')}
      submitKey={
        busy
          ? 'artifacts.artifactUploadModal.uploadingButton'
          : 'artifacts.artifactUploadModal.submitButton'
      }
      problemKey={files.length > 0 && problem ? problem.key : ''}
      disabled={files.length === 0}
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit({ form, files });
        }
      }}
    >
      <StoragePathSelect
        id="upload-storage-location"
        labelKey="artifacts.artifactUploadModal.storageLocationLabel"
        placeholderKey="artifacts.artifactUploadModal.selectStorageLocation"
        helperKey="artifacts.artifactUploadModal.storageLocationHelper"
        paths={paths}
        value={form.storage_path_id}
        busy={busy}
        onChange={value => set('storage_path_id', value)}
      />
      <div>
        <label htmlFor="artifact-upload-file-input" className="form-label">
          {t('artifacts.artifactUploadModal.filesLabel')}
        </label>
        <div
          role="presentation"
          className={`upload-zone${over ? ' over' : ''}`}
          onDragOver={event => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={event => {
            event.preventDefault();
            setOver(false);
            pick(event.dataTransfer.files);
          }}
        >
          <button
            type="button"
            className="upload-zone-target"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <FaUpload className="upload-zone-icon" aria-hidden="true" />
            <span>
              {t(
                over
                  ? 'artifacts.artifactUploadModal.dragDropActiveText'
                  : 'artifacts.artifactUploadModal.dragDropText'
              )}
            </span>
          </button>
          <input
            id="artifact-upload-file-input"
            ref={input}
            className="form-control"
            type="file"
            multiple
            accept={ARTIFACT_EXTENSIONS.join(',')}
            onChange={event => pick(event.target.files)}
            disabled={busy}
          />
        </div>
        {problem?.key === 'artifacts.artifactUploadModal.unsupportedFileType' ? (
          <p className="form-text text-danger mb-0" data-note="unsupported-file">
            {t(problem.key, problem.values)}
          </p>
        ) : null}
        <p className="form-text text-muted mb-0">
          {t('artifacts.artifactUploadModal.filesHelper')}
        </p>
      </div>
      {picked.length > 0 ? (
        <div data-list="upload-files">
          <span className="form-label">
            {t('artifacts.artifactUploadModal.selectedFilesLabel', { count: picked.length })}
          </span>
          <ul className="list-group">
            {picked.map(entry => (
              <Picked
                key={entry.id}
                entry={entry}
                progress={progress[entry.file.name]}
                busy={busy}
                onRemove={fileId =>
                  setPicked(current => current.filter(item => item.id !== fileId))
                }
              />
            ))}
          </ul>
        </div>
      ) : null}
      <ChecksumField
        id="artifact-checksum-input"
        labelKey="artifacts.artifactUploadModal.checksumLabel"
        placeholderKey="artifacts.artifactUploadModal.checksumPlaceholder"
        helperKey="artifacts.artifactUploadModal.checksumHelper"
        form={form}
        busy={busy}
        onChange={set}
      />
      {chosen ? (
        <PathFacts
          path={chosen}
          headingKey="artifacts.artifactUploadModal.uploadDestinationHeading"
          filesKey="artifacts.artifactUploadModal.currentFilesField"
        />
      ) : null}
    </ToolFormDialog>
  );
};

ArtifactUploadModal.propTypes = {
  storagePaths: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  progress: PropTypes.objectOf(
    PropTypes.shape({
      status: PropTypes.string,
      progress: PropTypes.number,
      error: PropTypes.string,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ArtifactUploadModal;
