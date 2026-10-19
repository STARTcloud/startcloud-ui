import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { createStoragePath, deleteStoragePath, updateStoragePath } from '../api/artifacts';
import { scanArtifacts } from '../api/provisioning';

import { DialogTable } from './ManageTable';
import { STORAGE_PATH_COLUMNS, StoragePathRowActions } from './StorageLocationColumns';
import StoragePathCreateModal from './StoragePathCreateModal';
import StoragePathEditModal from './StoragePathEditModal';

const rowKey = row => String(row.id);

const CLOSED = { kind: '', row: null };

/**
 * The storage locations of a host's cache in one modal, the Locations
 * press of the Installer files page: the one table over the rows of
 * `GET artifacts/storage/paths`, each row its file count and size as the
 * agent answers them, its Scan, Enable or Disable, Edit and Delete,
 * never Edit or Delete on a built-in one, and Create storage path
 * opening the one dialog that makes a location; every write one request
 * and one notice through `sender.send`, a scan's task followed through
 * `sender.follow`, a delete behind the typed confirmation sending
 * `DELETE artifacts/storage/paths/{id}` with its records removed, and
 * `onChanged` called after every write that landed so the page reads the
 * locations and the files again. `data-dialog` is `storage-locations`.
 */
const StorageLocationsModal = ({ id, server, rows, loaded, sender, onChanged, onClose }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [open, setOpen] = useState(CLOSED);
  const [confirm, setConfirm] = useState(null);
  const ctx = { t, language: i18n.language };

  const write = async ({ call, doneKey, values = {} }) => {
    const { answer, error } = await sender.send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.artifacts.failed',
    });
    if (!error) {
      setOpen(CLOSED);
      sender.follow(answer);
      onChanged();
    }
    return !error;
  };

  const onAction = (action, row) => {
    if (action === 'edit') {
      setOpen({ kind: 'edit', row });
      return;
    }
    if (action === 'delete') {
      setConfirm(row);
      return;
    }
    if (action === 'scan') {
      write({
        call: () => scanArtifacts(status, id, { storage_path_id: row.id, verify_checksums: false }),
        doneKey: 'host.installerFiles.scanOfQueued',
        values: { name: row.name },
      });
      return;
    }
    write({
      call: () => updateStoragePath(status, id, row.id, { enabled: !row.enabled }),
      doneKey: row.enabled
        ? 'hosts.manage.artifacts.pathDisabled'
        : 'hosts.manage.artifacts.pathEnabled',
      values: { name: row.name },
    });
  };

  const remove = () => {
    const row = confirm;
    setConfirm(null);
    return write({
      call: () => deleteStoragePath(status, id, row.id),
      doneKey: 'hosts.manage.artifacts.pathDeleted',
      values: { name: row.name },
    });
  };

  return (
    <>
      <Modal show onHide={onClose} size="xl" scrollable>
        <div data-dialog="storage-locations">
          <Modal.Header closeButton>
            <Modal.Title as="h5">{t('host.installerFiles.locations')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted">
              {t('artifacts.artifactManagement.storageLocationsDescription', {
                hostname: server.hostname,
              })}
            </p>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="fw-semibold">
                {t('artifacts.artifactManagement.storagePathsCount', { count: rows.length })}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-primary ms-auto"
                data-action="storage-path-create"
                disabled={sender.busy}
                onClick={() => setOpen({ kind: 'create', row: null })}
              >
                <FaPlus className="me-1" aria-hidden="true" />
                {t('artifacts.artifactManagement.createStoragePathButton')}
              </button>
            </div>
            <DialogTable
              name="storage-paths"
              columns={STORAGE_PATH_COLUMNS}
              rows={rows}
              rowKey={rowKey}
              RowActions={StoragePathRowActions}
              actionsProps={{ busy: sender.busy, onAction }}
              ctx={ctx}
              emptyText={t(
                loaded ? 'artifacts.storagePathTable.noStoragePathsFound' : 'pages.loading'
              )}
            />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('pages.confirm.cancel')}
            </button>
          </Modal.Footer>
        </div>
      </Modal>
      {open.kind === 'create' ? (
        <StoragePathCreateModal
          id={id}
          server={server}
          busy={sender.busy}
          onClose={() => setOpen(CLOSED)}
          onSubmit={body =>
            write({
              call: () => createStoragePath(status, id, body),
              doneKey: 'hosts.manage.artifacts.pathCreated',
              values: { name: body.name },
            })
          }
        />
      ) : null}
      {open.kind === 'edit' ? (
        <StoragePathEditModal
          storagePath={open.row}
          busy={sender.busy}
          onClose={() => setOpen(CLOSED)}
          onSubmit={body =>
            write({
              call: () => updateStoragePath(status, id, open.row.id, body),
              doneKey: 'hosts.manage.artifacts.pathUpdated',
              values: { name: body.name },
            })
          }
        />
      ) : null}
      <ConfirmModal
        show={confirm !== null}
        handleClose={() => setConfirm(null)}
        handleConfirm={remove}
        title={t('artifacts.artifactManagement.deleteStoragePathTitle')}
        message={t('artifacts.artifactManagement.deleteStoragePathMessage', {
          name: confirm?.name || '',
        })}
        keyword={t('hosts.manage.artifacts.deleteWord').toLowerCase()}
        confirmText={t('artifacts.artifactManagement.deleteButton')}
      />
    </>
  );
};

StorageLocationsModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  rows: PropTypes.array.isRequired,
  loaded: PropTypes.bool.isRequired,
  sender: PropTypes.shape({
    send: PropTypes.func.isRequired,
    follow: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
  onChanged: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default StorageLocationsModal;
