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
 * the record page's header pane and the vault's and the Certificates
 * page's bulk panes: `setAccess(record, patch)` sends one PUT carrying
 * the record with the access words of `patch` (`published`, `is_public`,
 * `guest_access`) and keeps the answer's words and `updated_at` on the
 * record the vault holds under the same `remote_id`, writing nothing to
 * the vault while it holds none, so a store row is never pulled by it;
 * `removeFromStore(record)` sends one DELETE and, once the store let the
 * row go, keeps the local record detached from it; `removeRow(row)`
 * sends the one DELETE of a store's wire row and, once the store let it
 * go, detaches the record the vault holds under its id, raising no
 * notice, so a bulk pane names the count once. A refusal is one danger
 * notice naming the rule and the record stays as it was; nothing raises
 * a success notice but `removeFromStore`.
 *
 * @returns {{ setAccess: Function, removeFromStore: Function, removeRow: Function }} The writes, each answering true once the store took it
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
        .then(row => {
          const held = vault.records.find(entry => entry.remote_id === record.remote_id);
          return held
            ? vault.update(
                held,
                {
                  published: Boolean(row.published),
                  is_public: Boolean(row.is_public),
                  guest_access: Boolean(row.guest_access),
                  synced_at: row.updated_at || held.synced_at,
                },
                { source: 'sync' }
              )
            : null;
        })
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

  const removeRow = useCallback(
    row =>
      removeCert(row.id)
        .then(() => {
          const held = vault.records.find(entry => entry.remote_id === row.id);
          return held ? vault.update(held, DETACHED, { source: 'sync' }) : null;
        })
        .then(() => true)
        .catch(error => refused('Certs remove refused', error)),
    [vault, refused]
  );

  return { setAccess, removeFromStore, removeRow };
};
