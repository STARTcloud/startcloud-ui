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

/**
 * The host's USB devices as VirtualBox lists them, `GET system/usb`,
 * asked for only of a host that lists `devices` and names `virtualbox`,
 * answered `{ devices: [{ uuid, vendor_id, product_id, manufacturer,
 * product, serial_number, address, state }], total }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The devices
 */
export const fetchUsbDevices = (status, id) => client.get(agentPath(status, id, 'system/usb'));

/**
 * One directory of the host's file system, `GET filesystem` with `path`,
 * asked for only of a host that lists `file-browser`, answered
 * `{ items: [{ name, path, isDirectory }] }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The directory
 * @returns {Promise<Object>} The directory's entries
 */
export const fetchDirectory = (status, id, path) =>
  client.get(agentPath(status, id, 'filesystem'), {
    params: { path, show_hidden: false, sort_by: 'name', sort_order: 'asc' },
  });

/**
 * The host's runlevel, `GET system/host/runlevel`, the current one and
 * the ones the host offers.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} `{ current_runlevel, available_runlevels }`
 */
export const fetchRunlevel = (status, id) =>
  client.get(agentPath(status, id, 'system/host/runlevel'));

/**
 * Change the host's runlevel, `POST system/host/runlevel` with the
 * `confirm` guard and the runlevel, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} runlevel - The runlevel, `0` to `6`, `s` or `S`
 * @returns {Promise<Object>} The queued task
 */
export const changeRunlevel = (status, id, runlevel) =>
  client.post(agentPath(status, id, 'system/host/runlevel'), { confirm: true, runlevel });

/**
 * Take the host to single-user mode, `POST system/host/single-user`
 * with the `confirm` guard, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The queued task
 */
export const singleUserHost = (status, id) =>
  client.post(agentPath(status, id, 'system/host/single-user'), { confirm: true });

/**
 * Take the host to multi-user mode, `POST system/host/multi-user`,
 * `network_services` choosing runlevel 3 over 2, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {boolean} networkServices - Whether the network services start
 * @returns {Promise<Object>} The queued task
 */
export const multiUserHost = (status, id, networkServices) =>
  client.post(agentPath(status, id, 'system/host/multi-user'), {
    network_services: Boolean(networkServices),
  });

/**
 * The orchestration status of a host, `GET machines/orchestration/status`,
 * `orchestration_enabled` and the `strategy`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The status
 */
export const fetchOrchestrationStatus = (status, id) =>
  client.get(agentPath(status, id, 'machines/orchestration/status'));

/**
 * Enable the orchestration, `POST machines/orchestration/enable` with
 * the `confirm` guard.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const enableOrchestration = (status, id) =>
  client.post(agentPath(status, id, 'machines/orchestration/enable'), { confirm: true });

/**
 * Disable the orchestration, `POST machines/orchestration/disable`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const disableOrchestration = (status, id) =>
  client.post(agentPath(status, id, 'machines/orchestration/disable'));

/**
 * The boot priorities of a host's machines, `GET machines/priorities`,
 * `{ machines: [{ name, priority, state, has_custom_priority }] }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The priorities
 */
export const fetchMachinePriorities = (status, id) =>
  client.get(agentPath(status, id, 'machines/priorities'));

/**
 * The orchestration's dry run, `POST machines/orchestration/test` with
 * the strategy, hyperweaver-ui's `parallel_by_priority`, answered
 * `{ total_machines, estimated_duration, execution_plan }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The plan
 */
export const testOrchestration = (status, id) =>
  client.post(agentPath(status, id, 'machines/orchestration/test'), {
    strategy: 'parallel_by_priority',
  });
