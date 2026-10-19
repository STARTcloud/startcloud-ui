import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPenToSquare, FaRotate, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { SecretRecordModal, recordOf } from '../../certs';
import { useHostSecrets } from '../hooks/useHostSecrets';

import SecretOpeners from './SecretOpeners';
import SecretRowsList from './SecretRowsList';
import TaskDialog from './TaskDialog';

const SecretRowActions = ({ row, busy, onEdit, onRemove }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-secret-kind={row.kind}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('agentSettings.agentSecretsTab.edit')}
        aria-label={t('agentSettings.agentSecretsTab.edit')}
        data-action="secret-edit"
        disabled={busy}
        onClick={() => onEdit(row)}
      >
        <FaPenToSquare aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('agentSettings.agentSecretsTab.remove')}
        aria-label={t('agentSettings.agentSecretsTab.remove')}
        data-action="secret-remove"
        disabled={busy}
        onClick={() => onRemove(row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

SecretRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Secrets page's body of a host, behind the host's `certs-store` token:
 * the secret rows of the host's own store, `GET certs`, over the Vault's
 * table and cards with the Kind and Profile pills and a search, Add
 * opening the secret record form and writing `POST certs`, Share from
 * Vault writing a record of the browser's vault the same way, Reload,
 * and on each row Edit, the form over the row's record writing
 * `PUT certs/{id}`, and Remove behind the typed confirmation writing
 * `DELETE certs/{id}`; every write one request and one notice, the rows
 * read again after it. The rows read once as the page draws, again when
 * the stream opens fresh or answers `reset`, on the page's Refresh and
 * on Reload.
 */
const AgentSecretsTab = ({ id, prefsKey }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const store = useHostSecrets({ id });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const openers = (
    <>
      <SecretOpeners
        busy={store.busy}
        prefsKey={`${prefsKey}_vault`}
        onAdd={store.add}
        onShare={store.share}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="secrets-reload"
        onClick={store.reading.refresh}
        disabled={store.busy}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.reloadButton')}
      </button>
    </>
  );

  return (
    <div data-panel="secrets">
      {store.reading.failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="secrets-failed">
          {t('agentSettings.agentSecretsTab.failedLoadSecrets', { message: store.reading.message })}
        </div>
      ) : null}
      <SecretRowsList
        name="secrets"
        rows={store.rows}
        loaded={store.reading.loaded}
        RowActions={SecretRowActions}
        actionsProps={{ busy: store.busy, onEdit: setEditing, onRemove: setRemoving }}
        openers={openers}
      />
      {editing ? (
        <SecretRecordModal
          record={recordOf(editing)}
          busy={store.busy}
          onSave={record =>
            store.save(editing, record).then(row => {
              if (row) {
                setEditing(null);
              }
            })
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={() => store.remove(removing)}
        title={t('agentSettings.agentSecretsTab.removeTitle')}
        message={t('agentSettings.agentSecretsTab.removeMessage', { name: removing?.name || '' })}
        confirmText={t('agentSettings.agentSecretsTab.remove')}
      />
      {store.task ? (
        <TaskDialog status={status} id={id} task={store.task.row} onHide={store.closeTask} />
      ) : null}
    </div>
  );
};

AgentSecretsTab.propTypes = {
  id: PropTypes.string.isRequired,
  prefsKey: PropTypes.string.isRequired,
};

export default AgentSecretsTab;
