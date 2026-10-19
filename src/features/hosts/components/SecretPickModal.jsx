import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaPlus, FaXmark } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { useHostSecrets } from '../hooks/useHostSecrets';

import SecretOpeners from './SecretOpeners';
import SecretRowsList from './SecretRowsList';
import TaskDialog from './TaskDialog';

const PickActions = ({ row, busy, onPick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="secret-pick-row"
      data-secret-kind={row.kind}
      disabled={busy}
      onClick={() => onPick(row)}
    >
      {t('provisioning.provisioningRolesTab.pickRow')}
    </button>
  );
};

PickActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * One picked secret as a row, the shape of the artifact pick row: the
 * kind's label, the picked row's name as code, the change glyph and the
 * clear glyph, or while nothing is picked one `+ <label>…` button; `onOpen`
 * opens the pick dialog, `onClear` drops the pick, `attributes` are the
 * data attributes the row carries, and `data-pick-state` reads `picked`
 * or `none`.
 */
export const SecretPickRow = ({ label, picked, disabled = false, onOpen, onClear, attributes }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-file-picker" {...attributes}>
      <span className="hw-file-kind">{label}</span>
      {picked ? (
        <div className="d-flex align-items-center gap-2 flex-wrap" data-pick-state="picked">
          <code className="small">{picked.name || picked.id}</code>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            data-action="secret-pick"
            title={t('provisioning.provisionerFieldDsl.secretChange')}
            aria-label={t('provisioning.provisionerFieldDsl.secretChange')}
            disabled={disabled}
            onClick={onOpen}
          >
            <FaArrowsRotate aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            data-action="secret-clear"
            title={t('provisioning.provisionerFieldDsl.secretClear')}
            aria-label={t('provisioning.provisionerFieldDsl.secretClear')}
            disabled={disabled}
            onClick={onClear}
          >
            <FaXmark aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0"
          data-action="secret-pick"
          data-pick-state="none"
          disabled={disabled}
          onClick={onOpen}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('provisioning.provisionerFieldDsl.secretPick', { kind: label })}
        </button>
      )}
    </div>
  );
};

SecretPickRow.propTypes = {
  label: PropTypes.string.isRequired,
  picked: PropTypes.object,
  disabled: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  attributes: PropTypes.object.isRequired,
};

/**
 * The dialog that picks one row of a host's store for a `secret` field:
 * the Vault's table over the rows `GET certs?kind=` answers for each kind
 * the field's `kind` admits, a `certificate` field the certificate and
 * authority rows and a `key` field the key and SSH certificate rows,
 * read as the dialog opens, with the search, the pills and the cards
 * toggle, Add on a secret kind opening the secret record form seeded
 * with the kind and `profile` and writing `POST certs`, Share from Vault
 * writing a browser record of the admitted kinds the same way, each
 * landing a row the store is read again for, and Pick on a row handing
 * it to `onPick`. `host` is `{ status, hostId }`; `data-dialog` is
 * `secret-pick`.
 */
const SecretPickModal = ({
  kind,
  profile = '',
  host,
  title,
  disabled = false,
  onPick,
  onClose,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { hostId: id } = host;
  const store = useHostSecrets({ id, kind, profile });
  const busy = disabled || store.busy;
  const openers = (
    <SecretOpeners
      kind={kind}
      profile={profile}
      busy={busy}
      prefsKey="table_prefs_secret_pick_vault"
      onAdd={store.add}
      onShare={store.share}
    />
  );
  return (
    <>
      <Modal show onHide={onClose} size="lg" scrollable>
        <div data-dialog="secret-pick" data-kind={kind} data-profile={profile}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {store.reading.failed ? (
              <div className="alert alert-danger py-2" role="alert" data-note="secrets-failed">
                {t('agentSettings.agentSecretsTab.failedLoadSecrets', {
                  message: store.reading.message,
                })}
              </div>
            ) : null}
            <SecretRowsList
              name="secret-pick"
              rows={store.rows}
              loaded={store.reading.loaded}
              RowActions={PickActions}
              actionsProps={{ busy, onPick }}
              openers={openers}
            />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('pages.confirm.cancel')}
            </button>
          </Modal.Footer>
        </div>
      </Modal>
      {store.task ? (
        <TaskDialog status={status} id={id} task={store.task.row} onHide={store.closeTask} />
      ) : null}
    </>
  );
};

SecretPickModal.propTypes = {
  kind: PropTypes.string.isRequired,
  profile: PropTypes.string,
  host: PropTypes.shape({
    status: PropTypes.object.isRequired,
    hostId: PropTypes.string.isRequired,
    server: PropTypes.object,
  }).isRequired,
  title: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SecretPickModal;
