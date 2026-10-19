import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaVault } from 'react-icons/fa6';

import { DER_KINDS, SECRET_KINDS, SecretRecordModal, VaultPickModal } from '../../certs';
import { pickKindsOf } from '../utils/agentSettings';

const SHARED_KINDS = [...SECRET_KINDS, ...DER_KINDS.filter(kind => kind !== 'request')];

/**
 * The two openers of a host store's secret list, Add and Share from
 * Vault: Add, drawn while `kind` is a secret kind or none, opens the
 * secret record form on `kind` and `profile` and hands `onAdd` the
 * record; Share from Vault opens the pick over the browser's vault
 * records of the kinds `kind` admits, every secret, key, certificate,
 * authority and SSH certificate kind for none, and hands `onShare` the
 * record picked; each answers a promise, the dialog closing on a row
 * answered.
 */
const SecretOpeners = ({ kind = '', profile = '', busy, prefsKey, onAdd, onShare }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(null);
  const settle = promise =>
    promise.then(row => {
      if (row) {
        setDialog(null);
      }
    });
  return (
    <>
      {!kind || SECRET_KINDS.includes(kind) ? (
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
        data-action="secret-share-from-vault"
        disabled={busy}
        onClick={() => setDialog('vault')}
      >
        <FaVault className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.shareFromVault')}
      </button>
      {dialog === 'add' ? (
        <SecretRecordModal
          kind={kind}
          profile={profile}
          busy={busy}
          onSave={record => settle(onAdd(record))}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'vault' ? (
        <VaultPickModal
          kinds={kind ? pickKindsOf(kind) : SHARED_KINDS}
          title={t('agentSettings.agentSecretsTab.shareFromVault')}
          prefsKey={prefsKey}
          busy={busy}
          onPick={record => settle(onShare(record))}
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
  onShare: PropTypes.func.isRequired,
};

export default SecretOpeners;
