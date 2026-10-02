import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { formatFileSize } from '../../../../utils/formatFileSize';
import {
  archiveFormats,
  archiveNameOf,
  getArchiveFormat,
  stripArchiveExtension,
} from '../../utils/fileManager';
import { PathInput } from '../PathPicker';
import ToolFormDialog from '../ToolFormDialog';

const SHOWN = 5;

const joinPath = (base, name) => `${base.replace(/\/+$/u, '')}/${name}`;

/**
 * The dialog that makes an archive of a selection, hyperweaver-ui's:
 * the files it holds, the archive's name, the format among the ones the
 * agent creates, and the directory it lands in, a path field with
 * Browse; the name follows the format's extension until typed over.
 */
export const CreateArchiveDialog = ({
  id,
  server,
  files,
  destination,
  busy,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [format, setFormat] = useState('tar.gz');
  const [name, setName] = useState(() => archiveNameOf(files, 'tar.gz'));
  const [target, setTarget] = useState(destination);
  const problem = name.trim() ? '' : 'fileManager.createArchiveModal.archiveNameRequired';

  const changeFormat = next => {
    setFormat(next);
    setName(`${stripArchiveExtension(name)}.${next}`);
  };

  return (
    <ToolFormDialog
      dialog="archive-create"
      title={t('fileManager.createArchiveModal.title')}
      submitKey="fileManager.createArchiveModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit({ files, archivePath: joinPath(target, name.trim()), format });
        }
      }}
    >
      <div className="alert alert-info" data-note="archive-sources">
        <strong>
          {t('fileManager.createArchiveModal.creatingArchiveFrom', { count: files.length })}
        </strong>
        <ul className="mt-2 mb-0">
          {files.slice(0, SHOWN).map(file => (
            <li key={file.path || file.name}>{file.name}</li>
          ))}
          {files.length > SHOWN ? (
            <li>
              {t('fileManager.createArchiveModal.andMoreItems', { count: files.length - SHOWN })}
            </li>
          ) : null}
        </ul>
      </div>
      <div>
        <label htmlFor="archive-name" className="form-label">
          {t('fileManager.createArchiveModal.archiveNameLabel')}
        </label>
        <input
          id="archive-name"
          className="form-control"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={t('fileManager.createArchiveModal.archiveNamePlaceholder')}
          disabled={busy}
        />
        <p className="form-text text-muted mb-0">
          {t('fileManager.createArchiveModal.archiveNameHelp')}
        </p>
      </div>
      <div>
        <label htmlFor="archive-format" className="form-label">
          {t('fileManager.createArchiveModal.archiveFormatLabel')}
        </label>
        <select
          id="archive-format"
          className="form-select"
          value={format}
          onChange={event => changeFormat(event.target.value)}
          disabled={busy}
        >
          {archiveFormats(server).map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="archive-destination" className="form-label">
          {t('fileManager.createArchiveModal.destinationLabel')}
        </label>
        <PathInput
          id="archive-destination"
          value={target}
          onChange={setTarget}
          status={status}
          hostId={id}
          server={server}
          disabled={busy}
          placeholder="/path/to/destination"
        />
        <p className="form-text text-muted mb-0">
          {t('fileManager.createArchiveModal.destinationHelp')}
        </p>
      </div>
    </ToolFormDialog>
  );
};

CreateArchiveDialog.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  files: PropTypes.array.isRequired,
  destination: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The dialog that extracts an archive, hyperweaver-ui's: the archive
 * with its size and format, the directory it extracts into, a path
 * field with Browse, and the two quick choices, the current directory
 * and a new folder named after the archive.
 */
export const ExtractArchiveDialog = ({
  id,
  server,
  file,
  destination,
  busy,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [target, setTarget] = useState(destination);
  const folder = stripArchiveExtension(file.name);
  const problem = target.trim() ? '' : 'fileManager.extractArchiveModal.destinationRequired';

  return (
    <ToolFormDialog
      dialog="archive-extract"
      title={t('fileManager.extractArchiveModal.title')}
      submitKey="fileManager.extractArchiveModal.submit"
      problemKey={problem}
      variant="success"
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit({ file, extractPath: target.trim() });
        }
      }}
    >
      <div className="alert alert-secondary" data-note="archive-info">
        <div className="row align-items-center">
          <div className="col">
            <strong>{t('fileManager.extractArchiveModal.archiveLabel')}</strong> {file.name}
          </div>
          <div className="col">
            <strong>{t('fileManager.extractArchiveModal.sizeLabel')}</strong>{' '}
            {file.size ? formatFileSize(file.size) : t('fileManager.extractArchiveModal.unknown')}
          </div>
          <div className="col">
            <strong>{t('fileManager.extractArchiveModal.formatLabel')}</strong>{' '}
            {getArchiveFormat(file.name)}
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="extract-destination" className="form-label">
          {t('fileManager.extractArchiveModal.extractToLabel')}
        </label>
        <PathInput
          id="extract-destination"
          value={target}
          onChange={setTarget}
          status={status}
          hostId={id}
          server={server}
          disabled={busy}
          placeholder="/path/to/extraction/directory"
        />
        <p className="form-text text-muted mb-0">
          {t('fileManager.extractArchiveModal.extractToHelp')}
        </p>
      </div>
      <div>
        <span className="form-label">{t('fileManager.extractArchiveModal.quickOptions')}</span>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="extract-here"
            onClick={() => setTarget(destination)}
          >
            {t('fileManager.extractArchiveModal.currentDirectory', { path: destination })}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="extract-folder"
            onClick={() => setTarget(joinPath(destination, folder))}
          >
            {t('fileManager.extractArchiveModal.newFolder', { name: folder })}
          </button>
        </div>
      </div>
    </ToolFormDialog>
  );
};

ExtractArchiveDialog.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  file: PropTypes.object.isRequired,
  destination: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The two archive dialogs of the file manager, the one `open` names.
 */
const ArchiveModals = ({ id, server, open, destination, busy, onClose, onCreate, onExtract }) => {
  if (open.kind === 'archive-create') {
    return (
      <CreateArchiveDialog
        id={id}
        server={server}
        files={open.files}
        destination={destination}
        busy={busy}
        onClose={onClose}
        onSubmit={onCreate}
      />
    );
  }
  if (open.kind === 'archive-extract') {
    return (
      <ExtractArchiveDialog
        id={id}
        server={server}
        file={open.file}
        destination={destination}
        busy={busy}
        onClose={onClose}
        onSubmit={onExtract}
      />
    );
  }
  return null;
};

ArchiveModals.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  open: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    file: PropTypes.object,
    files: PropTypes.array,
  }).isRequired,
  destination: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onExtract: PropTypes.func.isRequired,
};

export default ArchiveModals;
