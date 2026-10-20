import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { DETACHED, recordOf } from '../utils/sync';

import { useVault } from './useVault';

/**
 * Pull to vault over a store's wire rows: `held` the ids of the rows the
 * vault keeps a record of under `remote_id`, `pull(row)` writing the
 * row's record into the vault, replacing the record held for it, one
 * success notice, and `pullMany(rows)` the same write for every row and
 * one success notice naming the count; a pull never deletes. A
 * `detached` pull, the rows of a store the mirror does not reach, keeps
 * each pulled record as a local one with its store's members cleared.
 *
 * @param {boolean} [detached] - Whether the pulled records stand as local ones
 * @returns {{ held: Set<string>, pull: Function, pullMany: Function }} The pull
 */
export const usePullToVault = (detached = false) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const held = new Set(vault.records.map(record => record.remote_id).filter(Boolean));

  const keep = row => {
    const record = detached ? { ...recordOf(row), ...DETACHED } : recordOf(row);
    const existing = detached
      ? null
      : vault.records.find(entry => entry.remote_id === row.id) || null;
    return existing
      ? vault.update(existing, { ...record, id: existing.id }, { source: 'sync' })
      : vault.add(record, { source: detached ? 'local' : 'sync' });
  };

  const pull = row =>
    keep(row).then(() => notify('success', t('certs.notice.pulled', { name: row.name })));

  const pullMany = rows =>
    Promise.all(rows.map(keep)).then(() =>
      notify('success', t('certs.shared.pulledMany', { count: rows.length }))
    );

  return { held, pull, pullMany };
};
