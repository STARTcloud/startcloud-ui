import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { hostHasFeature } from '../utils/capabilities';
import { agentIdOf } from '../utils/hosts';
import { queuedTaskOf } from '../utils/machineTools';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

import { useHostRow } from './useHostRow';

/**
 * The hook behind every write of the ZFS management, the pools, the
 * datasets and the snapshots of datasets: `send({ call, doneKey, values,
 * failKey })` sends the one request `call` makes and raises one notice,
 * the success card of `doneKey` with `values`, or the danger card
 * carrying the agent's message, inside the sentence of `failKey` where
 * one is given; `send` answers `{ answer, error }`, one of them null, so
 * a dialog closes on a success and stays open on a refusal. Every write
 * on this surface is a queued task: on a host whose own row lists
 * `tasks` the notice carries View task, which opens the task dialog on
 * it, `task` and `closeTask` its state; and the id is watched, so when
 * the `tasks` topic says the task ended `onSettled` is called, the read
 * of the pools or the datasets the caller asks for then, the way
 * hyperweaver-ui read them two seconds after the write, a wait not
 * carried over; `watch(answer)` watches the task of an answer a caller
 * sent itself. `busy` is true while a request is in flight.
 *
 * @param {Object} options - The host and the reader
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Function} options.onSettled - Called when a task this hook queued ended
 * @returns {{ send: Function, watch: Function, busy: boolean, task: Object|null, closeTask: Function }} The sender and its state
 */
export const useZfsTools = ({ id, onSettled }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const server = useHostRow(id);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);
  const queued = useRef(null);

  useEventStream('task-updated', data => {
    const key = String(data?.id);
    if (
      agentIdOf(data) === String(id) &&
      queued.current?.has(key) &&
      TERMINAL_TASK_STATUSES.includes(data?.status)
    ) {
      queued.current.delete(key);
      onSettled();
    }
  });

  const watch = useCallback(
    answer => {
      const row = hostHasFeature(server, 'tasks') ? queuedTaskOf(answer, '') : null;
      if (row) {
        queued.current ||= new Set();
        queued.current.add(row.id);
      }
      return row;
    },
    [server]
  );

  const send = useCallback(
    async ({ call, doneKey, values = {}, failKey = '' }) => {
      setBusy(true);
      try {
        const answer = await call();
        const row = watch(answer);
        notify('success', t(doneKey, values), {
          action: row ? { label: t('hosts.tools.viewTask'), onClick: () => setTask(row) } : null,
        });
        return { answer, error: null };
      } catch (error) {
        const message = error.message || t('hosts.controls.failed');
        notify('danger', failKey ? t(failKey, { ...values, message }) : message);
        return { answer: null, error };
      } finally {
        setBusy(false);
      }
    },
    [watch, notify, t]
  );

  const closeTask = useCallback(() => {
    setTask(null);
    onSettled();
  }, [onSettled]);

  return { send, watch, busy, task, closeTask };
};
