import { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { hostHasFeature } from '../utils/capabilities';
import { queuedTaskOf } from '../utils/machineTools';
import { NETWORKING_READS } from '../utils/monitoring';

import { HostReadingsContext } from './useHostReadings';
import { useServers } from './useServers';

const NO_NOTES = [];

const SYSTEM = 'system';

const NO_PROVIDER = { epoch: 0, hosts: {}, read: () => Promise.resolve(null) };

const watchedOf = ({ held, id, answer }) => {
  const server = held.find(row => String(row.id) === String(id)) || null;
  const row = hostHasFeature(server, 'tasks') ? queuedTaskOf(answer, SYSTEM) : null;
  return row ? { id, name: SYSTEM, row } : null;
};

const refusalOf = ({ error, failKey, values, t }) =>
  failKey
    ? t(failKey, { ...values, message: error.message || t('hosts.controls.failed') })
    : error.message || t('hosts.controls.failed');

/**
 * The hook behind every write of the networking page's management, the
 * addresses, the VNICs, the VLANs, the etherstubs, the bridges, the
 * aggregates, the network spaces, the hostname, the DNS and the hosts
 * file: `send({ id, call, doneKey, values, notes, failKey, watch, keys })`
 * sends the one request `call` makes and raises one notice, the success
 * card of `doneKey` with `values`, the sentences of `notes` after it, or
 * the danger card carrying the agent's message, inside the sentence of
 * `failKey` where one is given. After a success `reread` reads the
 * networking answers held of that host again, `keys` naming them or
 * every one the page holds. A queued answer names a task: with `watch`
 * the task dialog opens on it at once, and otherwise the notice carries
 * View task, which opens it; both only while the host's own row lists
 * `tasks`. The task's end reaches the held answers on `task-updated`,
 * which marks them stale so the sections read them again, and `closeTask`
 * reads them again as well for a host that streams nothing. `send`
 * answers `{ answer, error }`, one of them null. Nothing polls.
 *
 * @returns {{ send: Function, busy: boolean, task: Object|null, closeTask: Function, reread: Function }} The sender and its state
 */
export const useNetworkingTools = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { held } = useServers();
  const { epoch, hosts, read } = useContext(HostReadingsContext) || NO_PROVIDER;
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);

  const reread = useCallback(
    (id, keys = NETWORKING_READS) => {
      keys.filter(key => hosts[id]?.[key]).forEach(key => read(epoch, id, key));
    },
    [epoch, hosts, read]
  );

  const succeeded = useCallback(
    ({ id, answer, doneKey, values, notes, watch, keys }) => {
      const watched = watchedOf({ held, id, answer });
      const action =
        watched && !watch
          ? { label: t('hosts.tools.viewTask'), onClick: () => setTask(watched) }
          : null;
      notify(
        'success',
        [t(doneKey, values), ...notes.map(key => t(key)), answer?.note || ''].join(' ').trim(),
        { action }
      );
      reread(id, keys);
      if (watched && watch) {
        setTask(watched);
      }
    },
    [held, notify, reread, t]
  );

  const send = useCallback(
    async ({
      id,
      call,
      doneKey,
      values = {},
      notes = NO_NOTES,
      failKey = '',
      watch = false,
      keys = NETWORKING_READS,
    }) => {
      setBusy(true);
      try {
        const answer = await call();
        succeeded({ id, answer, doneKey, values, notes, watch, keys });
        return { answer, error: null };
      } catch (error) {
        notify('danger', refusalOf({ error, failKey, values, t }));
        return { answer: null, error };
      } finally {
        setBusy(false);
      }
    },
    [succeeded, notify, t]
  );

  const closeTask = useCallback(() => {
    if (task) {
      reread(task.id);
    }
    setTask(null);
  }, [task, reread]);

  return { send, busy, task, closeTask, reread };
};
