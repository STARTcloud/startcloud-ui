import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * Restart the host behind one agent, `POST system/host/restart` with the
 * grace period in seconds and the message the system logs carry, the
 * `confirm` guard the wire demands.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} options - `gracePeriod` and `message`
 * @returns {Promise<Object>} The queued task
 */
export const restartHost = (status, id, { gracePeriod, message }) =>
  client.post(agentPath(status, id, 'system/host/restart'), {
    grace_period: gracePeriod,
    message,
    confirm: true,
  });

/**
 * Shut the host down to single-user mode, `POST system/host/shutdown`,
 * the same body as the restart.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} options - `gracePeriod` and `message`
 * @returns {Promise<Object>} The queued task
 */
export const shutdownHost = (status, id, { gracePeriod, message }) =>
  client.post(agentPath(status, id, 'system/host/shutdown'), {
    grace_period: gracePeriod,
    message,
    confirm: true,
  });

/**
 * Power the host off completely, `POST system/host/poweroff`, a manual
 * restart the only way back.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} options - `gracePeriod` and `message`
 * @returns {Promise<Object>} The queued task
 */
export const poweroffHost = (status, id, { gracePeriod, message }) =>
  client.post(agentPath(status, id, 'system/host/poweroff'), {
    confirm: true,
    grace_period: gracePeriod,
    message,
  });

/**
 * Halt the host at once, `POST system/host/halt` with no grace period.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The queued task
 */
export const haltHost = (status, id) =>
  client.post(agentPath(status, id, 'system/host/halt'), { confirm: true, emergency: true });

/**
 * Fast-reboot the host, `POST system/host/reboot/fast`, skipping the
 * firmware on x86, into the named boot environment or the current one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} options - `bootEnvironment`, empty for the current one
 * @returns {Promise<Object>} The queued task
 */
export const fastRebootHost = (status, id, { bootEnvironment }) =>
  client.post(agentPath(status, id, 'system/host/reboot/fast'), {
    confirm: true,
    boot_environment: bootEnvironment,
  });
