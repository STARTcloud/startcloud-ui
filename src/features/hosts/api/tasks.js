import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const taskPath = (status, id, taskId, rest = '') =>
  agentPath(status, id, `tasks/${encodeURIComponent(taskId)}${rest}`);

/**
 * The tasks of one agent, `GET tasks` at the path the role fixes, the
 * priority floor sent as `min_priority`, the most rows as `limit` and,
 * for the subtasks of one task, its id as `parent_task_id`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `minPriority`, `limit` and `parentTaskId`
 * @returns {Promise<Array<Object>>} The `tasks` rows
 */
export const listTasks = (status, id, { minPriority, limit = 50, parentTaskId } = {}) =>
  client
    .get(agentPath(status, id, 'tasks'), {
      params: { min_priority: minPriority, limit, parent_task_id: parentTaskId },
    })
    .then(data => data.tasks || []);

/**
 * One task's row, `GET tasks/{taskId}`, its `output` member always null
 * on the wire.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} taskId - The task's id
 * @returns {Promise<Object>} The task row
 */
export const getTask = (status, id, taskId) => client.get(taskPath(status, id, taskId));

/**
 * One task's output, `GET tasks/{taskId}/output`: the live buffer while
 * the task runs and the stored output after.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} taskId - The task's id
 * @returns {Promise<Object>} `{ task_id, status, output: [{ stream, data, timestamp }] }`
 */
export const getTaskOutput = (status, id, taskId) =>
  client.get(taskPath(status, id, taskId, '/output'));

/**
 * Cancel one task, `DELETE tasks/{taskId}`, which the agent refuses for
 * a task that already ended.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} taskId - The task's id
 * @returns {Promise<Object>} The agent's answer
 */
export const cancelTask = (status, id, taskId) => client.delete(taskPath(status, id, taskId));
