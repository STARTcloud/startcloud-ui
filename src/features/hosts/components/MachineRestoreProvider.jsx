import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { startMachine } from '../api/machines';
import { getTask } from '../api/tasks';
import { useHostMachinesRefresh } from '../hooks/useHostMachines';
import { useHostStatsRefresh } from '../hooks/useHostStats';
import { useMachineDetailRefresh } from '../hooks/useMachineDetail';
import { MachineRestoreContext } from '../hooks/useMachineRestore';
import { useMachineSnapshotsRefresh } from '../hooks/useMachineSnapshots';
import { agentIdOf } from '../utils/hosts';
import { detailKey } from '../utils/machines';
import { hostStreamsTasks } from '../utils/machineTools';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const chainKey = (id, task) => `${id}|${task}`;

const ended = row => TERMINAL_TASK_STATUSES.includes(row?.status);

/**
 * The read of what is held of one machine and its host after the start
 * that followed a restore: the host's stats once, and its machine rows,
 * the machine's detail and its snapshots while they are held.
 *
 * @returns {Function} `reread(id, name)`
 */
const useReread = () => {
  const refreshStats = useHostStatsRefresh();
  const refreshMachines = useHostMachinesRefresh();
  const refreshDetail = useMachineDetailRefresh();
  const refreshSnapshots = useMachineSnapshotsRefresh();
  return useCallback(
    (id, name) => {
      refreshStats(id);
      refreshMachines(id);
      refreshDetail(id, name);
      refreshSnapshots(id, name);
    },
    [refreshStats, refreshMachines, refreshDetail, refreshSnapshots]
  );
};

/**
 * The start that follows a restore, behind `useRestoreStart`, held in
 * the hosts feature's provider so it is kept wherever in the app the
 * person goes after asking for it. `follow` remembers the task a restore
 * queued, by its host and its id. The `tasks` topic's `task-updated`
 * event that says the task completed sends the start of the machine, one
 * request and one notice, and the held copies of the machine are read
 * again; the one that says it failed or was cancelled raises the danger
 * card and starts nothing. The task is read once as it is remembered and
 * once more when the event stream opens fresh or answers `reset`,
 * because its end may have been sent before the answer of the restore
 * arrived or while the tab held no connection. Where the end cannot be
 * known, the answer naming no task or the host's agent streaming no
 * `tasks`, nothing is remembered: one notice says the machine is not
 * powered on for the person and offers Power on as its action. Nothing
 * reads on a clock, hyperweaver-ui's read of the task every two seconds
 * not carried over. What is remembered belongs to the session and is
 * dropped when `signedIn` changes.
 */
const MachineRestoreProvider = ({ signedIn, children }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const reread = useReread();
  const chains = useRef(null);

  useEffect(() => () => chains.current?.clear(), [signedIn]);

  const start = useCallback(
    async ({ id, name }) => {
      try {
        await startMachine(status, id, name);
        notify('success', t('hosts.controls.done.start', { name }));
        reread(id, name);
      } catch (error) {
        notify(
          'danger',
          t('machine.machineSnapshots.restoredStartFailed', { message: error.message })
        );
      }
    },
    [status, notify, reread, t]
  );

  const settle = useCallback(
    (entry, row) => {
      if (row.status === 'completed') {
        start(entry);
        return;
      }
      notify(
        'danger',
        t('machine.machineSnapshots.restoreFailedNotStarting', {
          errorMessage: row.error_message || row.status,
        })
      );
    },
    [start, notify, t]
  );

  const check = useCallback(
    key => {
      const entry = chains.current?.get(key);
      if (!entry) {
        return;
      }
      getTask(status, entry.id, entry.task)
        .then(row => {
          if (ended(row) && chains.current?.delete(key)) {
            settle(entry, row);
          }
        })
        .catch(error => {
          log.api.error('Error reading the task of a restore', {
            id: entry.id,
            task: entry.task,
            error: error.message,
          });
        });
    },
    [status, settle]
  );

  const recheck = () => [...(chains.current?.keys() || [])].forEach(check);

  useEventStream('task-updated', data => {
    const key = chainKey(agentIdOf(data), String(data?.id));
    const entry = chains.current?.get(key);
    if (entry && ended(data) && chains.current.delete(key)) {
      settle(entry, data);
    }
  });

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      recheck();
    }
  });

  useEventStream('reset', recheck);

  const follow = useCallback(
    ({ id, name, snapshot, server, answer }) => {
      const task = answer?.task_id ? String(answer.task_id) : '';
      if (task && hostStreamsTasks(status, server)) {
        chains.current ||= new Map();
        const key = chainKey(id, task);
        chains.current.set(key, { id, name, snapshot, task });
        check(key);
        return;
      }
      notify(
        'warning',
        task
          ? t('hosts.snapshots.restoreUnfollowed', { name, snapshot })
          : t('machine.machineSnapshots.restoreNoTaskId'),
        {
          key: `restore-start-${detailKey(id, name)}`,
          sticky: true,
          action: { label: t('hosts.controls.powerOn'), onClick: () => start({ id, name }) },
        }
      );
    },
    [status, check, notify, start, t]
  );

  const value = useMemo(() => ({ follow }), [follow]);

  return <MachineRestoreContext.Provider value={value}>{children}</MachineRestoreContext.Provider>;
};

MachineRestoreProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineRestoreProvider;
