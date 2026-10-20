import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import { SECRET_KINDS, SecretRecordModal } from '../../certs';
import { pickKindsOf } from '../utils/agentSettings';

const addableKindsOf = kind =>
  kind ? pickKindsOf(kind).filter(entry => SECRET_KINDS.includes(entry)) : SECRET_KINDS;

/**
 * The opener of a host store's list, Add: drawn while `kind` names a
 * secret kind, a group of secret kinds such as a machine's `credential`,
 * or none, it opens the secret record form over the secret kinds `kind`
 * admits, the one kind fixed while it admits one alone and the select
 * open over the group otherwise, seeded with `profile`, and hands `onAdd`
 * the record, the form closing once the promise `onAdd` answers holds a
 * row.
 */
const SecretOpeners = ({ kind = '', profile = '', busy, onAdd }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const addable = addableKindsOf(kind);
  if (addable.length === 0) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="secret-add"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.addButton')}
      </button>
      {open ? (
        <SecretRecordModal
          kind={addable.length === 1 ? addable[0] : ''}
          kinds={addable}
          profile={profile}
          busy={busy}
          onSave={record =>
            onAdd(record).then(row => {
              if (row) {
                setOpen(false);
              }
              return row;
            })
          }
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};

SecretOpeners.propTypes = {
  kind: PropTypes.string,
  profile: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default SecretOpeners;
