import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * The values an untouched create field runs with, `GET machines/defaults`:
 * `settings`, `zones`, `disks`, `config`, `knob_values`, the vocabulary of
 * every knob, `knob_defaults`, what an unset knob runs with, and `notes`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The defaults document
 */
export const fetchMachineDefaults = (status, id) =>
  client.get(agentPath(status, id, 'machines/defaults'));

/**
 * The guest OS types the host's hypervisor knows, `GET machines/ostypes`,
 * `{ ostypes: [{ id, description, family, family_description, architecture }], total }`,
 * `id` what `settings.os_type` takes; a host without VirtualBox answers 503.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The OS types
 */
export const fetchMachineOsTypes = (status, id) =>
  client.get(agentPath(status, id, 'machines/ostypes'));

/**
 * What VirtualBox reads of an installer ISO on the host,
 * `GET machines/unattended/detect?iso=`: `os_typeid`, `version`,
 * `os_languages` and whether an unattended install is `supported`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} iso - The ISO's path on the host
 * @returns {Promise<Object>} The detection
 */
export const detectUnattendedIso = (status, id, iso) =>
  client.get(agentPath(status, id, 'machines/unattended/detect'), { params: { iso } });

/**
 * Start an unattended OS install on a machine that is off,
 * `POST machines/{name}/unattended`, a queued task: the body names the
 * ISO, a cached one as `iso` or a path on the host as `path`, the guest
 * `user` and `password`, and where given the `hostname`, `locale`,
 * `time_zone`, `image_index` and `product_key`, `install_additions` and
 * `start`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {Object} body - The install
 * @returns {Promise<Object>} The queued task
 */
export const startUnattendedInstall = (status, id, name, body) =>
  client.post(agentPath(status, id, `machines/${encodeURIComponent(name)}/unattended`), body);
