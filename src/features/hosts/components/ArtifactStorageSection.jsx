import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCompactDisc, FaFolder, FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import TabStrip from '../../../components/common/TabStrip';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import {
  copyArtifact,
  createStoragePath,
  deleteArtifacts,
  deleteStoragePath,
  downloadFromUrl,
  fetchArtifact,
  moveArtifact,
  prepareUpload,
  scanArtifacts,
  updateStoragePath,
  uploadArtifact,
} from '../api/artifacts';
import { useArtifactDownloads } from '../hooks/useArtifactDownloads';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { uploadPrepareBody } from '../utils/artifacts';

import ArtifactFilters from './ArtifactStorage/ArtifactFilters';
import ArtifactStorageModals from './ArtifactStorage/ArtifactStorageModals';
import ArtifactTable from './ArtifactStorage/ArtifactTable';
import { STORAGE_PATH_COLUMNS, StoragePathRowActions } from './ArtifactStorage/StoragePathTable';
import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';

const CLOSED = { kind: '' };

const NO_PROGRESS = {};

const TABS = [
  {
    key: 'storage-paths',
    labelKey: 'artifacts.artifactManagement.storageLocationsTab',
    icon: FaFolder,
  },
  { key: 'artifacts', labelKey: 'artifacts.artifactManagement.artifactsTab', icon: FaCompactDisc },
];

const pathKey = row => String(row.id);

const percentOf = event => Math.round((event.loaded * 100) / (event.total || event.loaded || 1));

/**
 * The ISO and artifacts section of the Manage page, hyperweaver-ui's
 * `ArtifactManagement` behind `artifacts`: two tabs, the storage
 * locations and the artifacts, each over the one table the page's
 * binding narrows, the request filters of the artifacts in the navbar's
 * panel and their page under the table; Create storage location on the
 * first tab, and on the second Upload files, Download from URL and Scan
 * storage with the transfers in flight above the rows. Every write is
 * one request and one notice through `useManageSend`; a delete waits
 * behind the typed confirmation; an upload prepares each file and puts
 * it through the client with its progress drawn; the tasks a download,
 * an upload and a scan queue are followed on `task-updated` and the
 * lists read again at their end. A location's name opens its artifacts
 * with the location filter set. Nothing polls.
 */
const ArtifactStorageSection = ({ id, server, ctx, data, search, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [tab, setTab] = useState('storage-paths');
  const [open, setOpen] = useState(CLOSED);
  const [confirm, setConfirm] = useState(null);
  const [progress, setProgress] = useState(NO_PROGRESS);
  const [uploading, setUploading] = useState(false);
  const { reads, rows, pagination } = data;
  const transfers = useArtifactDownloads({ id, onRefresh: reads.artifacts.refresh });
  const follow = useTaskFollow({
    id,
    onEnd: () => {
      reads.artifacts.refresh();
      reads.storagePaths.refresh();
    },
  });
  const tabs = TABS.map(entry => ({ key: entry.key, label: t(entry.labelKey), icon: entry.icon }));

  const close = () => setOpen(CLOSED);

  const refreshPaths = () => reads.storagePaths.refresh();

  const refreshArtifacts = () => reads.artifacts.refresh();

  const sent = async (request, after) => {
    const { answer, error } = await send(request);
    if (!error) {
      close();
      after(answer);
    }
    return { answer, error };
  };

  const locationOf = answer =>
    data.rows.storagePaths.find(path => path.id === answer?.storage_location?.id);

  const startTransfer = (answer, info) => {
    if (answer?.task_id) {
      transfers.start(answer.task_id, {
        ...info,
        storageLocation: answer.storage_location || locationOf(answer),
      });
      setTab('artifacts');
    }
  };

  const upload = async ({ form, files }) => {
    setUploading(true);
    setProgress(
      Object.fromEntries(files.map(file => [file.name, { status: 'uploading', progress: 0 }]))
    );
    const results = await Promise.all(
      files.map(file =>
        prepareUpload(status, id, uploadPrepareBody(file, form))
          .then(prepared => {
            if (!prepared?.task_id) {
              throw new Error(t('hosts.manage.artifacts.uploadFailed', { name: file.name }));
            }
            return uploadArtifact(status, id, prepared.task_id, file, event =>
              setProgress(current => ({
                ...current,
                [file.name]: { status: 'uploading', progress: percentOf(event) },
              }))
            );
          })
          .then(answer => {
            setProgress(current => ({
              ...current,
              [file.name]: { status: 'completed', progress: 100 },
            }));
            return { file, answer, error: null };
          })
          .catch(error => {
            setProgress(current => ({
              ...current,
              [file.name]: { status: 'error', progress: 0, error: error.message },
            }));
            return { file, answer: null, error };
          })
      )
    );
    setUploading(false);
    const done = results.filter(result => !result.error);
    if (done.length === 0) {
      notify('danger', t('artifacts.artifactUploadModal.uploadErrorAllFailed'));
      return;
    }
    notify('success', t('hosts.manage.artifacts.uploaded', { count: done.length }));
    done.forEach(({ file, answer }) =>
      startTransfer(answer, { filename: answer?.filename || file.name, isUpload: true })
    );
    close();
    refreshArtifacts();
  };

  const onSend = (kind, body, row) => {
    switch (kind) {
      case 'storage-path-create':
        return sent(
          {
            call: () => createStoragePath(status, id, body),
            doneKey: 'hosts.manage.artifacts.pathCreated',
            values: { name: body.name },
            failKey: 'hosts.manage.artifacts.failed',
          },
          refreshPaths
        );
      case 'storage-path-edit':
        return sent(
          {
            call: () => updateStoragePath(status, id, row.id, body),
            doneKey: 'hosts.manage.artifacts.pathUpdated',
            values: { name: body.name },
            failKey: 'hosts.manage.artifacts.failed',
          },
          refreshPaths
        );
      case 'artifact-download':
        return sent(
          {
            call: () => downloadFromUrl(status, id, body),
            doneKey: 'hosts.manage.artifacts.downloadQueued',
            values: { url: body.url },
            failKey: 'hosts.manage.artifacts.failed',
          },
          answer =>
            startTransfer(answer, { filename: answer?.filename || body.filename, url: body.url })
        );
      case 'artifact-move':
        return sent(
          {
            call: () => moveArtifact(status, id, row.id, body),
            doneKey: 'hosts.manage.artifacts.moved',
            values: { name: row.filename },
            failKey: 'hosts.manage.artifacts.failed',
          },
          answer => {
            follow(answer);
            refreshArtifacts();
          }
        );
      case 'artifact-copy':
        return sent(
          {
            call: () => copyArtifact(status, id, row.id, body),
            doneKey: 'hosts.manage.artifacts.copied',
            values: { name: row.filename },
            failKey: 'hosts.manage.artifacts.failed',
          },
          answer => {
            follow(answer);
            refreshArtifacts();
          }
        );
      default:
        return upload(body);
    }
  };

  const togglePath = row =>
    sent(
      {
        call: () => updateStoragePath(status, id, row.id, { enabled: !row.enabled }),
        doneKey: row.enabled
          ? 'hosts.manage.artifacts.pathDisabled'
          : 'hosts.manage.artifacts.pathEnabled',
        values: { name: row.name },
        failKey: 'hosts.manage.artifacts.failed',
      },
      refreshPaths
    );

  const scan = () =>
    sent(
      {
        call: () => scanArtifacts(status, id),
        doneKey: 'hosts.manage.artifacts.scanQueued',
        failKey: 'hosts.manage.artifacts.failed',
      },
      follow
    );

  const openDetails = async artifact => {
    try {
      const details = await fetchArtifact(status, id, artifact.id);
      setOpen({ kind: 'artifact-details', artifact, details });
    } catch (error) {
      notify('danger', t('hosts.manage.artifacts.detailsFailed', { message: error.message }));
    }
  };

  const confirmed = () => {
    if (confirm.kind === 'storage-path') {
      return sent(
        {
          call: () => deleteStoragePath(status, id, confirm.row.id),
          doneKey: 'hosts.manage.artifacts.pathDeleted',
          values: { name: confirm.row.name },
          failKey: 'hosts.manage.artifacts.failed',
        },
        refreshPaths
      );
    }
    return sent(
      {
        call: () => deleteArtifacts(status, id, confirm.ids),
        doneKey: 'hosts.manage.artifacts.deleted',
        values: { count: confirm.ids.length },
        failKey: 'hosts.manage.artifacts.failed',
      },
      refreshArtifacts
    );
  };

  const onPathAction = (action, row) => {
    if (action === 'edit') {
      setOpen({ kind: 'storage-path-edit', storagePath: row });
    } else if (action === 'toggle') {
      togglePath(row);
    } else {
      setConfirm({ kind: 'storage-path', row });
    }
  };

  const onArtifactAction = (action, row) => {
    if (action === 'details') {
      openDetails(row);
    } else if (action === 'delete') {
      setConfirm({ kind: 'artifacts', ids: [row.id] });
    } else {
      setOpen({ kind: `artifact-${action}`, artifact: row });
    }
  };

  const openLocation = row => {
    data.setParam('storage_location', row.id);
    setTab('artifacts');
  };

  const tableCtx = { ...ctx, onStoragePath: openLocation };

  return (
    <div data-panel="artifact-storage" data-active={tab}>
      <TabStrip tabs={tabs} active={tab} onSelect={setTab} className="mb-3" />
      {tab === 'storage-paths' ? (
        <div data-panel="storage-paths">
          <p className="text-muted">
            {t('artifacts.artifactManagement.storageLocationsDescription', {
              hostname: server.hostname,
            })}
          </p>
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="fw-semibold">
              {t('artifacts.artifactManagement.storagePathsCount', {
                count: rows.storagePaths.length,
              })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-primary ms-auto"
              data-action="storage-path-create"
              disabled={busy}
              onClick={() => setOpen({ kind: 'storage-path-create' })}
            >
              <FaPlus className="me-1" aria-hidden="true" />
              {t('artifacts.artifactManagement.createStoragePathButton')}
            </button>
          </div>
          <ManageTable
            name="storage-paths"
            columns={STORAGE_PATH_COLUMNS}
            table={search.storagePaths}
            rowKey={pathKey}
            RowActions={StoragePathRowActions}
            actionsProps={{ busy, onAction: onPathAction }}
            ctx={tableCtx}
            emptyKey="artifacts.storagePathTable.noStoragePathsFound"
            reading={reads.storagePaths}
            filtering={filtering}
          />
        </div>
      ) : (
        <div data-panel="artifacts">
          <p className="text-muted">
            {t('artifacts.artifactManagement.artifactsDescription', { hostname: server.hostname })}
          </p>
          <ArtifactFilters
            storagePaths={rows.storagePaths}
            busy={busy}
            onUpload={() => setOpen({ kind: 'artifact-upload' })}
            onDownload={() => setOpen({ kind: 'artifact-download' })}
            onScan={scan}
          />
          <ArtifactTable
            table={search.artifacts}
            reading={reads.artifacts}
            filtering={filtering}
            ctx={ctx}
            transfers={transfers.transfers}
            pagination={pagination}
            busy={busy}
            onAction={onArtifactAction}
            onDeleteMany={ids => setConfirm({ kind: 'artifacts', ids })}
            onPage={data.setOffset}
            onCancelTransfer={transfers.stop}
          />
        </div>
      )}
      <ArtifactStorageModals
        id={id}
        server={server}
        open={open}
        storagePaths={rows.storagePaths}
        busy={busy || uploading}
        progress={progress}
        onClose={() => {
          close();
          setProgress(NO_PROGRESS);
        }}
        onSend={onSend}
      />
      <ConfirmModal
        show={confirm !== null}
        handleClose={() => setConfirm(null)}
        handleConfirm={confirmed}
        title={t(
          confirm?.kind === 'storage-path'
            ? 'artifacts.artifactManagement.deleteStoragePathTitle'
            : 'artifacts.artifactManagement.deleteArtifactsTitle'
        )}
        message={
          confirm?.kind === 'storage-path'
            ? t('artifacts.artifactManagement.deleteStoragePathMessage', { name: confirm.row.name })
            : t('artifacts.artifactManagement.deleteArtifactsMessage', {
                count: confirm?.ids?.length || 0,
              })
        }
        keyword={t('hosts.manage.artifacts.deleteWord').toLowerCase()}
        confirmText={t('artifacts.artifactManagement.deleteButton')}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

ArtifactStorageSection.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  data: PropTypes.shape({
    reads: PropTypes.shape({
      storagePaths: PropTypes.object.isRequired,
      artifacts: PropTypes.object.isRequired,
    }).isRequired,
    rows: PropTypes.shape({
      storagePaths: PropTypes.array.isRequired,
      artifacts: PropTypes.array.isRequired,
    }).isRequired,
    pagination: PropTypes.object.isRequired,
    setParam: PropTypes.func.isRequired,
    setOffset: PropTypes.func.isRequired,
  }).isRequired,
  search: PropTypes.shape({
    storagePaths: PropTypes.object.isRequired,
    artifacts: PropTypes.object.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default ArtifactStorageSection;
