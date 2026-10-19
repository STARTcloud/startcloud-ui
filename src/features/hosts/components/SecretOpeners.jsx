import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaKey, FaPlus } from 'react-icons/fa6';

import { DER_KINDS, PickSecretModal, SECRET_KINDS, SecretRecordModal } from '../../certs';
import { pickKindsOf } from '../utils/agentSettings';

const SHARED_KINDS = [...SECRET_KINDS, ...DER_KINDS.filter(kind => kind !== 'request')];

const addableKindsOf = kind =>
  kind ? pickKindsOf(kind).filter(entry => SECRET_KINDS.includes(entry)) : SECRET_KINDS;

/**
 * The openers of a host store's list, Add and Pick secret: Add, drawn
 * while `kind` names a secret kind, a group of secret kinds such as a
 * machine's `credential`, or none, opens the secret record form over the
 * secret kinds `kind` admits, the one kind fixed while it admits one
 * alone and the select open over the group otherwise, seeded with
 * `profile`, and hands `onAdd` the record; Pick secret, drawn while
 * `host` and `onPick` are given, opens the Pick secret dialog over the
 * kinds `kind` admits, every secret, key, certificate, authority and SSH
 * certificate kind for none, a row of the host's store closing it and a
 * row of any other store handed to `onPick` as its record, the write
 * that lands it in the host's store; each answers a promise, the dialog
 * closing on a row answered.
 */
const SecretOpeners = ({ kind = '', profile = '', busy, host = null, onAdd, onPick = null }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(null);
  const addable = addableKindsOf(kind);
  const settle = promise =>
    promise.then(row => {
      if (row) {
        setDialog(null);
      }
      return row;
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
      {host && onPick ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          data-action="secret-pick"
          disabled={busy}
          onClick={() => setDialog('pick')}
        >
          <FaKey className="me-1" aria-hidden="true" />
          {t('agentSettings.agentSecretsTab.pickSecret')}
        </button>
      ) : null}
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
      {dialog === 'pick' ? (
        <PickSecretModal
          kinds={kind ? pickKindsOf(kind) : SHARED_KINDS}
          profile={profile}
          title={t('agentSettings.agentSecretsTab.pickSecret')}
          host={host}
          busy={busy}
          onPick={() => setDialog(null)}
          onCopy={record => settle(onPick(record))}
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
  host: PropTypes.object,
  onAdd: PropTypes.func.isRequired,
  onPick: PropTypes.func,
};

export default SecretOpeners;
