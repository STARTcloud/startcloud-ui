import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { fetchFileContent } from '../../api/files';
import { EDITOR_SIZE_LIMIT, isTextFile, textBytes } from '../../utils/fileManager';
import ToolFormDialog from '../ToolFormDialog';

const SHORTCUTS = [
  ['Ctrl', 'S', 'fileManager.textFileEditor.save'],
  ['Ctrl', 'Z', 'fileManager.textFileEditor.undo'],
  ['Ctrl', 'Y', 'fileManager.textFileEditor.redo'],
  ['Ctrl', 'A', 'fileManager.textFileEditor.selectAll'],
  ['Ctrl', 'F', 'fileManager.textFileEditor.find'],
  ['Tab', '', 'fileManager.textFileEditor.insertTab'],
];

const Shortcut = ({ keys, labelKey }) => {
  const { t } = useTranslation();
  const [first, second] = keys;
  return (
    <span>
      <kbd>{first}</kbd>
      {second ? (
        <>
          {' + '}
          <kbd>{second}</kbd>
        </>
      ) : null}{' '}
      - {t(labelKey)}
    </span>
  );
};

Shortcut.propTypes = {
  keys: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelKey: PropTypes.string.isRequired,
};

const DiscardDialog = ({ busy, onKeep, onDiscard }) => {
  const { t } = useTranslation();
  return (
    <ToolFormDialog
      dialog="text-editor-discard"
      title={t('fileManager.textFileEditor.unsavedChangesTitle')}
      submitKey="fileManager.textFileEditor.discardChanges"
      variant="danger"
      busy={busy}
      onClose={onKeep}
      onSubmit={onDiscard}
    >
      <div className="alert alert-warning mb-0" data-note="unsaved-changes">
        <strong>{t('fileManager.textFileEditor.warningLabel')}</strong>{' '}
        {t('fileManager.textFileEditor.unsavedChangesWarning')}
      </div>
      <p className="mb-0">{t('fileManager.textFileEditor.confirmClose')}</p>
    </ToolFormDialog>
  );
};

DiscardDialog.propTypes = {
  busy: PropTypes.bool.isRequired,
  onKeep: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
};

/**
 * The text editor of a file, hyperweaver-ui's: the file's path, size
 * and modified date, the text read once on open through
 * `GET filesystem/content`, the unsaved mark while it differs from what
 * was read, the size warning over a hundred megabytes, the line and
 * character counts, the keyboard shortcuts, the agent's type detection,
 * and Save, `PUT filesystem/content` once; a close with changes asks
 * first, Ctrl+S saves.
 */
const TextFileEditor = ({ id, file, path, busy, onClose, onSave }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const editable = isTextFile(file);
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(editable);
  const [failure, setFailure] = useState(
    editable ? '' : t('fileManager.textFileEditor.cannotEditAsText')
  );
  const [confirming, setConfirming] = useState(false);
  const changed = content !== original;
  const meta = file._hwMetadata || {};
  const unknown = t('fileManager.textFileEditor.unknown');
  const bytes = textBytes(content);

  useEffect(() => {
    if (!isTextFile(file)) {
      return;
    }
    fetchFileContent(status, id, path).then(
      answer => {
        const text = answer?.content || '';
        setContent(text);
        setOriginal(text);
        setFailure('');
        setLoading(false);
      },
      error => {
        setFailure(
          t('fileManager.textFileEditor.failedToLoadContentDetail', { message: error.message })
        );
        setLoading(false);
      }
    );
  }, [status, id, path, file, t]);

  const close = () => {
    if (changed) {
      setConfirming(true);
    } else {
      onClose();
    }
  };

  const save = () => {
    if (changed) {
      onSave(content);
    } else {
      onClose();
    }
  };

  return (
    <>
      <ToolFormDialog
        dialog="text-editor"
        title={t('fileManager.textFileEditor.editTitle', { name: file.name })}
        submitKey={
          changed ? 'fileManager.textFileEditor.saveChanges' : 'fileManager.textFileEditor.close'
        }
        busy={busy || loading}
        disabled={Boolean(failure)}
        onClose={close}
        onSubmit={save}
      >
        <div className="alert alert-secondary mb-0" data-note="file-info">
          <div className="row">
            <div className="col">
              <strong>{t('fileManager.textFileEditor.fileLabel')}</strong> {file.path || unknown}
            </div>
            <div className="col">
              <strong>{t('fileManager.textFileEditor.sizeLabel')}</strong>{' '}
              {file.size ? formatFileSize(file.size) : unknown}
            </div>
            <div className="col">
              <strong>{t('fileManager.textFileEditor.modifiedLabel')}</strong>{' '}
              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : unknown}
            </div>
          </div>
          {changed ? (
            <div className="alert alert-warning small mt-2 mb-0" data-note="unsaved">
              <strong>{t('fileManager.textFileEditor.unsavedChangesLabel')}</strong>{' '}
              {t('fileManager.textFileEditor.unsavedChangesText')}
            </div>
          ) : null}
        </div>
        {bytes > EDITOR_SIZE_LIMIT ? (
          <div className="alert alert-warning mb-0" data-note="size-warning">
            <strong>{t('fileManager.textFileEditor.warningLabel')}</strong>{' '}
            {t('fileManager.textFileEditor.fileSizeExceeds')}
          </div>
        ) : null}
        {failure ? (
          <div className="alert alert-danger mb-0" role="alert" data-note="editor-failed">
            <strong>{t('fileManager.textFileEditor.errorLabel')}</strong> {failure}
          </div>
        ) : null}
        <div>
          <label className="form-label" htmlFor="file-content-textarea">
            {t('fileManager.textFileEditor.fileContentLabel')}
          </label>
          <textarea
            id="file-content-textarea"
            className="form-control file-editor-text"
            rows="25"
            value={content}
            onChange={event => setContent(event.target.value)}
            onKeyDown={event => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                save();
              }
            }}
            placeholder={t('fileManager.textFileEditor.fileContentPlaceholder')}
            disabled={loading || Boolean(failure)}
          />
          <p className="form-text text-muted mb-0">
            {t('fileManager.textFileEditor.contentStats', {
              lines: content.split('\n').length,
              characters: content.length,
              size: Math.round(bytes / 1024),
            })}
          </p>
        </div>
        <div className="alert alert-info small mb-0" data-note="shortcuts">
          <strong>{t('fileManager.textFileEditor.keyboardShortcutsLabel')}</strong>
          <div className="row mt-1">
            {SHORTCUTS.map(([first, second, labelKey]) => (
              <div key={labelKey} className="col-4">
                <Shortcut keys={[first, second]} labelKey={labelKey} />
              </div>
            ))}
          </div>
        </div>
        {file._hwMetadata ? (
          <div className="alert alert-secondary small mb-0" data-note="detected-type">
            <div className="row align-items-center">
              <div className="col">
                <strong>{t('fileManager.textFileEditor.detectedTypeLabel')}</strong>{' '}
                {meta.mimeType || 'text/plain'}
              </div>
              {meta.syntax ? (
                <div className="col">
                  <strong>{t('fileManager.textFileEditor.syntaxLabel')}</strong> {meta.syntax}
                </div>
              ) : null}
              <div className="col">
                <strong>{t('fileManager.textFileEditor.permissionsLabel')}</strong>{' '}
                {meta.permissions?.octal || unknown}
              </div>
            </div>
          </div>
        ) : null}
      </ToolFormDialog>
      {confirming ? (
        <DiscardDialog
          busy={busy}
          onKeep={() => setConfirming(false)}
          onDiscard={() => {
            setConfirming(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
};

TextFileEditor.propTypes = {
  id: PropTypes.string.isRequired,
  file: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default TextFileEditor;
