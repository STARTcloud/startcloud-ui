import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * The ZFS ARC configuration of a host, `GET system/zfs/arc/config`:
 * `current_config`, `system_constraints`, `config_source` and the
 * `available_tunables`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The configuration
 */
export const fetchArcConfig = (status, id) =>
  client.get(agentPath(status, id, 'system/zfs/arc/config'));

/**
 * Validate ARC sizes, `POST system/zfs/arc/validate` with `arc_max_gb`
 * and `arc_min_gb` where given, answered `{ valid, errors, warnings,
 * proposed_settings }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The sizes
 * @returns {Promise<Object>} The validation
 */
export const validateArcConfig = (status, id, body) =>
  client.post(agentPath(status, id, 'system/zfs/arc/validate'), body);

/**
 * Write the ZFS tunables, `PUT system/zfs/arc/config` with the body of
 * `arcApplyBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const applyArcConfig = (status, id, body) =>
  client.put(agentPath(status, id, 'system/zfs/arc/config'), body);

/**
 * Reset the ARC configuration to its defaults, `POST system/zfs/arc/reset`
 * with the apply method.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} applyMethod - `runtime`, `persistent` or `both`
 * @returns {Promise<Object>} The agent's answer
 */
export const resetArcConfig = (status, id, applyMethod) =>
  client.post(agentPath(status, id, 'system/zfs/arc/reset'), { apply_method: applyMethod });
