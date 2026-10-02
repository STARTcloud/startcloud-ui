import { FileManager } from '@cubone/react-file-manager';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@cubone/react-file-manager/dist/style.css';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { createArchive, extractArchive, updatePermissions, writeFileContent } from '../api/files';
import { useHostFiles } from '../hooks/useHostFiles';
import {
  DEFAULT_MODE,
  UPLOAD_SIZE_LIMIT,
  filePermissions,
  getPathFromFile,
  isArchiveFile,
  isTextFile,
  ownershipFields,
  permissionBody,
} from '../utils/fileManager';

import ArchiveModals from './FileManager/ArchiveModals';
import FilePropertiesModal from './FileManager/FilePropertiesModal';
import HostFileManagerActionBar from './FileManager/HostFileManagerActionBar';
import HostFileManagerPreview from './FileManager/HostFileManagerPreview';
import TextFileEditor from './FileManager/TextFileEditor';
import TaskDialog from './TaskDialog';

const CLOSED = { kind: '', file: null, files: [] };

const CUBONE_LANGUAGES = { en: 'en-US', es: 'es-ES' };

const FIELD = 'input, textarea, select';

const keepTyping = event => {
  if (event.key !== 'Escape' && event.target.matches(FIELD)) {
    event.stopPropagation();
  }
};

const previewOf = ({ permissions, onEdit, onExtract, onProperties, onDownload }) => {
  const preview = file => (
    <HostFileManagerPreview
      file={file}
      permissions={permissions}
      onEdit={onEdit}
      onExtract={onExtract}
      onProperties={onProperties}
      onDownload={onDownload}
    />
  );
  return preview;
};

/**
 * The File Manager section of the Manage page, hyperweaver-ui's
 * `EnhancedFileManager` behind `file-browser`: cubone's file manager
 * over the host's file system with its own toolbar, menu, uploader and
 * navigation, the action bar over it with Edit, Extract, Properties,
 * Archive and Archive directory for the selection, the preview panel
 * for an opened file, and the dialogs, the text editor, the archive
 * creation and extraction and the properties; every write one request
 * and one notice, a queued task followed on `task-updated` and the
 * listing read again at its end, and what a person may do gated by
 * their role. The section carries `data-panel="file-manager"` and the
 * current display path as `data-path`. cubone binds its shortcuts,
 * Delete, Ctrl+A, Home, End, F2 and the rest, on the window and
 * prevents their default wherever they are pressed, so a key typed into
 * a field of the section, its dialogs' fields among them, is kept from
 * the window and Escape alone goes on, to close the dialog.
 */
const FileManagerSection = ({ id, ctx }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const manager = useHostFiles({ id });
  const [open, setOpen] = useState(CLOSED);
  const permissions = filePermissions(ctx.user?.role);
  const { server, handlers, agentPathOf } = manager;
  const destination = agentPathOf(manager.currentPath);

  const close = () => setOpen(CLOSED);

  const edit = file => {
    if (isTextFile(file)) {
      setOpen({ ...CLOSED, kind: 'text-editor', file });
    } else {
      notify('danger', t('fileManager.enhancedFileManager.cannotEditAsText'));
    }
  };

  const extract = file => {
    if (isArchiveFile(file)) {
      setOpen({ ...CLOSED, kind: 'archive-extract', file });
    } else {
      notify('danger', t('fileManager.enhancedFileManager.cannotExtract'));
    }
  };

  const properties = file => setOpen({ ...CLOSED, kind: 'properties', file });

  const archive = files => setOpen({ ...CLOSED, kind: 'archive-create', files });

  const sent = async request => {
    const { error } = await manager.send(request);
    if (!error) {
      close();
    }
  };

  const saveText = content =>
    sent({
      call: () =>
        writeFileContent(status, id, {
          path: agentPathOf(getPathFromFile(open.file)),
          content,
          backup: false,
          mode: DEFAULT_MODE,
          ...ownershipFields(server),
        }),
      doneKey: 'hosts.manage.files.saved',
      values: { name: open.file.name },
      failKey: 'hosts.manage.files.failed',
    });

  const createArchiveOf = ({ files, archivePath, format }) =>
    sent({
      call: () =>
        createArchive(status, id, {
          sources: files.map(file => agentPathOf(getPathFromFile(file))),
          archive_path: archivePath,
          format,
        }),
      doneKey: 'hosts.manage.files.archived',
      values: { name: archivePath },
      failKey: 'hosts.manage.files.failed',
    });

  const extractArchiveTo = ({ file, extractPath }) =>
    sent({
      call: () =>
        extractArchive(status, id, {
          archive_path: agentPathOf(getPathFromFile(file)),
          extract_path: extractPath,
        }),
      doneKey: 'hosts.manage.files.extracted',
      values: { name: file.name, path: extractPath },
      failKey: 'hosts.manage.files.failed',
    });

  const applyPermissions = ({ file, form }) =>
    sent({
      call: () =>
        updatePermissions(status, id, {
          ...permissionBody({ file, form, server }),
          path: agentPathOf(getPathFromFile(file)),
        }),
      doneKey: 'hosts.manage.files.permissionsSet',
      values: { name: file.name },
      failKey: 'hosts.manage.files.failed',
    });

  return (
    <div
      className="host-file-manager"
      data-panel="file-manager"
      data-path={manager.currentPath}
      role="presentation"
      onKeyDown={keepTyping}
    >
      {manager.failure ? (
        <div className="alert alert-danger" role="alert" data-note="files-failed">
          {manager.failure}
        </div>
      ) : null}
      <HostFileManagerActionBar
        currentPath={manager.currentPath}
        files={manager.files}
        selected={manager.selected}
        permissions={permissions}
        busy={manager.busy}
        onEdit={edit}
        onExtract={extract}
        onProperties={properties}
        onArchive={archive}
      />
      <FileManager
        files={manager.files}
        fileUploadConfig={manager.upload || undefined}
        isLoading={manager.loading}
        onCreateFolder={handlers.onCreateFolder}
        onFileUploading={handlers.onFileUploading}
        onFileUploaded={handlers.onFileUploaded}
        onPaste={handlers.onPaste}
        onRename={handlers.onRename}
        onDownload={handlers.onDownload}
        onDelete={handlers.onDelete}
        onRefresh={handlers.onRefresh}
        onFolderChange={handlers.onFolderChange}
        onSelectionChange={handlers.onSelectionChange}
        onError={handlers.onError}
        layout="grid"
        enableFilePreview
        filePreviewComponent={previewOf({
          permissions,
          onEdit: edit,
          onExtract: extract,
          onProperties: properties,
          onDownload: handlers.onDownload,
        })}
        maxFileSize={UPLOAD_SIZE_LIMIT}
        height="calc(100vh - 200px)"
        width="100%"
        initialPath={manager.currentPath}
        permissions={permissions}
        collapsibleNav
        defaultNavExpanded
        language={CUBONE_LANGUAGES[i18n.language] || 'en-US'}
      />
      {open.kind === 'text-editor' ? (
        <TextFileEditor
          id={id}
          file={open.file}
          path={agentPathOf(getPathFromFile(open.file))}
          busy={manager.busy}
          onClose={close}
          onSave={saveText}
        />
      ) : null}
      <ArchiveModals
        id={id}
        server={server}
        open={open}
        destination={destination}
        busy={manager.busy}
        onClose={close}
        onCreate={createArchiveOf}
        onExtract={extractArchiveTo}
      />
      {open.kind === 'properties' ? (
        <FilePropertiesModal
          id={id}
          server={server}
          file={open.file}
          busy={manager.busy}
          onClose={close}
          onSubmit={applyPermissions}
        />
      ) : null}
      {manager.task ? (
        <TaskDialog status={status} id={id} task={manager.task.row} onHide={manager.closeTask} />
      ) : null}
    </div>
  );
};

FileManagerSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.shape({ user: PropTypes.object }).isRequired,
};

export default FileManagerSection;
