import { useCallback } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { DETACHED, rowOf } from '../../certs';
import {
  createHostCert,
  fetchHostCerts,
  removeHostCert,
  updateHostCert,
} from '../api/agentSettings';
import { pickKindsOf, secretRowsOf } from '../utils/agentSettings';
import { secretKindsOf } from '../utils/provisionerFieldDsl';

import { useManageRead, useManageSend } from './useHostManage';

const NO_ORGANIZATION = '';

const readKinds = (status, id, kinds) =>
  Promise.all(kinds.map(kind => fetchHostCerts(status, id, { kind }))).then(lists => lists.flat());

/**
 * The rows of a host's store for one `secret` field kind, `GET certs`
 * once for each kind `pickKindsOf` names, flattened; every kind of the
 * store for an empty kind.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} kind - The field's kind
 * @returns {Promise<Array<Object>>} The rows
 */
export const readSecretRows = (status, id, kind) =>
  kind ? readKinds(status, id, pickKindsOf(kind)) : fetchHostCerts(status, id);

/**
 * The rows of a host's store for every `secret` field of a configuration,
 * one read a kind, keyed by the field's kind, a failed read an empty list.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {{ fields: Array<Object> }|null} config - The configuration
 * @returns {Promise<Object<string, Array<Object>>>} The rows by kind
 */
export const readSecretRowsOf = (status, id, config) =>
  Promise.all(
    secretKindsOf(config).map(kind =>
      readSecretRows(status, id, kind).then(
        rows => [kind, rows],
        () => [kind, []]
      )
    )
  ).then(Object.fromEntries);

/**
 * The secret rows of one host's store and their writes: the rows read
 * through `GET certs`, once for each kind the field's `kind` admits,
 * narrowed to `kind` and `profile`, as the host's
 * reads are, once as the caller draws, on the stream's fresh `ready`, on
 * `reset`, on the page's Refresh and after every write; `add(record)`
 * sends `POST certs` with the record's wire row under no organization,
 * `save(row, record)` sends `PUT certs/{id}`, `remove(row)` sends
 * `DELETE certs/{id}`, and `copy(record)` sends a copy of a record of
 * the browser's vault as `POST certs` with its own store's members
 * cleared, so the copy reaches the host under no organization; each one
 * request and one notice, the rows read again on success, answering the
 * row the store answered or null.
 *
 * @param {Object} options - The host and the narrowing
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} [options.kind] - The field's kind, empty for every secret kind
 * @param {string} [options.profile] - The profile wanted, empty for every row
 * @returns {{ rows: Array<Object>, reading: Object, busy: boolean, add: Function, save: Function, remove: Function, copy: Function, task: Object|null, closeTask: Function }} The store
 */
export const useHostSecrets = ({ id, kind = '', profile = '' }) => {
  const status = useStatus();
  const reading = useManageRead(
    useCallback(() => readSecretRows(status, id, kind), [status, id, kind]),
    true
  );
  const { send, busy, task, closeTask } = useManageSend(id);

  const written = useCallback(
    async ({ call, doneKey, values, failKey }) => {
      const { answer, error } = await send({ call, doneKey, values, failKey });
      if (!error) {
        reading.refresh();
      }
      return error ? null : answer;
    },
    [send, reading]
  );

  const add = useCallback(
    record =>
      written({
        call: () => createHostCert(status, id, rowOf(record, NO_ORGANIZATION)),
        doneKey: 'agentSettings.agentSecretsTab.created',
        values: { name: record.name },
        failKey: 'agentSettings.agentSecretsTab.failedSave',
      }),
    [written, status, id]
  );

  const save = useCallback(
    (row, record) =>
      written({
        call: () => updateHostCert(status, id, row.id, rowOf(record, row.organization || '')),
        doneKey: 'agentSettings.agentSecretsTab.saved',
        values: { name: record.name },
        failKey: 'agentSettings.agentSecretsTab.failedSave',
      }),
    [written, status, id]
  );

  const remove = useCallback(
    row =>
      written({
        call: () => removeHostCert(status, id, row.id),
        doneKey: 'agentSettings.agentSecretsTab.removed',
        values: { name: row.name },
        failKey: 'agentSettings.agentSecretsTab.failedRemove',
      }),
    [written, status, id]
  );

  const copy = useCallback(record => add({ ...record, ...DETACHED }), [add]);

  return {
    rows: secretRowsOf(reading.data, kind, profile),
    reading,
    busy,
    add,
    save,
    remove,
    copy,
    task,
    closeTask,
  };
};
