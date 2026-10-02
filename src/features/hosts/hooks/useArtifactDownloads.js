import { useCallback, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { transferOf, transferWithTask } from '../utils/artifacts';
import { agentIdOf, withoutAgentId } from '../utils/hosts';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

/**
 * The transfers the artifacts section follows, hyperweaver-ui's active
 * downloads and uploads without its two-second poll: `start(taskId,
 * info)` holds a row for a task an upload, a download or a scan queued,
 * and the `tasks` topic's `task-updated` moves its status, its progress
 * and its error; a task that completes is dropped and `onRefresh`
 * reads the artifacts again, a task that fails stays until Cancel
 * drops it, and `stop(taskId)` drops one by hand. On a host whose tasks
 * do not reach the stream the row stays queued until dropped, the
 * notice's View task standing in.
 *
 * @param {Object} options - The host and what runs at a transfer's end
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Function} options.onRefresh - Called when a transfer completes
 * @returns {{ transfers: Array<Object>, start: Function, stop: Function }} The transfers
 */
export const useArtifactDownloads = ({ id, onRefresh }) => {
  const [held, setHeld] = useState(new Map());

  const stop = useCallback(taskId => {
    setHeld(current => {
      const next = new Map(current);
      next.delete(taskId);
      return next;
    });
  }, []);

  const start = useCallback((taskId, info) => {
    setHeld(current => new Map(current).set(taskId, transferOf({ ...info, taskId })));
  }, []);

  useEventStream('task-updated', data => {
    if (agentIdOf(data) !== String(id)) {
      return;
    }
    const row = withoutAgentId(data);
    const key = String(row.id);
    if (!held.has(key)) {
      return;
    }
    if (row.status === 'completed') {
      stop(key);
      onRefresh();
      return;
    }
    setHeld(current => {
      const transfer = current.get(key);
      return transfer ? new Map(current).set(key, transferWithTask(transfer, row)) : current;
    });
    if (TERMINAL_TASK_STATUSES.includes(row.status) && row.status !== 'failed') {
      stop(key);
    }
  });

  return { transfers: [...held.values()], start, stop };
};
