import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { canManageRecord } from '../../../utils/permissions';
import { refusalMessage } from '../../../utils/validation';
import { createCert, fetchCerts, updateCert } from '../api/certsStore';
import * as vaultDb from '../lib/vaultDb';
import { KINDS } from '../utils/records';
import { DETACHED, newerThan, recordOf, rowOf } from '../utils/sync';

const SYNC = { source: 'sync' };

const checkedKinds = sync => KINDS.filter(kind => Boolean(sync?.[kind]));

const failed = (what, error) => log.api.error(what, { error: error.message });

const mirrored = (record, kinds, user) =>
  record.remote_id
    ? canManageRecord(user, record.organization, record)
    : kinds.includes(record.kind);

/**
 * The mirror of the vault into the shared store, run while the host
 * lists `certs-store` and a person is signed in: every vault write of a
 * record carrying a `remote_id` the person manages (`canManageRecord`),
 * or of a kind the `sync` preference checks, is sent as a PUT or a POST
 * to the organization given, or under no organization to the person's own
 * store on the host while none is given, a write on a pulled copy of another
 * creator's row staying local, one
 * request in flight per record and a write landing meanwhile sent after
 * the answer, the answer's `updated_at` kept on the record as
 * `synced_at`; a refused send is one danger notice and the record stays
 * as it was; a local remove sends nothing; the rows of the organization,
 * or of no organization while none is given, are
 * pulled on sign-in, on the stream's fresh `ready` and on `reset`, and
 * the `certs` topic's `cert-updated` is merged by `remote_id`, a newer
 * row replacing the record held, while `cert-removed` detaches the
 * record held, its local copy kept. Writes the mirror makes carry the
 * `sync` source and are never sent back.
 *
 * @param {Object} options - The session's side
 * @param {string} options.organization - The organization the rows are sent to, empty for none
 * @param {Object|null} options.user - The session's user
 * @returns {{ mirror: Function, pull: Function }} `mirror(kinds)` sends every unsent record of the kinds and pulls, answering how many sends were refused; `pull()` reads the rows of the organization, or of none
 */
export const useVaultSync = ({ organization, user }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const inflight = useRef(new Map());
  const pending = useRef(new Map());
  const kindsRef = useRef([]);
  const organizationRef = useRef(organization);
  const userRef = useRef(user);
  const sendRef = useRef(null);

  useEffect(() => {
    organizationRef.current = organization;
    userRef.current = user;
  }, [organization, user]);

  const merge = useCallback(async row => {
    const records = await vaultDb.list();
    const held = records.find(record => record.remote_id === row.id) || null;
    if (!newerThan(row, held)) {
      return;
    }
    const record = recordOf(row);
    const kept = held
      ? {
          ...record,
          id: held.id,
          origin: held.origin,
          private_der_b64: record.private_der_b64 ?? held.private_der_b64,
          secret: record.secret ?? held.secret,
        }
      : record;
    await vaultDb.put(kept, { ...SYNC, type: held ? 'updated' : 'added' });
  }, []);

  const pull = useCallback(async () => {
    const own = organizationRef.current;
    try {
      const rows = await fetchCerts(own);
      const kinds = kindsRef.current;
      await Promise.all(
        (Array.isArray(rows) ? rows : [])
          .filter(row => kinds.includes(row.kind) && (row.organization || '') === own)
          .map(merge)
      );
    } catch (error) {
      failed('Certs pull failed', error);
    }
  }, [merge]);

  const refused = useCallback(
    (what, error) => {
      failed(what, error);
      notify('danger', refusalMessage({ error, t }));
    },
    [notify, t]
  );

  const send = useCallback(
    async record => {
      const flights = inflight.current;
      if (flights.has(record.id)) {
        pending.current.set(record.id, record);
        return true;
      }
      const body = rowOf(record, organizationRef.current);
      const flight = (
        record.remote_id ? updateCert(record.remote_id, body) : createCert(body)
      ).then(row =>
        vaultDb.put(
          {
            ...record,
            remote_id: row.id,
            organization: row.organization || body.organization,
            created_by: row.created_by || record.created_by,
            synced_at: row.updated_at || record.synced_at,
          },
          { ...SYNC, type: 'updated' }
        )
      );
      flights.set(record.id, flight);
      let sent = true;
      try {
        await flight;
      } catch (error) {
        sent = false;
        refused('Certs push failed', error);
      } finally {
        flights.delete(record.id);
      }
      const next = pending.current.get(record.id);
      if (next) {
        pending.current.delete(record.id);
        return (await sendRef.current(next)) && sent;
      }
      return sent;
    },
    [refused]
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    vaultDb.readPreference('sync', {}).then(sync => {
      kindsRef.current = checkedKinds(sync);
      pull();
    });
    return vaultDb.subscribe(event => {
      if (event.type === 'preference' && event.key === 'sync') {
        kindsRef.current = checkedKinds(event.value);
        return;
      }
      if (event.source === 'sync' || !event.record || event.type === 'removed') {
        return;
      }
      if (mirrored(event.record, kindsRef.current, userRef.current)) {
        send(event.record);
      }
    });
  }, [pull, send]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      pull();
    }
  });

  useEventStream('reset', () => pull());

  useEventStream('cert-updated', row => {
    if (row && kindsRef.current.includes(row.kind)) {
      merge(row);
    }
  });

  useEventStream('cert-removed', async data => {
    const records = await vaultDb.list();
    const held = records.find(record => record.remote_id === data?.id);
    if (held) {
      await vaultDb.put({ ...held, ...DETACHED }, { ...SYNC, type: 'updated' });
    }
  });

  const mirror = useCallback(
    async kinds => {
      const records = await vaultDb.list();
      const answers = await Promise.all(
        records.filter(record => kinds.includes(record.kind) && !record.remote_id).map(send)
      );
      await pull();
      return answers.filter(sent => !sent).length;
    },
    [send, pull]
  );

  return { mirror, pull };
};
