import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { hostHasFeature } from '../utils/capabilities';
import { queuedTaskOf, resourceIssuesOf, resourceWarningsOf } from '../utils/machineTools';

import { useHostMachinesRefresh } from './useHostMachines';
import { useHostStatsRefresh } from './useHostStats';
import { useMachineDetailRefresh } from './useMachineDetail';
import { useMachineSnapshotsRefresh } from './useMachineSnapshots';
import { useServers } from './useServers';

const NO_NOTES = [];

const watchedOf = ({ held, id, name, answer }) => {
  const server = held.find(row => String(row.id) === String(id)) || null;
  const row = hostHasFeature(server, 'tasks') ? queuedTaskOf(answer, name) : null;
  return row ? { id, name, row } : null;
};

const refusalOf = ({ error, failKey, values, t }) =>
  failKey
    ? t(failKey, { ...values, message: error.message || t('hosts.controls.failed') })
    : error.message || t('hosts.controls.failed');

/**
 * The hook behind every write of the machine's tools, the snapshots, the
 * clone, the template, the move and the import: `send({ id, name, call,
 * doneKey, values, notes, failKey, inline, watch })` sends the one
 * request `call` makes and raises one notice, the success card of
 * `doneKey` named by the machine, as `name` and as `machineName`, the
 * sentences of `notes` after it, a warning card where the answer carries
 * `resource_warnings`, their sentences after it, or the danger card
 * carrying the agent's message, inside the sentence of `failKey` where
 * one is given. A caller that draws what an agent short of resources
 * refused in its own dialog passes `inline`, and that refusal, the one
 * that carries `details`, raises no card, so it is said once. After a
 * success `reread` reads the host's stats again once, and its machine
 * rows, the machine's detail and its snapshots while they are held. A
 * queued answer names a task: with `watch` the task dialog opens on it
 * at once, the way hyperweaver-ui followed a snapshot's task, and
 * otherwise the notice carries View task, which opens it; both only
 * while the host's own row lists `tasks`. `task` is what the task dialog
 * is open on, the host, the machine and the task's row, and `closeTask`
 * closes it and reads the held copies of that machine again, the task
 * having changed it. `send` answers `{ answer, error }`, one of them
 * null, so a dialog closes on a success and draws what a refusal
 * carries. Nothing polls after a write.
 *
 * @returns {{ send: Function, busy: boolean, task: Object|null, closeTask: Function, reread: Function }} The sender and its state
 */
export const useMachineTools = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { held } = useServers();
  const refreshStats = useHostStatsRefresh();
  const refreshMachines = useHostMachinesRefresh();
  const refreshDetail = useMachineDetailRefresh();
  const refreshSnapshots = useMachineSnapshotsRefresh();
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(null);

  const reread = useCallback(
    (id, name) => {
      refreshStats(id);
      refreshMachines(id);
      if (name) {
        refreshDetail(id, name);
        refreshSnapshots(id, name);
      }
    },
    [refreshStats, refreshMachines, refreshDetail, refreshSnapshots]
  );

  const succeeded = useCallback(
    ({ id, name, answer, doneKey, values, notes, watch }) => {
      const warnings = resourceWarningsOf(answer);
      const watched = watchedOf({ held, id, name, answer });
      const action =
        watched && !watch
          ? { label: t('hosts.tools.viewTask'), onClick: () => setTask(watched) }
          : null;
      notify(
        warnings.length > 0 ? 'warning' : 'success',
        [
          t(doneKey, { name, machineName: name, ...values }),
          ...notes.map(key => t(key)),
          ...warnings.map(warning => warning.message),
        ].join(' '),
        { action }
      );
      reread(id, name);
      if (watched && watch) {
        setTask(watched);
      }
    },
    [held, notify, reread, t]
  );

  const send = useCallback(
    async ({
      id,
      name,
      call,
      doneKey,
      values = {},
      notes = NO_NOTES,
      failKey = '',
      inline = false,
      watch = false,
    }) => {
      setBusy(true);
      try {
        const answer = await call();
        succeeded({ id, name, answer, doneKey, values, notes, watch });
        return { answer, error: null };
      } catch (error) {
        if (!(inline && resourceIssuesOf(error).length > 0)) {
          notify('danger', refusalOf({ error, failKey, values, t }));
        }
        return { answer: null, error };
      } finally {
        setBusy(false);
      }
    },
    [succeeded, notify, t]
  );

  const closeTask = useCallback(() => {
    if (task) {
      reread(task.id, task.name);
    }
    setTask(null);
  }, [task, reread]);

  return { send, busy, task, closeTask, reread };
};
