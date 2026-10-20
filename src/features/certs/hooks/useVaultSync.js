import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { canManageRecord } from '../../../utils/permissions';
import { refusalMessage } from '../../../utils/validation';
import * as vaultDb from '../lib/vaultDb';
import { BACKEND_DESTINATION } from '../utils/destinations';
import { KINDS } from '../utils/records';
import { VAULT } from '../utils/stores';
import { newerThan, rowOf } from '../utils/sync';

const SYNC = { source: 'sync' };

const NO_KINDS = [];

const NO_RUNS = {};

/**
 * Whether the `sync` preference has the mirror to a destination on: on
 * unless the person turned it off, so a person who never chose syncs.
 *
 * @param {Object|null} sync - The `sync` preference, `{ [destination]: boolean }`
 * @param {string} destination - The destination's key, the backend's role name or `idp`
 * @returns {boolean} True while the mirror runs to the destination
 */
export const syncsTo = (sync, destination) => sync?.[destination] !== false;

const checkedKinds = (sync, destination) => (syncsTo(sync, destination) ? KINDS : NO_KINDS);

const failed = (what, error) => log.api.error(what, { error: error.message });

const mirrored = ({ record, kinds, user, destination, api }) => {
  const own = record.sync?.[destination];
  if (own === false) {
    return false;
  }
  if (api.idOf(record)) {
    return canManageRecord(user, record.organization, record);
  }
  return own === true || kinds.includes(record.kind);
};

const pulled = (row, kinds, own) =>
  kinds.includes(row.kind) &&
  (row.organization || '') === own &&
  row.record?.sync?.[VAULT] !== false;

const keepRun = async destination => {
  const runs = await vaultDb.readPreference('last_synced', NO_RUNS);
  const held = runs && typeof runs === 'object' ? runs : NO_RUNS;
  await vaultDb.writePreference('last_synced', {
    ...held,
    [destination]: new Date().toISOString(),
  });
};

/**
 * The mirror of the vault into one destination's store, run while that
 * destination lists `certs-store` and a person is signed in, the
 * destination's calls and its link of a record to its row given as
 * `api`: every vault write of a record whose own `sync` map does not
 * turn the destination off, linked to a row the person manages
 * (`canManageRecord`), or of any kind while its own map or else the
 * `sync` preference has the destination on, the destination's key
 * keying both and an absent key reading on, is sent as a PUT or a POST
 * to the organization given, or under no organization to the person's
 * own store while none is given, a write on a pulled copy of another
 * creator's row staying local, one request in flight per record and a
 * write landing meanwhile sent after the answer, the record linked to the
 * answered row; a refused send is one danger notice and the record stays
 * as it was; a local remove sends nothing; the rows of the organization,
 * or of no organization while none is given, are pulled on sign-in, on
 * the stream's fresh `ready` and on `reset`, a row whose record's `sync`
 * map turns the Vault off left where it is, each completed pull kept
 * under the destination's key in the `last_synced` preference; while
 * `streamed`, the `certs` topic's `cert-updated` is merged by the link, a
 * newer row replacing the record held, while `cert-removed` unlinks the
 * record held, its local copy kept. Writes the mirror makes carry the
 * `sync` source and are never sent back.
 *
 * @param {Object} options - The session's side
 * @param {string} options.organization - The organization the rows are sent to, empty for none
 * @param {Object|null} options.user - The session's user
 * @param {string} options.destination - The destination's key, the key of its `sync` switch
 * @param {Object} [options.api] - The destination's calls and link, `BACKEND_DESTINATION` by default
 * @param {boolean} [options.streamed] - Whether the destination's events reach the page's stream
 * @returns {{ mirror: Function, pull: Function }} `mirror(kinds)` sends every unsent record of the kinds and pulls, answering how many sends were refused; `pull()` reads the rows of the organization, or of none
 */
export const useVaultSync = ({
  organization,
  user,
  destination,
  api = BACKEND_DESTINATION,
  streamed = true,
}) => {
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

  const merge = useCallback(
    async row => {
      const records = await vaultDb.list();
      const held = records.find(record => api.idOf(record) === row.id) || null;
      if (!newerThan(row, held)) {
        return;
      }
      await vaultDb.put(api.merged(row, held), { ...SYNC, type: held ? 'updated' : 'added' });
    },
    [api]
  );

  const pull = useCallback(async () => {
    const own = organizationRef.current;
    try {
      const rows = await api.fetch(own);
      const kinds = kindsRef.current;
      await Promise.all(
        (Array.isArray(rows) ? rows : []).filter(row => pulled(row, kinds, own)).map(merge)
      );
      await keepRun(destination);
    } catch (error) {
      failed('Certs pull failed', error);
    }
  }, [api, merge, destination]);

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
      const linked = api.idOf(record);
      const flight = (linked ? api.update(linked, body) : api.create(body)).then(async row => {
        const current = (await vaultDb.get(record.id)) || record;
        return vaultDb.put(api.link(current, row, body.organization), {
          ...SYNC,
          type: 'updated',
        });
      });
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
    [api, refused]
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    vaultDb.readPreference('sync', {}).then(sync => {
      kindsRef.current = checkedKinds(sync, destination);
      pull();
    });
    return vaultDb.subscribe(event => {
      if (event.type === 'preference' && event.key === 'sync') {
        kindsRef.current = checkedKinds(event.value, destination);
        return;
      }
      if (event.source === 'sync' || !event.record || event.type === 'removed') {
        return;
      }
      if (
        mirrored({
          record: event.record,
          kinds: kindsRef.current,
          user: userRef.current,
          destination,
          api,
        })
      ) {
        send(event.record);
      }
    });
  }, [pull, send, destination, api]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      pull();
    }
  });

  useEventStream('reset', () => pull());

  useEventStream('cert-updated', row => {
    if (streamed && row && kindsRef.current.includes(row.kind)) {
      merge(row);
    }
  });

  useEventStream('cert-removed', async data => {
    if (!streamed) {
      return;
    }
    const records = await vaultDb.list();
    const held = records.find(record => api.idOf(record) === data?.id);
    if (held) {
      await vaultDb.put({ ...held, ...api.unlink }, { ...SYNC, type: 'updated' });
    }
  });

  const mirror = useCallback(
    async kinds => {
      const records = await vaultDb.list();
      const answers = await Promise.all(
        records.filter(record => kinds.includes(record.kind) && !api.idOf(record)).map(send)
      );
      await pull();
      return answers.filter(sent => !sent).length;
    },
    [api, send, pull]
  );

  return { mirror, pull };
};
