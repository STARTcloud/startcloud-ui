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
 * Suspend one machine, `POST machines/{name}/suspend`, offered while the
 * host lists `machine-suspend`; the agent refuses unless the machine is
 * running.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const suspendMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/suspend'));

/**
 * Pause one machine, frozen in memory, `POST machines/{name}/pause`; the
 * agent refuses unless the machine is running.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const pauseMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/pause'));

/**
 * Resume one paused or suspended machine, `POST machines/{name}/resume`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const resumeMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/resume'));

/**
 * Inject a non-maskable interrupt into one running machine,
 * `POST machines/{name}/nmi`, the diagnostic that forces a guest crash
 * dump or breaks into its kernel debugger.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} The agent's answer
 */
export const injectNmi = (status, id, name) => client.post(machinePath(status, id, name, '/nmi'));

/**
 * Ask the guest of one machine to shut itself down or restart through
 * the guest agent, `POST machines/{name}/guest/shutdown` with the `mode`,
 * `powerdown` or `reboot`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} mode - `powerdown` or `reboot`
 * @returns {Promise<Object>} The agent's answer
 */
export const shutdownGuest = (status, id, name, mode) =>
  client.post(machinePath(status, id, name, '/guest/shutdown'), { mode });

/**
 * Move an installed zone to the ready state, `POST machines/{name}/ready`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @returns {Promise<Object>} The agent's answer
 */
export const readyMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/ready'));

/**
 * Verify a zone's configuration, `POST machines/{name}/verify`, answered
 * 200 either way, `valid` the verdict and `output` the tool's own text.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @returns {Promise<Object>} `{ success, machine_name, valid, output }`
 */
export const verifyMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/verify'));

/**
 * Mark a zone incomplete, `POST machines/{name}/mark-incomplete`, which
 * the agent refuses on a running zone.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @returns {Promise<Object>} The agent's answer
 */
export const markIncompleteMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/mark-incomplete'));

/**
 * Detach a zone, `POST machines/{name}/detach`, a queued task on an
 * installed zone alone.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @returns {Promise<Object>} The queued task
 */
export const detachMachine = (status, id, name) =>
  client.post(machinePath(status, id, name, '/detach'));

/**
 * Attach a zone, `POST machines/{name}/attach`, a queued task on a
 * configured or detached zone, `update` bringing its packages to the
 * host's and `force` skipping the validation.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The zone name
 * @param {Object} [options] - `update` and `force`
 * @returns {Promise<Object>} The queued task
 */
export const attachMachine = (status, id, name, { update = false, force = false } = {}) =>
  client.post(machinePath(status, id, name, '/attach'), { update, force });

/**
 * Move a machine that is off to a new path on its host,
 * `POST machines/{name}/move` with `target_path`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} targetPath - The destination directory on the host
 * @returns {Promise<Object>} The queued task
 */
export const moveMachine = (status, id, name, targetPath) =>
  client.post(machinePath(status, id, name, '/move'), { target_path: targetPath });

/**
 * The external applications a host is configured to open a machine in,
 * `GET applications`, asked for only of a host that lists
 * `host-launchers`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The rows, `[{ name, path, args, exists }]`
 */
export const fetchApplications = (status, id) =>
  client.get(agentPath(status, id, 'applications')).then(data => data.applications || []);

/**
 * Open one machine in a configured application on its host,
 * `POST machines/{name}/applications/{application}/launch`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} application - The configured application's name
 * @returns {Promise<Object>} The agent's answer
 */
export const launchApplication = (status, id, name, application) =>
  client.post(
    machinePath(status, id, name, `/applications/${encodeURIComponent(application)}/launch`)
  );

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

/**
 * One machine's detail, `GET machines/{name}`: the machine's own row as
 * `machine_info`, its live `configuration`, `system_status`, the tasks
 * that wait or run for it and `knob_current`, the values its settings
 * hold now.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} `{ machine_info, configuration, system_status, pending_tasks, knob_current, pending_changes }`
 */
export const fetchMachine = (status, id, name) => client.get(machinePath(status, id, name));

/**
 * What the guest additions report of one VirtualBox machine,
 * `GET machines/{name}/guest-properties`, asked for only of a host that
 * names `virtualbox` and never of a UTM machine.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Array<Object>>} The rows, `[{ name, value, timestamp, flags }]`
 */
export const fetchGuestProperties = (status, id, name) =>
  client
    .get(machinePath(status, id, name, '/guest-properties'))
    .then(data => (Array.isArray(data.properties) ? data.properties : []));

/**
 * The guest's own word for its operating system through the guest agent,
 * `GET machines/{name}/guest/osinfo`, asked for only of a host that lists
 * `guest-agent`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object|null>} The `osinfo`, `{ name, pretty-name, kernel-release, ... }`
 */
export const fetchGuestOsInfo = (status, id, name) =>
  client.get(machinePath(status, id, name, '/guest/osinfo')).then(data => data.osinfo || null);

/**
 * The guest's live network through the guest agent,
 * `GET machines/{name}/guest/network`: `interfaces`, each with its name,
 * `hardware-address` and `ip-addresses`, and for a UTM machine the flat
 * `ips` it answers in their place.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<{ interfaces: Array<Object>, ips: Array<string> }>} The network
 */
export const fetchGuestNetwork = (status, id, name) =>
  client.get(machinePath(status, id, name, '/guest/network')).then(data => ({
    interfaces: Array.isArray(data.interfaces) ? data.interfaces : [],
    ips: Array.isArray(data.ips) ? data.ips : [],
  }));

/**
 * Wire the guest agent's channel onto one machine,
 * `POST machines/{name}/guest-agent/setup`, which takes effect when the
 * machine next boots.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Object>} `{ success, machine_name, requires_restart, message }`
 */
export const setupGuestAgent = (status, id, name) =>
  client.post(machinePath(status, id, name, '/guest-agent/setup'));

/**
 * One frame of a running machine's screen as a PNG,
 * `GET machines/{name}/vnc/screenshot`, asked for only of a host that
 * lists `machine-screenshot`; the agent answers 502 for a machine that
 * does not run.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {Promise<Blob>} The image
 */
export const fetchScreenshot = (status, id, name) =>
  client.get(machinePath(status, id, name, '/vnc/screenshot'), { responseType: 'blob' });

/**
 * Write one machine's tags, `PUT machines/{name}/tags`, kept at once with
 * no task; null clears them.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Array<string>|null} tags - The tags, or null for none
 * @returns {Promise<Object>} `{ success, machine_name, tags }`
 */
export const saveMachineTags = (status, id, name, tags) =>
  client.put(machinePath(status, id, name, '/tags'), { tags });

/**
 * Write one machine's notes, `PUT machines/{name}/notes`, kept at once
 * with no task; null clears them.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string|null} notes - The notes, or null for none
 * @returns {Promise<Object>} `{ success, machine_name, notes }`
 */
export const saveMachineNotes = (status, id, name, notes) =>
  client.put(machinePath(status, id, name, '/notes'), { notes });
