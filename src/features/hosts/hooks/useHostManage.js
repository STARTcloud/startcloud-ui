import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { agentIdOf, withoutAgentId } from '../utils/hosts';
import { hostStreamsTasks, queuedTaskOf } from '../utils/machineTools';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

import { useHostRow } from './useHostRow';

const EMPTY = { data: null, loaded: false, failed: false, message: '' };

/**
 * The number of times the Manage page's Refresh was pressed, provided
 * by the page so every read under it, the page's own and each
 * section's, asks again on the one press.
 */
export const ManageRefreshContext = createContext(0);

/**
 * One read of the Manage page held in the section that draws it: asked
 * for once while `offered`, again whenever `read` changes, the page's
 * request filters among its closure, again when the event stream opens
 * fresh or answers `reset`, on the page's Refresh through
 * `ManageRefreshContext`, and on `refresh`, the read a section asks
 * for after a write's answer; never on a clock. `message` is the
 * agent's own word for a read that failed. A section the host does not
 * offer asks for nothing and holds nothing.
 *
 * @param {Function} read - The request, answering a promise of the data
 * @param {boolean} offered - Whether the host offers the read
 * @returns {{ data: *, loaded: boolean, failed: boolean, message: string, refresh: Function }} The read
 */
export const useManageRead = (read, offered) => {
  const [state, setState] = useState(EMPTY);
  const readRef = useRef(read);
  const turn = useRef(0);
  const presses = useContext(ManageRefreshContext);

  const ask = useCallback(() => {
    if (!offered) {
      return;
    }
    turn.current += 1;
    const own = turn.current;
    readRef
      .current()
      .then(data => {
        if (own === turn.current) {
          setState({ data, loaded: true, failed: false, message: '' });
        }
      })
      .catch(error => {
        log.api.error('Manage read failed', { error: error.message });
        if (own === turn.current) {
          setState(previous => ({
            data: previous.data,
            loaded: true,
            failed: true,
            message: error.message || '',
          }));
        }
      });
  }, [offered]);

  useEffect(() => {
    readRef.current = read;
    ask();
  }, [read, ask, presses]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      ask();
    }
  });

  useEventStream('reset', () => ask());

  return { ...state, refresh: ask };
};

const refusalOf = ({ error, failKey, values, t }) =>
  failKey
    ? t(failKey, { ...values, message: error.message || t('hosts.controls.failed') })
    : error.message || t('hosts.controls.failed');

/**
 * The sender behind every write of the Manage page: `send({ call,
 * doneKey, values, failKey })` sends the one request `call` makes and
 * raises one notice, the success card of `doneKey` with `values`, or
 * the danger card carrying the agent's message inside the sentence of
 * `failKey` where one is given. An answer that names a task carries
 * View task on the card, which opens the task dialog, while the host's
 * own row lists `tasks`; `task` is what the dialog is open on and
 * `closeTask` closes it. `send` answers `{ answer, error }`, one of them
 * null, so a section reads again on a success and a dialog draws what a
 * refusal carries. Nothing polls after a write.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ send: Function, busy: boolean, task: Object|null, closeTask: Function }} The sender
 */
export const useManageSend = id => {
  const { t } = useTranslation();
  const notify = useNotify();
  const server = useHostRow(id);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);
  const listsTasks = Array.isArray(server?.capabilities?.features)
    ? server.capabilities.features.includes('tasks')
    : false;

  const send = useCallback(
    async ({ call, doneKey, values = {}, failKey = '' }) => {
      setBusy(true);
      try {
        const answer = await call();
        const row = listsTasks ? queuedTaskOf(answer, '') : null;
        const action = row
          ? { label: t('hosts.tools.viewTask'), onClick: () => setTask({ id, row }) }
          : null;
        notify('success', t(doneKey, values), { action });
        return { answer, error: null };
      } catch (error) {
        notify('danger', refusalOf({ error, failKey, values, t }));
        return { answer: null, error };
      } finally {
        setBusy(false);
      }
    },
    [id, listsTasks, notify, t]
  );

  const closeTask = useCallback(() => setTask(null), []);

  return { send, busy, task, closeTask };
};

/**
 * The end of the tasks a section queued, followed on the `tasks` topic:
 * `follow(answer)` remembers the task a queued answer names, and when
 * `task-updated` pushes that task's row of this host in a terminal
 * status `onEnd(row)` is called once and the task forgotten, the way
 * hyperweaver-ui polled `GET tasks/{id}` after a user, group or role
 * write. On a host whose tasks do not reach the stream nothing is
 * followed, the notice's View task standing in.
 *
 * @param {Object} options - The host and what runs at a task's end
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Function} options.onEnd - Called with the task's row
 * @returns {Function} `follow(answer)`
 */
export const useTaskFollow = ({ id, onEnd }) => {
  const status = useStatus();
  const server = useHostRow(id);
  const followed = useRef(new Set());
  const onEndRef = useRef(onEnd);
  const streams = hostStreamsTasks(status, server);

  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEventStream('task-updated', data => {
    if (agentIdOf(data) !== String(id)) {
      return;
    }
    const row = withoutAgentId(data);
    const key = String(row.id);
    if (followed.current.has(key) && TERMINAL_TASK_STATUSES.includes(row.status)) {
      followed.current.delete(key);
      onEndRef.current(row);
    }
  });

  return useCallback(
    answer => {
      const row = queuedTaskOf(answer, '');
      if (streams && row) {
        followed.current.add(row.id);
      }
    },
    [streams]
  );
};
