import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaPlus, FaXmark } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { PickSecretModal } from '../../certs';
import { useHostSecrets } from '../hooks/useHostSecrets';
import { pickKindsOf } from '../utils/agentSettings';
import { hostLabel, isServerRole } from '../utils/hosts';

import SecretOpeners from './SecretOpeners';
import TaskDialog from './TaskDialog';

/**
 * The host side of the Pick secret dialog: the dialog's host store as
 * `{ label, rows, loaded, failed, message, served }` over one host
 * store's reading, its label the host's own, `served` true off the
 * server role, where the host's store is the serving backend's.
 *
 * @param {Object} store - The store of `useHostSecrets`
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object|null} server - The host's registry row
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Object} The host store
 */
export const pickHostOf = (store, status, server, id) => ({
  label: server ? hostLabel(server) : status.hostname || id,
  rows: store.rows,
  loaded: store.reading.loaded,
  failed: Boolean(store.reading.failed),
  message: store.reading.message || '',
  served: !isServerRole(status),
});

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
 * Pick secret for a `secret` field or a machine's credential: the Pick
 * secret dialog over the host's store read as `GET certs?kind=` for each
 * kind the field's `kind` admits, a `certificate` field the certificate
 * and authority rows and a `key` field the key and SSH certificate rows,
 * read as the dialog opens, Add on a secret kind opening the secret
 * record form seeded with the kind and `profile` and writing
 * `POST certs`, a row picked from the Vault or the serving backend's
 * store written to the host's store the same way, under no organization,
 * and the host store's row handed to `onPick`. `host` is
 * `{ status, hostId, server }`; the dialog carries `data-kind` and
 * `data-profile`.
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
  const status = useStatus();
  const { hostId: id } = host;
  const store = useHostSecrets({ id, kind, profile });
  const busy = disabled || store.busy;
  const openers = <SecretOpeners kind={kind} profile={profile} busy={busy} onAdd={store.add} />;
  return (
    <>
      <PickSecretModal
        kinds={pickKindsOf(kind)}
        profile={profile}
        title={title}
        host={pickHostOf(store, status, host.server || null, id)}
        busy={busy}
        openers={openers}
        attributes={{ 'data-kind': kind, 'data-profile': profile }}
        onPick={onPick}
        onCopy={store.copy}
        onClose={onClose}
      />
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
