import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const machinePath = (status, id, name, verb = '') =>
  agentPath(status, id, `machines/${encodeURIComponent(name)}${verb}`);

/**
 * Start one machine, `POST machines/{name}/start` at the path the role
 * fixes.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const startMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/start'));

/**
 * Stop one machine, `POST machines/{name}/stop`, `force=true` in the query
 * when the caller asks for a kill rather than a shutdown.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {boolean} [force] - Whether to kill the machine instead of shutting it down
 * @returns {Promise<Object>} The agent's answer
 */
export const stopMachine = (status, id, name, force = false) =>
  client.post(
    machinePath(status, id, name, '/stop'),
    undefined,
    force ? { params: { force: true } } : {}
  );

/**
 * Restart one machine, `POST machines/{name}/restart`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const restartMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/restart'));

/**
 * Reset one machine, the hard reboot of `POST machines/{name}/reset`, which
 * the agent refuses unless the machine is running.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const resetMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/reset'));

/**
 * Delete one machine, `DELETE machines/{name}`, `force` stopping a running
 * machine first and `cleanup_disks` sent on every call because the two
 * agents' defaults disagree; only the media the agent created go with it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} [options] - `force` and `cleanupDisks`
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteMachine = (status, id, name, { force = false, cleanupDisks = true } = {}) =>
  client.delete(machinePath(status, id, name), { params: { force, cleanup_disks: cleanupDisks } });
