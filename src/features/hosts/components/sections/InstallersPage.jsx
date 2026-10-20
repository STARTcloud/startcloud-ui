import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFolderOpen, FaMagnifyingGlass } from 'react-icons/fa6';

import SplitButton from '../../../../components/common/SplitButton';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { downloadArtifactFile, fetchArtifact } from '../../api/artifacts';
import {
  copyArtifact,
  deleteArtifacts,
  fetchArtifactStoragePaths,
  moveArtifact,
  scanArtifacts,
} from '../../api/provisioning';
import { fetchTemplateSources } from '../../api/templates';
import { useArtifactDownloads } from '../../hooks/useArtifactDownloads';
import { saveBlob } from '../../hooks/useHostFiles';
import { useManageRead, useManageSend, useTaskFollow } from '../../hooks/useHostManage';
import { sectionTitle } from '../../pages';
import { hostHasFeature } from '../../utils/capabilities';
import { hostFilesAdapter } from '../../utils/hostCatalog';
import { FILE_SOURCES, missingSeedOf, roleOptionsOf } from '../../utils/manageCatalog';
import ArtifactDetailsModal from '../ArtifactDetailsModal';
import ArtifactTransfers from '../ArtifactTransfers';
import { HeldListing } from '../HeldListing';
import { PaneButton } from '../HostCatalogInstall';
import { hostFilesCollection } from '../HostFileColumns';
import {
  DeleteArtifactsModal,
  DownloadModal,
  HclDownloadModal,
  OPENERS,
  RegisterModal,
  RegistryDownloadModal,
  TransferModal,
  UploadModal,
} from '../InstallerFilesModals';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import StorageLocationsModal from '../StorageLocationsModal';
import TaskDialog from '../TaskDialog';

const NO_ROWS = [];

const listOf = (reading, member) =>
  Array.isArray(reading.data?.[member]) ? reading.data[member] : NO_ROWS;

const rowsOf = reading => (Array.isArray(reading.data) ? reading.data : NO_ROWS);

const offeredOf = server =>
  FILE_SOURCES.filter(
    kind =>
      (kind !== 'registry' || hostHasFeature(server, 'templates')) &&
      (kind !== 'hcl' || hostHasFeature(server, 'provisioner-registry'))
  );

const SourceDialog = ({ dialog, id, server, rows, sender, offered, on }) => {
  const entry = {
    id,
    sender,
    onClose: on.close,
    onDone: on.done,
    seed: dialog.seed || null,
    offered,
    onSwitch: on.switchSource,
    roleOptions: rows.roleOptions,
  };
  switch (dialog.kind) {
    case 'upload':
      return <UploadModal {...entry} locations={rows.locations} />;
    case 'register':
      return <RegisterModal {...entry} server={server} locations={rows.locations} />;
    case 'registry':
      return <RegistryDownloadModal {...entry} locations={rows.locations} sources={rows.sources} />;
    case 'download':
      return <DownloadModal {...entry} server={server} locations={rows.locations} />;
    case 'hcl':
      return <HclDownloadModal {...entry} server={server} />;
    default:
      return null;
  }
};

SourceDialog.propTypes = {
  dialog: PropTypes.shape({ kind: PropTypes.string.isRequired, seed: PropTypes.object }).isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  rows: PropTypes.shape({
    locations: PropTypes.array.isRequired,
    sources: PropTypes.array.isRequired,
    roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  sender: PropTypes.object.isRequired,
  offered: PropTypes.arrayOf(PropTypes.string).isRequired,
  on: PropTypes.shape({
    close: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    switchSource: PropTypes.func.isRequired,
  }).isRequired,
};

const SOURCE_KINDS = ['upload', 'register', 'registry', 'download', 'hcl'];

/**
 * The Installer files page of a host behind `artifacts`: the downloads
 * collection drawn by the one listing over the host's cache, every
 * artifact row of `GET artifacts` one file row, grouped by product, the
 * file-level columns then the product, release, patch, version, location
 * and status, the panel's product, organization, kind, location and
 * status groups, the table by default and cards as the toggle; the
 * heading counting the files shown, then Upload, Register path, From
 * BoxVault while the host lists `templates`, Download URL, HCL portal
 * while it lists `provisioner-registry`, the split Scan all,
 * `POST artifacts/scan` with `verify_checksums` false, with Scan all and
 * re-hash, the same with `verify_checksums` true, in its menu, Locations opening the
 * one modal of the storage locations, Refresh and the view toggle; Delete
 * selected the listing's bulk action behind the delete dialog; each
 * row's Details reading `GET artifacts/{id}`, Download carrying the file
 * through the client, Move to location and Copy to location a queued
 * task each, Delete behind the delete dialog, and the missing file's
 * warning glyph opening the Download URL dialog seeded with the file,
 * every other source one press away; the transfers a download or an
 * upload queues drawn above the files. Every write is one request and
 * one notice, its task followed and the files and the locations read
 * again at its end.
 */
const InstallersPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [nonce, setNonce] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const registries = hostHasFeature(server, 'templates');
  const locations = useManageRead(
    useCallback(() => fetchArtifactStoragePaths(status, id), [status, id]),
    true
  );
  const sources = useManageRead(
    useCallback(() => fetchTemplateSources(status, id), [status, id]),
    registries
  );
  const adapter = useMemo(() => hostFilesAdapter({ status, id }), [status, id]);
  const collection = useMemo(() => hostFilesCollection({ adapter }), [adapter]);
  const collections = useMemo(() => [collection], [collection]);
  const { send, busy, task, closeTask } = useManageSend(id);
  const refreshLocations = locations.refresh;
  const reread = useCallback(() => {
    setNonce(current => current + 1);
    refreshLocations();
  }, [refreshLocations]);
  const follow = useTaskFollow({ id, onEnd: reread });
  const transfers = useArtifactDownloads({ id, onRefresh: reread });
  const sender = { send, follow, busy };
  const offered = offeredOf(server);
  const locationRows = listOf(locations, 'paths');
  const prefsPrefix = `${context.prefsPrefix}_host_files`;

  const close = () => setDialog(null);

  const write = async ({ call, doneKey, values = {}, failKey }) => {
    const { answer, error } = await send({ call, doneKey, values, failKey });
    if (!error) {
      close();
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

  const openDetails = async artifact => {
    try {
      const details = await fetchArtifact(status, id, artifact.id);
      setDialog({ kind: 'details', artifact, details });
    } catch (error) {
      notify('danger', t('hosts.manage.artifacts.detailsFailed', { message: error.message }));
    }
  };

  const onAction = (action, artifact) => {
    if (action === 'details') {
      openDetails(artifact);
      return;
    }
    if (action === 'download') {
      download(artifact);
      return;
    }
    setDialog({ kind: action, artifact });
  };

  const onFetch = artifact => setDialog({ kind: 'download', seed: missingSeedOf(artifact) });

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

  const remove = filesToo =>
    write({
      call: () =>
        deleteArtifacts(status, id, {
          artifact_ids: [dialog.artifact.id],
          delete_files: filesToo,
        }),
      doneKey: 'host.installerFiles.deleteQueuedDefault',
      failKey: 'host.installerFiles.deleteFailed',
    });

  const scanAll = rehash =>
    write({
      call: () => scanArtifacts(status, id, { verify_checksums: rehash }),
      doneKey: 'host.installerFiles.scanQueuedDefault',
      failKey: 'host.installerFiles.scanFailed',
    });

  const done = (answer, info) => {
    close();
    reread();
    if (answer?.task_id && info) {
      transfers.start(answer.task_id, {
        ...info,
        storageLocation: answer.storage_location || null,
      });
    }
  };

  const listingContext = {
    ...context,
    prefsPrefix,
    files: { busy: busy || saving, onAction, onFetch },
  };

  const pane = (
    <>
      {OPENERS.filter(([kind]) => offered.includes(kind)).map(([kind, Icon, labelKey, tone]) => (
        <PaneButton
          key={kind}
          icon={Icon}
          labelKey={labelKey}
          action={`artifact-${kind}`}
          variant={`outline-${tone}`}
          onClick={() => setDialog({ kind })}
          busy={busy}
        />
      ))}
      <SplitButton
        icon={FaMagnifyingGlass}
        glyph
        labelKey="host.installerFiles.scanAll"
        action="artifact-scan"
        variant="warning"
        onClick={() => scanAll(false)}
        menuAction="artifact-scan-menu"
        menuLabelKey="host.installerFiles.scanOptions"
        items={[
          {
            action: 'artifact-scan-rehash',
            labelKey: 'host.installerFiles.scanAllRehash',
            onClick: () => scanAll(true),
          },
        ]}
        busy={busy}
      />
      <PaneButton
        icon={FaFolderOpen}
        labelKey="host.installerFiles.locations"
        action="artifact-locations"
        onClick={() => setDialog({ kind: 'locations' })}
      />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane section={section} server={server} headed={false}>
      <HeldListing
        table="installers"
        loaded
        title={sectionTitle(section, server, '', t)}
        pane={pane}
        collections={collections}
        context={listingContext}
        add={false}
        grouped={false}
        nonce={nonce}
      >
        <ArtifactTransfers
          transfers={transfers.transfers}
          ctx={{ t, language: i18n.language }}
          prefsPrefix={prefsPrefix}
          onCancel={transfers.stop}
        />
      </HeldListing>
      {dialog && SOURCE_KINDS.includes(dialog.kind) ? (
        <SourceDialog
          dialog={dialog}
          id={id}
          server={server}
          rows={{
            locations: locationRows,
            sources: rowsOf(sources),
            roleOptions: roleOptionsOf(adapter.rows().map(item => item.artifact)),
          }}
          sender={sender}
          offered={offered}
          on={{
            close,
            done,
            switchSource: kind => setDialog(current => ({ kind, seed: current?.seed || null })),
          }}
        />
      ) : null}
      {dialog?.kind === 'move' || dialog?.kind === 'copy' ? (
        <TransferModal
          kind={dialog.kind}
          artifact={dialog.artifact}
          locations={locationRows}
          busy={busy}
          onClose={close}
          onSubmit={transfer}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteArtifactsModal count={1} busy={busy} onClose={close} onSubmit={remove} />
      ) : null}
      {dialog?.kind === 'details' ? (
        <ArtifactDetailsModal
          id={id}
          artifact={dialog.artifact}
          details={dialog.details}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === 'locations' ? (
        <StorageLocationsModal
          id={id}
          server={server}
          rows={locationRows}
          loaded={locations.loaded}
          sender={sender}
          onChanged={reread}
          onClose={close}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </SectionPane>
  );
};

InstallersPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default InstallersPage;
