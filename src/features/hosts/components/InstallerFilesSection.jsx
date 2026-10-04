import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCloudArrowDown,
  FaFileImport,
  FaMagnifyingGlass,
  FaTrash,
  FaUpload,
} from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useSelection } from '../../../hooks/useSelection';
import { downloadArtifactFile } from '../api/artifacts';
import {
  copyArtifact,
  createArtifactStoragePath,
  deleteArtifactStoragePath,
  deleteArtifacts,
  moveArtifact,
  scanArtifacts,
  updateArtifactStoragePath,
} from '../api/provisioning';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import {
  ARTIFACT_PAGE_SIZE,
  TABLE_STATE_KEYS,
  roleOptionsOf,
  secretNamesOf,
  tableStateOf,
} from '../utils/manageCatalog';

import { ARTIFACT_COLUMNS, ArtifactRowActions, LocationsCard } from './ArtifactColumns';
import {
  DeleteArtifactsModal,
  DownloadModal,
  HclDownloadModal,
  LocationDeleteModal,
  LocationFormModal,
  RegisterModal,
  TransferModal,
  UploadModal,
} from './InstallerFilesModals';
import TaskDialog from './TaskDialog';

const rowKey = row => String(row.id);

const OPENERS = [
  ['upload', FaUpload, 'host.installerFiles.upload', 'primary'],
  ['register', FaFileImport, 'host.installerFiles.registerPath', 'primary'],
  ['download', FaCloudArrowDown, 'host.installerFiles.downloadUrl', 'info'],
  ['hcl', FaCloudArrowDown, 'host.installerFiles.hclPortal', 'info'],
];

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const InstallerDialogs = ({ dialog, id, server, rows, reads, sender, count, on }) => {
  const roleOptions = roleOptionsOf(rows.installers);
  const entry = { id, sender, onClose: on.close, onDone: on.done };
  switch (dialog?.kind) {
    case 'upload':
      return <UploadModal {...entry} locations={rows.locations} roleOptions={roleOptions} />;
    case 'register':
      return (
        <RegisterModal
          {...entry}
          server={server}
          locations={rows.locations}
          roleOptions={roleOptions}
        />
      );
    case 'download':
      return (
        <DownloadModal
          {...entry}
          locations={rows.locations}
          roleOptions={roleOptions}
          resourceNames={secretNamesOf(reads.secrets.data, 'custom_resource_url')}
        />
      );
    case 'hcl':
      return (
        <HclDownloadModal
          {...entry}
          roleOptions={roleOptions}
          hclKeyNames={secretNamesOf(reads.secrets.data, 'hcl_download_portal_api_keys')}
        />
      );
    case 'location-add':
    case 'location-edit':
      return (
        <LocationFormModal
          id={id}
          server={server}
          editing={dialog.location || null}
          busy={sender.busy}
          onClose={on.close}
          onSubmit={on.saveLocation}
        />
      );
    case 'location-delete':
      return (
        <LocationDeleteModal
          location={dialog.location}
          busy={sender.busy}
          onClose={on.close}
          onSubmit={on.deleteLocation}
        />
      );
    case 'move':
    case 'copy':
      return (
        <TransferModal
          kind={dialog.kind}
          artifact={dialog.artifact}
          locations={rows.locations}
          busy={sender.busy}
          onClose={on.close}
          onSubmit={on.transfer}
        />
      );
    case 'delete':
      return (
        <DeleteArtifactsModal
          count={count}
          busy={sender.busy}
          onClose={on.close}
          onSubmit={on.deleteSelected}
        />
      );
    default:
      return null;
  }
};

InstallerDialogs.propTypes = {
  dialog: PropTypes.object,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  rows: PropTypes.object.isRequired,
  reads: PropTypes.object.isRequired,
  sender: PropTypes.object.isRequired,
  count: PropTypes.number.isRequired,
  on: PropTypes.shape({
    close: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    saveLocation: PropTypes.func.isRequired,
    deleteLocation: PropTypes.func.isRequired,
    transfer: PropTypes.func.isRequired,
    deleteSelected: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The installer files of a host: the storage locations card, the Upload,
 * Register path, Download URL and HCL portal dialogs, Scan all, and the
 * artifacts table with its selection, row actions and Load more, every
 * queued task followed to its end.
 */
const InstallerFilesSection = ({
  id,
  server,
  ctx,
  table,
  reads,
  rows,
  params,
  setParam,
  filtering,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const [verify, setVerify] = useState(false);
  const [saving, setSaving] = useState(false);
  const selection = useSelection(table.rows, { keyOf: rowKey, labelOf: row => row.filename });
  const reread = () => {
    reads.locations.refresh();
    reads.installers.refresh();
  };
  const follow = useTaskFollow({ id, onEnd: reread });
  const sender = { send, follow, busy };
  const state = tableStateOf({ ...reads.installers, filtering, rows: table.rows.length });
  const pagination = reads.installers.data?.pagination || null;

  const write = async ({ call, doneKey, values = {}, failKey, followed = true }) => {
    const { answer, error } = await send({ call, doneKey, values, failKey });
    if (!error) {
      setDialog(null);
      if (followed) {
        follow(answer);
      }
      reread();
    }
    return !error;
  };

  const onLocationAction = (action, location) => {
    if (action === 'edit' || action === 'delete') {
      setDialog({ kind: `location-${action}`, location });
      return;
    }
    if (action === 'scan') {
      write({
        call: () => scanArtifacts(status, id, { storage_path_id: location.id }),
        doneKey: 'host.installerFiles.scanOfQueued',
        values: { name: location.name },
        failKey: 'host.installerFiles.scanFailed',
      });
      return;
    }
    const enabled = location.enabled === false;
    write({
      call: () => updateArtifactStoragePath(status, id, location.id, { enabled }),
      doneKey: enabled
        ? 'host.installerFiles.locationEnabled'
        : 'host.installerFiles.locationDisabled',
      values: { name: location.name },
      failKey: 'host.installerFiles.locationUpdateFailed',
      followed: false,
    });
  };

  const saveLocation = body => {
    const editing = dialog.location || null;
    write({
      call: () =>
        editing
          ? updateArtifactStoragePath(status, id, editing.id, body)
          : createArtifactStoragePath(status, id, body),
      doneKey: editing
        ? 'host.installerFiles.locationUpdated'
        : 'host.installerFiles.locationAdded',
      values: { name: body.name },
      failKey: 'host.installerFiles.locationSaveFailed',
      followed: false,
    });
  };

  const download = async artifact => {
    setSaving(true);
    try {
      saveBlob(await downloadArtifactFile(status, id, artifact.id), artifact.filename);
    } catch (error) {
      notify('danger', t('host.installerFiles.downloadFailed', { message: error.message }));
    } finally {
      setSaving(false);
    }
  };

  const onArtifactAction = (action, artifact) => {
    if (action === 'download') {
      download(artifact);
    } else {
      setDialog({ kind: action, artifact });
    }
  };

  const transfer = destination => {
    const { kind, artifact } = dialog;
    const call = kind === 'move' ? moveArtifact : copyArtifact;
    write({
      call: () => call(status, id, artifact.id, destination),
      doneKey:
        kind === 'move' ? 'host.installerFiles.moveQueued' : 'host.installerFiles.copyQueued',
      failKey:
        kind === 'move' ? 'host.installerFiles.moveFailed' : 'host.installerFiles.copyFailed',
    });
  };

  const deleteSelected = async filesToo => {
    const ok = await write({
      call: () =>
        deleteArtifacts(status, id, {
          artifact_ids: [...selection.selected].map(Number),
          delete_files: filesToo,
        }),
      doneKey: 'host.installerFiles.deleteQueuedDefault',
      failKey: 'host.installerFiles.deleteFailed',
    });
    if (ok) {
      selection.clear();
    }
  };

  return (
    <div data-panel="installer-files-body">
      <LocationsCard
        locations={rows.locations}
        busy={busy}
        onAction={onLocationAction}
        onAdd={() => setDialog({ kind: 'location-add' })}
      />
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          {OPENERS.map(([kind, Icon, labelKey, tone]) => (
            <button
              key={kind}
              type="button"
              className={`btn btn-sm btn-${tone}`}
              data-action={`artifact-${kind}`}
              onClick={() => setDialog({ kind })}
              disabled={busy}
            >
              <Icon className="me-1" aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
          {selection.someSelected ? (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              data-action="artifact-delete"
              onClick={() => setDialog({ kind: 'delete' })}
              disabled={busy}
            >
              <FaTrash className="me-1" aria-hidden="true" />
              {t('host.installerFiles.deleteSelected', { count: selection.selected.size })}
            </button>
          ) : null}
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch mb-0">
            <input
              id="artifact-scan-verify"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={verify}
              onChange={event => setVerify(event.target.checked)}
            />
            <label className="form-check-label small" htmlFor="artifact-scan-verify">
              {t('host.installerFiles.reHashAll')}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            data-action="artifact-scan"
            onClick={() =>
              write({
                call: () => scanArtifacts(status, id, { verify_checksums: verify }),
                doneKey: 'host.installerFiles.scanQueuedDefault',
                failKey: 'host.installerFiles.scanFailed',
              })
            }
            disabled={busy}
          >
            <FaMagnifyingGlass className="me-1" aria-hidden="true" />
            {t('host.installerFiles.scanAll')}
          </button>
          <span className="badge text-bg-secondary" data-note="artifact-count">
            {pagination?.total !== undefined
              ? t('host.installerFiles.entriesCountTotal', {
                  shown: rows.installers.length,
                  total: pagination.total,
                })
              : t('host.installerFiles.entriesCount', { count: rows.installers.length })}
          </span>
        </div>
      </div>
      <div data-table="installers" data-state={state}>
        <SubTable
          columns={ARTIFACT_COLUMNS}
          rows={table.rows}
          rowKey={rowKey}
          rowRef={table.rowRef || null}
          RowActions={ArtifactRowActions}
          actionsProps={{ busy: busy || saving, onAction: onArtifactAction }}
          selection={selection.subtable}
          sort={table.sort}
          onSort={table.setSort}
          hiddenColumns={table.hiddenColumns}
          widths={table.widths}
          onResize={table.setColumnWidth}
          ctx={ctx}
          emptyText={t(TABLE_STATE_KEYS[state] || 'host.installerFiles.emptyArtifacts')}
        />
      </div>
      {pagination?.has_more ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mt-2"
          data-action="artifact-more"
          onClick={() =>
            setParam('installers', 'limit', params.installers.limit + ARTIFACT_PAGE_SIZE)
          }
          disabled={busy}
        >
          {t('host.installerFiles.loadMore')}
        </button>
      ) : null}
      <InstallerDialogs
        dialog={dialog}
        id={id}
        server={server}
        rows={rows}
        reads={reads}
        sender={sender}
        count={selection.selected.size}
        on={{
          close: () => setDialog(null),
          done: () => {
            setDialog(null);
            reread();
          },
          saveLocation,
          deleteLocation: options =>
            write({
              call: () => deleteArtifactStoragePath(status, id, dialog.location.id, options),
              doneKey: 'host.installerFiles.locationDeleteQueued',
              values: { name: dialog.location.name },
              failKey: 'host.installerFiles.locationDeleteFailed',
            }),
          transfer,
          deleteSelected,
        }}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

InstallerFilesSection.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reads: PropTypes.shape({
    locations: PropTypes.object.isRequired,
    installers: PropTypes.object.isRequired,
    secrets: PropTypes.object.isRequired,
  }).isRequired,
  rows: PropTypes.shape({
    locations: PropTypes.array.isRequired,
    installers: PropTypes.array.isRequired,
  }).isRequired,
  params: PropTypes.shape({
    installers: PropTypes.shape({ limit: PropTypes.number.isRequired }).isRequired,
  }).isRequired,
  setParam: PropTypes.func.isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default InstallerFilesSection;
