import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUp, FaFile, FaFolder, FaFolderOpen } from 'react-icons/fa6';

import { fetchDirectory } from '../api/host';
import { hostHasFeature } from '../utils/capabilities';

import ToolFormDialog from './ToolFormDialog';

const parentOf = path => {
  const cut = path.lastIndexOf('/');
  if (cut <= 0) {
    return '/';
  }
  return path.slice(0, cut);
};

const sortedEntries = items =>
  [...items].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return String(a.name).localeCompare(String(b.name));
  });

const openingPath = (mode, initialPath) => {
  const trimmed = (initialPath || '').trim();
  if (mode === 'file' && trimmed.includes('/')) {
    return parentOf(trimmed);
  }
  return trimmed.startsWith('/') ? trimmed : '/';
};

const EntryButton = ({ entry, selected, clickable, disabled, onClick }) => (
  <button
    type="button"
    className={`d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent px-2 py-1 ${
      selected ? 'bg-primary-subtle' : ''
    } ${clickable ? '' : 'text-muted'}`}
    onClick={onClick}
    disabled={disabled || !clickable}
  >
    {entry.isDirectory ? (
      <FaFolder className="text-warning" aria-hidden="true" />
    ) : (
      <FaFile className="text-muted" aria-hidden="true" />
    )}
    <span className="small">{entry.name}</span>
  </button>
);

EntryButton.propTypes = {
  entry: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  clickable: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The dialog that browses the host's file system through
 * `GET filesystem` to pick a directory or a file, the pages contract's
 * form dialog under `data-dialog="path-picker"`: the path field with Up
 * and Go, the entries as buttons, a directory opening and a file
 * selecting, and the pick at the foot. The first directory is read once
 * on open, every other on the person's click.
 */
export const PathPickerModal = ({ status, hostId, onClose, onPick, title, mode, initialPath }) => {
  const { t } = useTranslation();
  const [view, setView] = useState({ path: '/', entries: null, error: '' });
  const [typed, setTyped] = useState('/');
  const [selectedFile, setSelectedFile] = useState('');
  const [pending, setPending] = useState(false);
  const loading = pending || view.entries === null;

  const browse = useCallback(
    target =>
      fetchDirectory(status, hostId, target).then(
        answer => {
          setView({
            path: target,
            entries: sortedEntries(Array.isArray(answer?.items) ? answer.items : []),
            error: '',
          });
          setTyped(target);
          setSelectedFile('');
          return true;
        },
        failure => {
          setView(current => ({
            ...current,
            entries: current.entries || [],
            error: t('common.pathPickerModal.cannotBrowse', { target, message: failure.message }),
          }));
          return false;
        }
      ),
    [status, hostId, t]
  );

  const go = target => {
    setPending(true);
    browse(target).finally(() => setPending(false));
  };

  useEffect(() => {
    const openAt = openingPath(mode, initialPath);
    browse(openAt).then(ok => {
      if (!ok && openAt !== '/') {
        browse('/');
      }
    });
  }, [browse, initialPath, mode]);

  const pick = () => {
    if (mode === 'file') {
      if (!selectedFile) {
        setView(current => ({ ...current, error: t('common.pathPickerModal.selectFile') }));
        return;
      }
      onPick(selectedFile);
    } else {
      onPick(view.path);
    }
    onClose();
  };

  return (
    <ToolFormDialog
      dialog="path-picker"
      title={title}
      submitKey={
        mode === 'file' ? 'common.pathPickerModal.pickFile' : 'common.pathPickerModal.pickFolder'
      }
      busy={loading}
      onClose={onClose}
      onSubmit={pick}
    >
      {view.error ? (
        <div className="alert alert-danger py-2" role="alert" data-note="problem">
          {view.error}
        </div>
      ) : null}
      <div className="input-group input-group-sm mb-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          title={t('common.pathPickerModal.upOneLevel')}
          onClick={() => go(parentOf(view.path))}
          disabled={loading || view.path === '/'}
        >
          <FaArrowUp aria-hidden="true" />
        </button>
        <input
          className="form-control font-monospace"
          aria-label={t('common.pathPickerModal.path')}
          value={typed}
          onChange={event => setTyped(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              go(typed.trim() || '/');
            }
          }}
          disabled={loading}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => go(typed.trim() || '/')}
          disabled={loading}
        >
          {t('common.pathPickerModal.go')}
        </button>
      </div>
      <div className="border rounded path-picker-list">
        {view.entries !== null && view.entries.length === 0 ? (
          <p className="text-muted small m-2 mb-2">{t('common.pathPickerModal.emptyDirectory')}</p>
        ) : null}
        {(view.entries || []).map(entry => (
          <EntryButton
            key={entry.path}
            entry={entry}
            selected={selectedFile === entry.path}
            clickable={entry.isDirectory || mode === 'file'}
            disabled={loading}
            onClick={() => {
              if (entry.isDirectory) {
                go(entry.path);
              } else if (mode === 'file') {
                setSelectedFile(entry.path);
              }
            }}
          />
        ))}
      </div>
      <p className="form-text text-muted mb-0 mt-2">
        {mode === 'file' ? (
          <>
            {t('common.pathPickerModal.selected')}:{' '}
            <code>{selectedFile || t('common.pathPickerModal.none')}</code>
          </>
        ) : (
          <>
            {t('common.pathPickerModal.picking')}: <code>{view.path}</code>
          </>
        )}
      </p>
    </ToolFormDialog>
  );
};

PathPickerModal.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['directory', 'file']),
  initialPath: PropTypes.string,
};

/**
 * A path field with a Browse button, the button drawn only while the
 * host's own row lists `file-browser`; the field is always typeable.
 */
export const PathInput = ({
  id,
  value,
  onChange,
  status,
  hostId,
  server = null,
  mode = 'directory',
  disabled = false,
  placeholder,
  className = 'form-control',
  pickTitle,
  list,
}) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const browsable = hostHasFeature(server, 'file-browser');
  return (
    <>
      <div className="input-group">
        <input
          id={id}
          className={className}
          type="text"
          list={list}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        />
        {browsable ? (
          <button
            type="button"
            className="btn btn-outline-secondary"
            data-action="browse"
            title={
              mode === 'file'
                ? t('common.pathInput.browseFile')
                : t('common.pathInput.browseFolder')
            }
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
          >
            <FaFolderOpen aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {browsable && pickerOpen ? (
        <PathPickerModal
          status={status}
          hostId={hostId}
          onClose={() => setPickerOpen(false)}
          mode={mode}
          initialPath={value}
          title={
            pickTitle ||
            (mode === 'file' ? t('common.pathInput.pickFile') : t('common.pathInput.pickFolder'))
          }
          onPick={onChange}
        />
      ) : null}
    </>
  );
};

PathInput.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  server: PropTypes.object,
  mode: PropTypes.oneOf(['directory', 'file']),
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  pickTitle: PropTypes.string,
  list: PropTypes.string,
};
