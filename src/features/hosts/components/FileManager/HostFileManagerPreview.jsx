import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaFile,
  FaFileLines,
  FaFileZipper,
  FaFolder,
  FaGear,
  FaPen,
  FaUpRightAndDownLeftFromCenter,
} from 'react-icons/fa6';

import { formatFileSize } from '../../../../utils/formatFileSize';
import { isArchiveFile, isTextFile } from '../../utils/fileManager';

const sizeOf = (file, t) => {
  if (file.isDirectory) {
    return t('fileManager.hostFileManagerPreview.directory');
  }
  return file.size
    ? formatFileSize(file.size)
    : t('fileManager.hostFileManagerPreview.unknownSize');
};

const kindOf = file => {
  if (file.isDirectory) {
    return 'directory';
  }
  if (isTextFile(file)) {
    return 'text';
  }
  return isArchiveFile(file) ? 'archive' : 'file';
};

const GLYPHS = { directory: FaFolder, text: FaFileLines, archive: FaFileZipper, file: FaFile };

const WORDS = {
  directory: 'fileManager.hostFileManagerPreview.directory',
  text: 'fileManager.hostFileManagerPreview.textFile',
  archive: 'fileManager.hostFileManagerPreview.archiveFile',
  file: 'fileManager.hostFileManagerPreview.file',
};

const Pair = ({ label, value }) => (
  <span className="d-inline-flex">
    <span className="badge text-bg-dark rounded-end-0">{label}</span>
    <span className="badge text-bg-secondary rounded-start-0">{value}</span>
  </span>
);

Pair.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

/**
 * The preview cubone draws for an opened file, hyperweaver-ui's preview
 * panel: the name, the size, the MIME type and the mode as badges, the
 * file's kind with its glyph, Edit for a text file, Extract for an
 * archive and Download for every file, the modified date, the mode and
 * the owner, and Properties for a person who may manage the host.
 */
const HostFileManagerPreview = ({
  file,
  permissions,
  onEdit,
  onExtract,
  onProperties,
  onDownload,
}) => {
  const { t } = useTranslation();
  const meta = file._hwMetadata || {};
  const kind = kindOf(file);
  const Glyph = GLYPHS[kind];
  const unknown = t('fileManager.hostFileManagerPreview.unknown');
  return (
    <div className="file-preview-container" data-panel="file-preview" data-kind={kind}>
      <div className="preview-header">
        <h4 className="fs-6 fw-bold">{file.name}</h4>
        <div className="preview-info">
          <span className="badge text-bg-secondary">{sizeOf(file, t)}</span>
          {meta.mimeType ? <span className="badge text-bg-info">{meta.mimeType}</span> : null}
          {meta.permissions ? (
            <span className="badge text-bg-dark">{meta.permissions.octal || unknown}</span>
          ) : null}
        </div>
      </div>
      <div className="preview-content text-center p-4">
        <Glyph className="fs-1 text-secondary" aria-hidden="true" />
        <p className="mt-2">{t(WORDS[kind])}</p>
        {kind === 'directory' ? (
          <p className="small text-muted">
            {t('fileManager.hostFileManagerPreview.doubleClickOpen')}
          </p>
        ) : null}
        {kind === 'file' ? (
          <p className="small text-muted">
            {t('fileManager.hostFileManagerPreview.doubleClickDownload')}
          </p>
        ) : null}
        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
          {kind === 'text' && permissions.edit ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-action="edit"
              onClick={() => onEdit(file)}
            >
              <FaPen className="me-1" aria-hidden="true" />
              {t('fileManager.hostFileManagerPreview.editFile')}
            </button>
          ) : null}
          {kind === 'archive' && permissions.archive ? (
            <button
              type="button"
              className="btn btn-success btn-sm"
              data-action="extract"
              onClick={() => onExtract(file)}
            >
              <FaUpRightAndDownLeftFromCenter className="me-1" aria-hidden="true" />
              {t('fileManager.hostFileManagerPreview.extract')}
            </button>
          ) : null}
          {kind !== 'directory' && permissions.download ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              data-action="download"
              onClick={() => onDownload([file])}
            >
              <FaDownload className="me-1" aria-hidden="true" />
              {t('hosts.manage.files.download')}
            </button>
          ) : null}
        </div>
      </div>
      <div className="preview-metadata">
        <div className="d-flex flex-wrap gap-2">
          <Pair
            label={t('fileManager.hostFileManagerPreview.modified')}
            value={file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : unknown}
          />
          {meta.permissions ? (
            <Pair
              label={t('fileManager.hostFileManagerPreview.permissions')}
              value={meta.permissions.octal || unknown}
            />
          ) : null}
          {file._hwMetadata ? (
            <Pair
              label={t('fileManager.hostFileManagerPreview.owner')}
              value={`${meta.uid ?? unknown}:${meta.gid ?? unknown}`}
            />
          ) : null}
        </div>
        {permissions.properties ? (
          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              data-action="properties"
              onClick={() => onProperties(file)}
            >
              <FaGear className="me-1" aria-hidden="true" />
              {t('fileManager.hostFileManagerPreview.properties')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

HostFileManagerPreview.propTypes = {
  file: PropTypes.object.isRequired,
  permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
  onEdit: PropTypes.func.isRequired,
  onExtract: PropTypes.func.isRequired,
  onProperties: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default HostFileManagerPreview;
