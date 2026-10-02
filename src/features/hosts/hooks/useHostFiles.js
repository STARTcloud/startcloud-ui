import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import {
  copyFile,
  createFolder,
  deleteFile,
  downloadFile,
  listFiles,
  moveFile,
  renameFile,
  uploadConfig,
} from '../api/files';
import {
  DEFAULT_FOLDER_MODE,
  getPathFromFile,
  ownershipFields,
  parentPathsOf,
  toAgentPath,
  toDisplayPath,
  transformFilesToHierarchy,
  uploadFields,
  withDirectories,
} from '../utils/fileManager';

import { ManageRefreshContext, useManageSend, useTaskFollow } from './useHostManage';
import { useHostRow } from './useHostRow';

const EMPTY_LISTING = { items: [], currentPath: '/' };

const joinPath = (base, name) => `${base === '/' ? '' : base}/${name}`;

/**
 * Hand a blob to the browser as a download named `name`.
 *
 * @param {Blob} blob - The file
 * @param {string} name - The file's name
 */
export const saveBlob = (blob, name) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

/**
 * The state of a host's file manager, hyperweaver-ui's
 * `EnhancedFileManager` and its handlers: the files the manager draws,
 * the current display path and the directory the agent's `/` resolved
 * to, the listing read once on open, again on the page's Refresh, when
 * the stream opens fresh or answers `reset`, on the manager's own
 * Refresh and after every write's answer; the root's and the parents'
 * directories read once each and held for the navigation pane; the
 * writes of cubone's own toolbar, a folder, a rename, a delete and a
 * paste, each one request and one notice through `useManageSend`, a
 * copy's, a move's, an archive's and an extract's task followed on
 * `task-updated` and the listing read again at its end; the download
 * through the client's raw fetch; and cubone's upload config, the
 * agent's path with the session's headers. Nothing polls.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @returns {Object} The manager's state and handlers
 */
export const useHostFiles = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const server = useHostRow(id);
  const presses = useContext(ManageRefreshContext);
  const { send, busy, task, closeTask } = useManageSend(id);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [upload, setUpload] = useState(null);
  const [selected, setSelected] = useState([]);
  const root = useRef(null);
  const cache = useRef(new Map());
  const turn = useRef(0);
  const pathRef = useRef(currentPath);

  useEffect(() => {
    pathRef.current = currentPath;
  }, [currentPath]);

  const listing = useCallback(
    async path => {
      const answer = await listFiles(status, id, { path: toAgentPath(root.current, path) });
      if (!Array.isArray(answer?.items)) {
        return EMPTY_LISTING;
      }
      if (root.current === null && path === '/' && answer.current_path) {
        root.current = answer.current_path;
      }
      return {
        items: transformFilesToHierarchy(
          answer.items.map(item => ({ ...item, path: toDisplayPath(root.current, item.path) }))
        ),
        currentPath: toDisplayPath(root.current, answer.current_path) || path,
      };
    },
    [status, id]
  );

  const directoriesOf = useCallback(
    async path => {
      const cached = cache.current.get(path);
      if (cached) {
        return cached;
      }
      try {
        const { items } = await listing(path);
        const dirs = items.filter(file => file.isDirectory);
        cache.current.set(path, dirs);
        return dirs;
      } catch {
        return [];
      }
    },
    [listing]
  );

  const loadFiles = useCallback(
    (path = pathRef.current) => {
      turn.current += 1;
      const own = turn.current;
      const fresh = () => own === turn.current;
      const request = listing(path);
      return Promise.resolve()
        .then(() => {
          if (fresh()) {
            setLoading(true);
            setFailure('');
          }
          return request;
        })
        .then(async ({ items, currentPath: answered }) => {
          const lists =
            path === '/' ? [] : await Promise.all(['/', ...parentPathsOf(path)].map(directoriesOf));
          if (!fresh()) {
            return;
          }
          setFiles(withDirectories(items, lists));
          if (answered && answered !== path) {
            setCurrentPath(answered);
          }
        })
        .catch(error => {
          log.api.error('File listing failed', { error: error.message });
          if (fresh()) {
            setFailure(
              t('fileManager.enhancedFileManager.failedToLoadFiles', { message: error.message })
            );
            setFiles([]);
          }
        })
        .finally(() => {
          if (fresh()) {
            setLoading(false);
          }
        });
    },
    [listing, directoriesOf, t]
  );

  const refresh = useCallback(() => {
    cache.current = new Map();
    return loadFiles();
  }, [loadFiles]);

  const follow = useTaskFollow({ id, onEnd: refresh });

  useEffect(() => {
    loadFiles(currentPath);
  }, [loadFiles, currentPath]);

  useEffect(() => {
    if (presses > 0) {
      refresh();
    }
  }, [presses, refresh]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      refresh();
    }
  });

  useEventStream('reset', () => refresh());

  useEffect(() => {
    uploadConfig(status, id).then(setUpload, () => setUpload(null));
  }, [status, id]);

  const agentPathOf = displayPath => toAgentPath(root.current, displayPath);

  const written = async request => {
    const { answer, error } = await send(request);
    if (!error) {
      follow(answer);
      refresh();
    }
    return { answer, error };
  };

  const onCreateFolder = (name, parentFolder) =>
    written({
      call: () =>
        createFolder(status, id, {
          path: agentPathOf(parentFolder ? getPathFromFile(parentFolder) : currentPath),
          name,
          mode: DEFAULT_FOLDER_MODE,
          ...ownershipFields(server),
        }),
      doneKey: 'hosts.manage.files.folderCreated',
      values: { name },
      failKey: 'hosts.manage.files.failed',
    });

  const onRename = (file, newName) =>
    written({
      call: () =>
        renameFile(status, id, { path: agentPathOf(getPathFromFile(file)), new_name: newName }),
      doneKey: 'hosts.manage.files.renamed',
      values: { name: file.name, newName },
      failKey: 'hosts.manage.files.failed',
    });

  const onDelete = list =>
    written({
      call: () =>
        Promise.all(
          list.map(file =>
            deleteFile(status, id, {
              path: agentPathOf(getPathFromFile(file)),
              recursive: Boolean(file.isDirectory),
              force: false,
            })
          )
        ),
      doneKey: 'hosts.manage.files.deleted',
      values: { count: list.length },
      failKey: 'hosts.manage.files.failed',
    });

  const onPaste = async (list, destination, operation) => {
    const call = operation === 'move' ? moveFile : copyFile;
    const base = destination ? getPathFromFile(destination) : '/';
    const { answer, error } = await send({
      call: () =>
        Promise.all(
          list.map(file =>
            call(status, id, {
              source: agentPathOf(getPathFromFile(file)),
              destination: agentPathOf(joinPath(base, file.name)),
            })
          )
        ),
      doneKey: operation === 'move' ? 'hosts.manage.files.moved' : 'hosts.manage.files.copied',
      values: { count: list.length },
      failKey: 'hosts.manage.files.failed',
    });
    if (!error) {
      (answer || []).forEach(follow);
      refresh();
    }
  };

  const onDownload = list => {
    list
      .filter(file => !file.isDirectory)
      .forEach(file => {
        downloadFile(status, id, agentPathOf(getPathFromFile(file))).then(
          blob => saveBlob(blob, file.name),
          error =>
            notify(
              'danger',
              t('hosts.manage.files.downloadFailed', { name: file.name, message: error.message })
            )
        );
      });
  };

  const onFolderChange = path => setCurrentPath(path || '/');

  const onError = error =>
    notify('danger', t('hosts.manage.files.failed', { message: error?.message || '' }));

  const onFileUploading = (...args) => {
    const [, parentFolder] = args;
    return uploadFields({
      uploadPath: agentPathOf(parentFolder?.path || currentPath || '/'),
      server,
    });
  };

  return {
    server,
    files,
    currentPath,
    loading,
    failure,
    upload,
    selected,
    busy,
    task,
    closeTask,
    send: written,
    refresh,
    agentPathOf,
    handlers: {
      onCreateFolder,
      onRename,
      onDelete,
      onPaste,
      onDownload,
      onFolderChange,
      onRefresh: refresh,
      onError,
      onFileUploading,
      onFileUploaded: refresh,
      onSelectionChange: setSelected,
    },
  };
};
