import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { hasFeatureStrict } from '../../../utils/capabilities';
import SecretRowsList from '../../hosts/components/SecretRowsList';
import { useSharedRows } from '../hooks/useSharedRows';
import { useVault } from '../hooks/useVault';
import { nameOf } from '../utils/records';
import { recordOf } from '../utils/sync';

const HOST = 'host';

const BACKEND = 'backend';

const VAULT = 'vault';

const admitted = (kinds, profile) => row => {
  if (!row || !kinds.includes(row.kind)) {
    return false;
  }
  const own = row.profile || row.record?.profile || '';
  return !profile || !own || own === profile;
};

const vaultRowOf = record => ({
  id: record.id,
  kind: record.kind,
  name: nameOf(record),
  profile: record.profile || '',
  created_by: record.created_by || '',
  updated_at: record.updated_at,
  record,
});

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
      {t('certs.vault.pickRow')}
    </button>
  );
};

PickActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * Pick secret, the one dialog every secret is chosen through: a store
 * select at its top over the host's store, the serving backend's store
 * while the host is not the serving backend and the backend lists
 * `certs-store` for a signed-in person, and this browser's Vault while
 * the backend lists `certs`; the
 * rows of the chosen store of the `kinds` given and, where `profile` is
 * given, of that profile or none, with the dialog's own search, the Kind
 * and Profile pills, the table or cards toggle and Pick on a row. A row
 * of the host's store is handed to `onPick` as it is; a row of any other
 * store is handed to `onCopy(record)` first, the write that lands it in
 * the host's store, and the row that write answers is handed to
 * `onPick`. `host` is `{ label, rows, loaded, failed, message, served }`,
 * `served` true while the host's store is the serving backend's;
 * `openers` draw before the toggle; `attributes` are the data attributes
 * the dialog carries beside `data-dialog="pick-secret"`.
 */
const PickSecretModal = ({
  kinds,
  profile = '',
  title,
  host,
  busy = false,
  openers = null,
  attributes = {},
  onPick,
  onCopy,
  onClose,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const vault = useVault();
  const listed = !host.served && vault.stored && vault.signedIn;
  const shared = useSharedRows(vault.organizations, listed);
  const [storeKey, setStoreKey] = useState(HOST);
  const admit = admitted(kinds, profile);
  const stores = [
    { key: HOST, label: host.label, rows: host.rows, loaded: host.loaded },
    ...(listed
      ? [
          {
            key: BACKEND,
            label: status.brand?.name || BACKEND,
            rows: shared.rows.filter(admit),
            loaded: shared.loaded,
          },
        ]
      : []),
    ...(hasFeatureStrict(status, 'certs')
      ? [
          {
            key: VAULT,
            label: t('certs.sidebar.vault'),
            rows: vault.records.filter(admit).map(vaultRowOf),
            loaded: vault.loaded,
          },
        ]
      : []),
  ];
  const store = stores.find(entry => entry.key === storeKey) || stores[0];

  const pick = row => {
    if (store.key === HOST) {
      return onPick(row);
    }
    const record = store.key === VAULT ? row.record : recordOf(row);
    return Promise.resolve(onCopy(record)).then(written => {
      if (written) {
        onPick(written);
      }
    });
  };

  return (
    <Modal show onHide={onClose} size="lg" scrollable>
      <div data-dialog="pick-secret" data-store={store.key} {...attributes}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label" htmlFor="pick-secret-store">
              {t('certs.pick.store')}
            </label>
            <select
              id="pick-secret-store"
              className="form-select w-auto"
              value={store.key}
              onChange={event => setStoreKey(event.target.value)}
            >
              {stores.map(entry => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          {store.key === HOST && host.failed ? (
            <div className="alert alert-danger py-2" role="alert" data-note="secrets-failed">
              {t('agentSettings.agentSecretsTab.failedLoadSecrets', { message: host.message })}
            </div>
          ) : null}
          <SecretRowsList
            key={store.key}
            name="secret-pick"
            rows={store.rows}
            loaded={store.loaded}
            RowActions={PickActions}
            actionsProps={{ busy, onPick: pick }}
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
  );
};

PickSecretModal.propTypes = {
  kinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  profile: PropTypes.string,
  title: PropTypes.string.isRequired,
  host: PropTypes.shape({
    label: PropTypes.string.isRequired,
    rows: PropTypes.array.isRequired,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool,
    message: PropTypes.string,
    served: PropTypes.bool.isRequired,
  }).isRequired,
  busy: PropTypes.bool,
  openers: PropTypes.node,
  attributes: PropTypes.object,
  onPick: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PickSecretModal;
