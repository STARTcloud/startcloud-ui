import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaVault } from 'react-icons/fa6';

import { DER_KINDS, SECRET_KINDS, SecretRecordModal, VaultPickModal } from '../../certs';
import { pickKindsOf } from '../utils/agentSettings';

const SHARED_KINDS = [...SECRET_KINDS, ...DER_KINDS.filter(kind => kind !== 'request')];

const addableKindsOf = kind =>
  kind ? pickKindsOf(kind).filter(entry => SECRET_KINDS.includes(entry)) : SECRET_KINDS;

/**
 * The two openers of a host store's secret list, Add and Copy from
 * Vault: Add, drawn while `kind` names a secret kind, a group of secret
 * kinds such as a machine's `credential`, or none, opens the secret
 * record form over the secret kinds `kind` admits, the one kind fixed
 * while it admits one alone and the select open over the group
 * otherwise, seeded with `profile`, and hands `onAdd` the record; Copy
 * from Vault opens the pick over the browser's vault records of the
 * kinds `kind` admits, every secret, key, certificate, authority and SSH
 * certificate kind for none, and hands `onCopy` the record picked; each
 * answers a promise, the dialog closing on a row answered.
 */
const SecretOpeners = ({ kind = '', profile = '', busy, prefsKey, onAdd, onCopy }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(null);
  const addable = addableKindsOf(kind);
  const settle = promise =>
    promise.then(row => {
      if (row) {
        setDialog(null);
      }
    });
  return (
    <>
      {addable.length > 0 ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="secret-add"
          disabled={busy}
          onClick={() => setDialog('add')}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('agentSettings.agentSecretsTab.addButton')}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        data-action="secret-copy-from-vault"
        disabled={busy}
        onClick={() => setDialog('vault')}
      >
        <FaVault className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.copyFromVault')}
      </button>
      {dialog === 'add' ? (
        <SecretRecordModal
          kind={addable.length === 1 ? addable[0] : ''}
          kinds={addable}
          profile={profile}
          busy={busy}
          onSave={record => settle(onAdd(record))}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'vault' ? (
        <VaultPickModal
          kinds={kind ? pickKindsOf(kind) : SHARED_KINDS}
          title={t('agentSettings.agentSecretsTab.copyFromVault')}
          prefsKey={prefsKey}
          busy={busy}
          onPick={record => settle(onCopy(record))}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
};

SecretOpeners.propTypes = {
  kind: PropTypes.string,
  profile: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  prefsKey: PropTypes.string.isRequired,
  onAdd: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

export default SecretOpeners;
