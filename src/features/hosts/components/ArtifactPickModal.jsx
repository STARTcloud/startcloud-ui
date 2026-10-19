import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import { drawnColumns } from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { formatFileSize } from '../../../utils/formatFileSize';
import { fetchArtifactStoragePaths } from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { useManageRead, useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { hostHasFeature } from '../utils/capabilities';
import { hostFilesOf, matchesHostFile } from '../utils/hostFiles';
import { FILE_SOURCES, kindLocationOf, roleOptionsOf } from '../utils/manageCatalog';
import { artifactRowsOf } from '../utils/roleFiles';

import { HOST_FILE_COLUMNS, HOST_FILE_FILTERS } from './HostFileColumns';
import {
  DownloadModal,
  HclDownloadModal,
  OPENERS,
  RegisterModal,
  RegistryDownloadModal,
  UploadModal,
} from './InstallerFilesModals';
import { DialogTable } from './ManageTable';
import { FilterPills, RowCards } from './PickDialogParts';
import TaskDialog from './TaskDialog';

const NO_ROWS = [];

const PICK_FILTERS = HOST_FILE_FILTERS.map(spec => ({ labelFor: value => value, ...spec }));

const rowKey = row => row.id;

const listOf = (reading, member) =>
  Array.isArray(reading.data?.[member]) ? reading.data[member] : NO_ROWS;

const PickRowActions = ({ row, busy, onPick, onFetch }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-artifact={row.id}>
      {!row.fileExists && onFetch ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="artifact-fetch"
          title={t('provisioning.provisioningRolesTab.fetchTitle')}
          aria-label={t('provisioning.provisioningRolesTab.fetchTitle')}
          disabled={busy}
          onClick={() => onFetch(row.artifact)}
        >
          <FaDownload aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="file-pick-row"
        disabled={busy}
        onClick={() => onPick(row.artifact)}
      >
        {t('provisioning.provisioningRolesTab.pickRow')}
      </button>
    </span>
  );
};

PickRowActions.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fileExists: PropTypes.bool.isRequired,
    artifact: PropTypes.object.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
};

const SourceDialog = ({ dialog, id, server, locations, sources, sender, seed, on }) => {
  const roleOptions = roleOptionsOf(on.artifacts);
  const entry = { id, sender, onClose: on.close, onDone: on.done, seed, roleOptions };
  switch (dialog) {
    case 'upload':
      return <UploadModal {...entry} locations={locations} />;
    case 'register':
      return <RegisterModal {...entry} server={server} locations={locations} />;
    case 'registry':
      return <RegistryDownloadModal {...entry} locations={locations} sources={sources} />;
    case 'download':
      return <DownloadModal {...entry} server={server} locations={locations} />;
    case 'hcl':
      return <HclDownloadModal {...entry} server={server} />;
    default:
      return null;
  }
};

SourceDialog.propTypes = {
  dialog: PropTypes.string,
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  locations: PropTypes.array.isRequired,
  sources: PropTypes.array.isRequired,
  sender: PropTypes.object.isRequired,
  seed: PropTypes.object.isRequired,
  on: PropTypes.shape({
    artifacts: PropTypes.array.isRequired,
    close: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The dialog that picks one artifact of one kind and one role, the
 * host's artifact rows whose `file_type` is the kind and whose `role` is
 * the given one drawn as the Installer files page draws them, one file
 * row each with the rows on the host first: the page's columns and
 * filter groups, a search over the rows, the table or cards view, and
 * the page's openers, Upload, Register path, From BoxVault, Download URL
 * and HCL portal, through the page's own dialogs seeded with the kind,
 * the role and the kind's storage location, each landing a row the
 * host's artifacts are read again for through `onReload`; a row's Pick
 * hands the artifact row to `onPick`, and on a missing row the download
 * glyph hands it to `onFetch`. `host` is `{ status, hostId, server }`.
 */
const ArtifactPickModal = ({
  kind,
  role,
  artifacts,
  host,
  title,
  disabled = false,
  onPick,
  onFetch = null,
  onReload = null,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { status, hostId: id, server } = host;
  const [query, setQuery] = useState('');
  const [view, setView] = useState('table');
  const [dialog, setDialog] = useState(null);
  const registries = hostHasFeature(server, 'templates');
  const locations = useManageRead(
    useCallback(() => fetchArtifactStoragePaths(status, id), [status, id]),
    true
  );
  const sources = useManageRead(
    useCallback(() => fetchTemplateSources(status, id), [status, id]),
    registries
  );
  const { send, busy, task, closeTask } = useManageSend(id);
  const reread = useCallback(() => {
    locations.refresh();
    onReload?.();
  }, [locations, onReload]);
  const follow = useTaskFollow({ id, onEnd: reread });
  const sender = { send, follow, busy };
  const rows = hostFilesOf(artifactRowsOf(artifacts, kind, role));
  const needle = query.trim().toLowerCase();
  const searched = needle ? rows.filter(row => matchesHostFile(row, needle)) : rows;
  const filters = useClientFilters({ specs: PICK_FILTERS, rows: searched });
  const ctx = { t, language: i18n.language, groupedBy: '', formatFileSize };
  const columns = drawnColumns(HOST_FILE_COLUMNS, filters.rows, ctx);
  const offered = registries ? FILE_SOURCES : FILE_SOURCES.filter(entry => entry !== 'registry');
  const locationRows = listOf(locations, 'paths');
  const seed = {
    locationId: String(kindLocationOf(locationRows, kind)?.id ?? ''),
    role,
    kind,
    filename: '',
    checksum: '',
  };
  const actionsProps = { busy: disabled || busy, onPick, onFetch };
  const emptyText = t(
    needle || filters.active ? 'pages.noMatches' : 'provisioning.provisioningRolesTab.noFileKnown'
  );
  return (
    <>
      <Modal show onHide={onClose} size="lg" scrollable>
        <div data-dialog="artifact-pick" data-kind={kind} data-pick-role={role}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {OPENERS.filter(([opener]) => offered.includes(opener)).map(
                ([opener, Icon, labelKey, tone]) => (
                  <button
                    key={opener}
                    type="button"
                    className={`btn btn-sm btn-${tone}`}
                    data-action={`artifact-${opener}`}
                    onClick={() => setDialog(opener)}
                    disabled={disabled || busy || !locations.loaded}
                  >
                    <Icon className="me-1" aria-hidden="true" />
                    {t(labelKey)}
                  </button>
                )
              )}
              <span className="ms-auto">
                <ViewToggle view={view} onChange={setView} />
              </span>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <input
                className="form-control form-control-sm w-auto"
                type="search"
                placeholder={t('provisioning.provisioningRolesTab.searchFilesPlaceholder')}
                aria-label={t('provisioning.provisioningRolesTab.searchFilesPlaceholder')}
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              <FilterPills groups={filters.groups} />
            </div>
            <div data-view={view}>
              {view === 'cards' ? (
                <RowCards
                  name="artifact-cards"
                  rows={filters.rows}
                  columns={columns}
                  rowKey={rowKey}
                  ctx={ctx}
                  RowActions={PickRowActions}
                  actionsProps={actionsProps}
                  emptyText={emptyText}
                />
              ) : (
                <DialogTable
                  name="artifact-pick"
                  columns={HOST_FILE_COLUMNS}
                  rows={filters.rows}
                  rowKey={rowKey}
                  RowActions={PickRowActions}
                  actionsProps={actionsProps}
                  ctx={ctx}
                  emptyText={emptyText}
                />
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('pages.confirm.cancel')}
            </button>
          </Modal.Footer>
        </div>
      </Modal>
      <SourceDialog
        dialog={dialog}
        id={id}
        server={server}
        locations={locationRows}
        sources={Array.isArray(sources.data) ? sources.data : NO_ROWS}
        sender={sender}
        seed={seed}
        on={{
          artifacts: Array.isArray(artifacts) ? artifacts : NO_ROWS,
          close: () => setDialog(null),
          done: () => {
            setDialog(null);
            reread();
          },
        }}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </>
  );
};

ArtifactPickModal.propTypes = {
  kind: PropTypes.oneOf(['installer', 'fixpack', 'hotfix', 'iso', 'image']).isRequired,
  role: PropTypes.string.isRequired,
  artifacts: PropTypes.array,
  host: PropTypes.shape({
    status: PropTypes.object.isRequired,
    hostId: PropTypes.string.isRequired,
    server: PropTypes.object,
  }).isRequired,
  title: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
  onReload: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default ArtifactPickModal;
