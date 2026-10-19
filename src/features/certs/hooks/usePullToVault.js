import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { DETACHED, recordOf } from '../utils/sync';

import { useVault } from './useVault';

/**
 * Pull to vault over a store's wire rows: `held` the ids of the rows the
 * vault keeps a record of under `remote_id`, and `pull(row)` writing the
 * row's record into the vault, replacing the record held for it, one
 * success notice; a pull never deletes. A `detached` pull, the rows of a
 * store the mirror does not reach, keeps each pulled record as a local
 * one with its store's members cleared.
 *
 * @param {boolean} [detached] - Whether the pulled records stand as local ones
 * @returns {{ held: Set<string>, pull: Function }} The pull
 */
export const usePullToVault = (detached = false) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const held = new Set(vault.records.map(record => record.remote_id).filter(Boolean));

  const pull = row => {
    const record = detached ? { ...recordOf(row), ...DETACHED } : recordOf(row);
    const existing = detached
      ? null
      : vault.records.find(entry => entry.remote_id === row.id) || null;
    const write = existing
      ? vault.update(existing, { ...record, id: existing.id }, { source: 'sync' })
      : vault.add(record, { source: detached ? 'local' : 'sync' });
    return write.then(() => notify('success', t('certs.notice.pulled', { name: row.name })));
  };

  return { held, pull };
};
