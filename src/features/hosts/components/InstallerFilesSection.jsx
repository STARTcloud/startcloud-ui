import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaBoxOpen,
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
import { copyArtifact, deleteArtifacts, moveArtifact, scanArtifacts } from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { useManageRead, useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { hostHasFeature } from '../utils/capabilities';
import {
  ARTIFACT_PAGE_SIZE,
  FILE_SOURCES,
  TABLE_STATE_KEYS,
  missingSeedOf,
  roleOptionsOf,
  tableStateOf,
} from '../utils/manageCatalog';

import { ARTIFACT_COLUMNS, ArtifactRowActions } from './ArtifactColumns';
import {
  DeleteArtifactsModal,
  DownloadModal,
  HclDownloadModal,
  RegisterModal,
  RegistryDownloadModal,
  TransferModal,
  UploadModal,
} from './InstallerFilesModals';
import TaskDialog from './TaskDialog';

const rowKey = row => String(row.id);

const NO_SOURCES = [];

/**
 * The openers of the installer files, each its kind, glyph, label key
 * and tone: Upload, Register path, From BoxVault, Download URL and HCL
 * portal.
 */
export const OPENERS = [
  ['upload', FaUpload, 'host.installerFiles.upload', 'primary'],
  ['register', FaFileImport, 'host.installerFiles.registerPath', 'primary'],
  ['registry', FaBoxOpen, 'host.installerFiles.fromBoxVault', 'info'],
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

const InstallerDialogs = ({ dialog, id, server, rows, sender, count, offered, on }) => {
  const roleOptions = roleOptionsOf(rows.installers);
  const entry = {
    id,
    sender,
    onClose: on.close,
    onDone: on.done,
    seed: dialog?.seed || null,
    offered,
    onSwitch: on.switchSource,
  };
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
    case 'registry':
      return (
        <RegistryDownloadModal
          {...entry}
          locations={rows.locations}
          sources={rows.sources}
          roleOptions={roleOptions}
        />
      );
    case 'download':
      return (
        <DownloadModal
          {...entry}
          server={server}
          locations={rows.locations}
          roleOptions={roleOptions}
        />
      );
    case 'hcl':
      return <HclDownloadModal {...entry} server={server} roleOptions={roleOptions} />;
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
  sender: PropTypes.object.isRequired,
  count: PropTypes.number.isRequired,
  offered: PropTypes.arrayOf(PropTypes.string).isRequired,
  on: PropTypes.shape({
    close: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    switchSource: PropTypes.func.isRequired,
    transfer: PropTypes.func.isRequired,
    deleteSelected: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The installer files of a host, the storage locations drawn by the one
 * table of `ArtifactStorageSection`: the Upload,
 * Register path, From BoxVault, Download URL and HCL portal dialogs,
 * From BoxVault while the host lists `templates`, its registries read
 * through `GET templates/sources`, the Download URL and HCL portal
 * dialogs picking their credential among the host store's secret rows
 * as they open, Scan all, and the artifacts table with
 * its selection, row actions and Load more, a missing file's glyph
 * opening the Download URL dialog seeded with the file, its role, its
 * kind and the sha256 it is known by and offering every other source,
 * every queued task followed to its end.
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
  const registries = hostHasFeature(server, 'templates');
  const sources = useManageRead(
    useCallback(() => fetchTemplateSources(status, id), [status, id]),
    registries
  );
  const offered = registries ? FILE_SOURCES : FILE_SOURCES.filter(kind => kind !== 'registry');
  const openers = OPENERS.filter(([kind]) => offered.includes(kind));
  const selection = useSelection(table.rows, { keyOf: rowKey, labelOf: row => row.filename });
  const reread = () => {
    reads.locations.refresh();
    reads.installers.refresh();
  };
  const follow = useTaskFollow({ id, onEnd: reread });
  const sender = { send, follow, busy };
  const state = tableStateOf({ ...reads.installers, filtering, rows: table.rows.length });
  const pagination = reads.installers.data?.pagination || null;
  const onMissing = useCallback(artifact => {
    setDialog({ kind: 'download', seed: missingSeedOf(artifact) });
  }, []);
  const tableCtx = { ...ctx, onMissing };

  const write = async ({ call, doneKey, values = {}, failKey }) => {
    const { answer, error } = await send({ call, doneKey, values, failKey });
    if (!error) {
      setDialog(null);
      follow(answer);
      reread();
    }
    return !error;
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
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          {openers.map(([kind, Icon, labelKey, tone]) => (
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
          ctx={tableCtx}
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
        rows={{ ...rows, sources: Array.isArray(sources.data) ? sources.data : NO_SOURCES }}
        sender={sender}
        count={selection.selected.size}
        offered={offered}
        on={{
          close: () => setDialog(null),
          done: () => {
            setDialog(null);
            reread();
          },
          switchSource: kind => setDialog(current => ({ kind, seed: current?.seed || null })),
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
