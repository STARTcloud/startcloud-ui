import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { ACCESS_LABELS } from '../../../utils/forms';
import { refusalMessage } from '../../../utils/validation';
import { removeCert, updateCert } from '../api/certsStore';
import { DETACHED, rowOf } from '../utils/sync';

import { useVault } from './useVault';

/**
 * The writes a synced record sends the shared store from a row's menu,
 * the record page's header pane and the vault's bulk pane:
 * `setAccess(record, patch)` sends one PUT carrying the record with the
 * access words of `patch` (`published`, `is_public`, `guest_access`) and
 * keeps the answer's words and `updated_at` on the record;
 * `removeFromStore(record)` sends one DELETE and, once the store let the
 * row go, keeps the local record detached from it. A refusal is one
 * danger notice naming the rule and the record stays as it was; nothing
 * raises a success notice but the removal.
 *
 * @returns {{ setAccess: Function, removeFromStore: Function }} The writes
 */
export const useStoreWrites = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();

  const refused = useCallback(
    (what, error) => {
      log.api.error(what, { error: error.message });
      notify('danger', refusalMessage({ error, labels: ACCESS_LABELS, t }));
      return false;
    },
    [notify, t]
  );

  const setAccess = useCallback(
    (record, patch) => {
      const next = { ...record, ...patch };
      return updateCert(record.remote_id, rowOf(next, record.organization))
        .then(row =>
          vault.update(
            record,
            {
              published: Boolean(row.published),
              is_public: Boolean(row.is_public),
              guest_access: Boolean(row.guest_access),
              synced_at: row.updated_at || record.synced_at,
            },
            { source: 'sync' }
          )
        )
        .then(() => true)
        .catch(error => refused('Certs access write refused', error));
    },
    [vault, refused]
  );

  const removeFromStore = useCallback(
    record =>
      removeCert(record.remote_id)
        .then(() => vault.update(record, DETACHED, { source: 'sync' }))
        .then(() => {
          notify('success', t('certs.notice.removedFrom', { organization: record.organization }));
          return true;
        })
        .catch(error => refused('Certs remove refused', error)),
    [vault, notify, refused, t]
  );

  return { setAccess, removeFromStore };
};
